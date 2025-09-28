import {
  instancesTableName,
  DockerInstanceProps,
  DockerInstanceMode,
  Setting,
  InstanceStatus
} from '@octopuscentral/types';
import { Instance as VirtualInstance, Setting as VirtualSetting } from '@octopuscentral/instance';
import EventEmitter from 'node:events';
import { CLIServer } from './CLIServer';
import { Database } from './Database';
import { sleep, waitFor } from './helper';
import { Socket } from './Socket';
import { Docker } from './Docker';
import { Instance } from './Instance';
import { CLIClient } from './CLIClient';
import { readFileSync } from 'fs';
import { join } from 'path';

export { Docker, Socket, Instance, CLIClient };

interface InstanceWithHandlers extends Instance {
  _connectedHandler: (error?: Error) => void;
  _disconnectedHandler: () => void;
  _statusHandler: (status: InstanceStatus) => void;
  _restartMeHandler: (deadPromise?: Promise<void>) => void;
  _deadHandler: () => void;

  _autoRestartTimeout?: NodeJS.Timeout;
}

export class Controller extends EventEmitter {
  readonly serviceName: string;
  instancesFetchInterval: number = 5000;

  readonly database: Database;
  readonly docker: Docker;
  readonly socket: Socket;
  readonly cli: CLIServer;

  #instances: InstanceWithHandlers[] = [];
  #running: boolean = false;
  #runIntervalTimeout?: NodeJS.Timeout;

  get instances(): Instance[] { return this.#instances }
  get running(): boolean { return this.#running }

  get version(): string {
    return JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')).version;
  }

  constructor(serviceName: string, databaseUrl: string, instanceDockerProps: DockerInstanceProps) {
    super();
    this.serviceName = serviceName;
    this.database = new Database(databaseUrl);

    this.docker = new Docker(this, instanceDockerProps);
    this.socket = new Socket(this);
    this.cli = new CLIServer(this);
  }

  async addInstance(instance: Instance, overwrite: boolean = false): Promise<void> {
    if (!this.getInstance(instance.id))
      this.addAndSetupInstance(instance);
    else if (overwrite) {
      await this.removeInstance(instance);
      this.addAndSetupInstance(instance);
    }
  }

  private addAndSetupInstance(instance: Instance): void {
    const instanceWithHandlers = instance as InstanceWithHandlers;
    this.#instances.push(instanceWithHandlers);

    instanceWithHandlers._connectedHandler = (error?: Error) => {
      clearTimeout(instanceWithHandlers._autoRestartTimeout);
      this.emit('instance socket connected', instance, error);
    }

    instanceWithHandlers._disconnectedHandler = () => {
      this.emit('instance socket disconnected', instance);
    }

    instanceWithHandlers._statusHandler = (status: InstanceStatus) => {
      this.emit('instance status', instance, status);
      this.socket.sendStatus(instance.id, status);
    }

    instanceWithHandlers._restartMeHandler = async (deadPromise?: Promise<void>) => {
      this.emit('instance restartMe', instance);
      const virtualDeadInstance = new Instance(instance.id);
      await deadPromise;
      await sleep(1e4);
      await this.stopInstance(virtualDeadInstance);
      await sleep(1e4);
      await this.startInstance(virtualDeadInstance, undefined, 12e4);
    }

    instanceWithHandlers._deadHandler = () => {
      this.emit('instance dead', instance);
      if (instance.autoRestart && !instance.restartMe) {
        instanceWithHandlers._autoRestartTimeout = setTimeout(async () => {
          this.emit('instance autoRestart', instance);
          const virtualDeadInstance = new Instance(instance.id);
          await this.stopInstance(virtualDeadInstance);
          await sleep(1e4);
          await this.startInstance(virtualDeadInstance, undefined, 12e4);
        }, 6e4);
      }
    }

    instanceWithHandlers.on('socket connected',    instanceWithHandlers._connectedHandler);
    instanceWithHandlers.on('socket disconnected', instanceWithHandlers._disconnectedHandler);
    instanceWithHandlers.on('status received',     instanceWithHandlers._statusHandler);
    instanceWithHandlers.on('restartMe',           instanceWithHandlers._restartMeHandler);
    instanceWithHandlers.on('dead',                instanceWithHandlers._deadHandler);
  }

  private get lastInstanceId(): number {
    return Math.max(0, ...this.#instances.map(instance => instance.id));
  }

  async createInstance(): Promise<Instance> {
    this.emit('instance creating');

    await this.fetchSyncInstances();
    const virtualInstance = new VirtualInstance(this.database.url, this.lastInstanceId + 1);
    await virtualInstance._initVirtual(this.serviceName, 'init');

    await this.fetchSyncInstances();
    const instance = this.getInstance(virtualInstance.id)!;

    this.emit('instance created', instance);
    return instance;
  }

  async updateInstanceSettings(instance: Instance, settings: Setting[]): Promise<void> {
    if (settings.length === 0) return;

    const virtualInstance = new VirtualInstance(this.database.url, instance.id);
    for (const setting of settings) {
      const virtualSetting = new VirtualSetting(
        setting.name,
        setting.value,
        setting.type,
        setting.min,
        setting.max
      );
      await virtualInstance.settings.updateSetting(virtualSetting);
    }
  }

  getInstance(id: number): Instance | undefined {
    return this.#instances.find(_instance => _instance.id === id);
  }

  async removeInstance(instance: Instance): Promise<void> {
    const index = this.#instances.findIndex(_instance => _instance.id === instance.id);
    if (index !== -1) {
      const instanceWithHandlers = this.#instances[index];
      instanceWithHandlers.off('socket connected',    instanceWithHandlers._connectedHandler);
      instanceWithHandlers.off('socket disconnected', instanceWithHandlers._disconnectedHandler);
      instanceWithHandlers.off('status received',     instanceWithHandlers._statusHandler);
      instanceWithHandlers.off('restartMe',           instanceWithHandlers._restartMeHandler);
      instanceWithHandlers.off('dead',                instanceWithHandlers._deadHandler);
      await instanceWithHandlers.disconnect();
      this.#instances.splice(index, 1);
    }
  }

  private async loadInstances(): Promise<Instance[]> {
    return (await this.database.connection.query(`SELECT id, socketHostname FROM ${instancesTableName}`) as unknown as {id: number, socketHostname: string}[])
      .map(({ id, socketHostname }) => new Instance(id, socketHostname));
  }

  async fetchSyncInstances(): Promise<Instance[]> {
    const instances = await this.loadInstances();

    for (const instance of this.#instances)
      if (!instances.some(_instance => _instance.id === instance.id))
        await this.removeInstance(instance);

    for (const newInstance of instances) {
      await this.addInstance(newInstance);
      const instance = this.getInstance(newInstance.id)!;
      instance.socketHostname = newInstance.socketHostname;
    }

    return this.#instances;
  }

  async updateInstanceSocketHostname(instance: Instance, socketHostname: string, autoReconnect: boolean = false): Promise<void> {
    await this.database.connection.execute(
      `UPDATE ${instancesTableName} SET socketHostname = ? WHERE id = ?`,
      [socketHostname, instance.id]);
    instance.socketHostname = socketHostname;

    if (autoReconnect && instance.connected)
      await instance.connect(true);
  }

  async connectInstances(): Promise<void> {
    for (const instance of this.#instances)
      if (!instance.connected) await instance.connect();
  }

  async startInstance(instance: Instance, mode?: DockerInstanceMode, timeout: number = 6e4): Promise<boolean> {
    this.emit('instance starting', instance);

    let bootResult: boolean | undefined,
      dockerResult: boolean | undefined,
         timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    }
    const timeoutController = new AbortController();
    resetTimeout();

    const bootStatusListener = (_: string, reset: boolean) => reset && resetTimeout();
    instance.on('boot status',        bootStatusListener);
    instance.on('boot status booted', bootStatusListener);

    try {
      await Promise.all([
        Promise.race([
          new Promise(async resolve => {
            instance.once('boot status booted', success => {
              clearTimeout(timeoutId!);
              resolve(bootResult = success);
            });
            if (!await instance.sendStartPermission(timeout))
              if (bootResult === undefined) resolve(bootResult = false);
          }),

          (async() => {
            await new Promise(resolve => timeoutController.signal.addEventListener('abort', resolve));
            if (!await waitFor(async() =>
                bootResult   !== undefined ||
                dockerResult !== undefined ||
                await this.docker.instanceRunning(instance),
              timeout / 500, 500)
            )
              dockerResult = false;
          })()
        ]),

        (async() => {
          dockerResult = await this.docker.startInstance(instance, mode);
          await instance.connect();
        })()
      ]);
    } finally {
      instance.off('boot status',        bootStatusListener);
      instance.off('boot status booted', bootStatusListener);
      clearTimeout(timeoutId!);
    }

    const success: boolean = !!bootResult;
    this.emit('instance started', instance, success);
    return success;
  }

  async stopInstance(instance: Instance, preventAutoRestart: boolean = true): Promise<boolean> {
    this.emit('instance stopping', instance);

    const autoRestart: boolean = instance.autoRestart;
    if (preventAutoRestart)
      instance.autoRestart = false;

    const result: boolean = await this.docker.stopInstance(instance);

    if (preventAutoRestart)
      instance.autoRestart = autoRestart;

    this.emit('instance stopped', instance, result);
    return result;
  }

  async init(): Promise<void> {
    await this.database.connect();
    await (new VirtualInstance(this.database.url, null)).initDatabase();
    await this.docker.init();
  }

  async start(): Promise<void> {
    this.#running = true;

    await this.init();
    await Promise.all([
      this.socket.start(),
      this.cli.start()
    ]);

    await this.runInterval();
  }

  private async runInterval(): Promise<void> {
    await this.fetchSyncInstances();
    await this.connectInstances();

    this.#runIntervalTimeout = setTimeout(() => {
      if (this.#running) this.runInterval().then();
    }, this.instancesFetchInterval);
  }

  async destroy(): Promise<void> {
    this.#running = false;
    clearTimeout(this.#runIntervalTimeout);

    await Promise.allSettled(this.#instances.map(
      instance => {
        clearTimeout(instance._autoRestartTimeout);
        return this.removeInstance(instance);
      }))

    await Promise.all([
      this.cli.stop(),
      this.socket.stop(),
      this.database.disconnect()
    ]);
  }
}