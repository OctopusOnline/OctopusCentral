import { instancesTableName, DockerInstanceProps, Setting } from '@octopuscentral/types';
import { Instance as VirtualInstance, Setting as VirtualSetting } from '@octopuscentral/instance';
import EventEmitter from 'node:events';
import { CLIServer } from './CLIServer';
import { Database } from './Database';
import { sleep, waitFor } from './helper';
import { Socket } from './Socket';
import { Docker } from './Docker';
import { Instance } from './Instance';
import { CLIClient } from './CLIClient';

export { Docker, Socket, Instance, CLIClient };

export class Controller extends EventEmitter {
  readonly serviceName: string;
  instancesFetchInterval: number = 5000;

  readonly database: Database;
  readonly docker: Docker;
  readonly socket: Socket;
  readonly cli: CLIServer;

  #instances: Instance[] = [];
  #running: boolean = false;

  get instances(): Instance[] { return this.#instances }
  get running(): boolean { return this.#running }

  constructor(serviceName: string, databaseUrl: string, instanceDockerProps: DockerInstanceProps) {
    super();
    this.serviceName = serviceName;
    this.database = new Database(databaseUrl);

    this.docker = new Docker(this, instanceDockerProps);
    this.socket = new Socket(this);
    this.cli = new CLIServer(this);
  }

  addInstance(instance: Instance, overwrite: boolean = false) {
    if (!this.getInstance(instance.id))
      this.addAndSetupInstance(instance);
    else if (overwrite) {
      this.removeInstance(instance);
      this.addAndSetupInstance(instance);
    }
  }

  private addAndSetupInstance(instance: Instance) {
    this.#instances.push(instance);

    instance.on('socket connected', (error?: Error) => this.emit('instance socket connected', instance, error));
    instance.on('socket disconnected', () => this.emit('instance socket disconnected', instance));
  }

  async createInstance(): Promise<Instance> {
    const virtualInstance = new VirtualInstance(this.database.url);
    await virtualInstance.init();
    await this.fetchSyncInstances();
    return this.getInstance(virtualInstance.id)!;
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

  removeInstance(instance: Instance): void {
    this.#instances = this.#instances.filter(_instance => {
      if (_instance.id === instance.id) {
        _instance.disconnect();
        return true;
      }
    });
  }

  private async loadInstances(): Promise<Instance[]> {
    return (await this.database.connection.query(`SELECT id, socketHostname FROM ${instancesTableName}`) as unknown as {id: number, socketHostname: string}[])
      .map(({ id, socketHostname }) => new Instance(id, socketHostname));
  }

  async fetchSyncInstances(): Promise<Instance[]> {
    const instances = await this.loadInstances();

    for (const instance of this.#instances)
      if (!instances.some(_instance => _instance.id === instance.id))
        this.removeInstance(instance);

    for (const newInstance of instances) {
      this.addInstance(newInstance);
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

  async startInstance(instance: Instance, timeout: number = 6e4): Promise<boolean> {
    let bootResult: boolean | undefined = undefined,
       startResult: boolean | undefined = undefined,
      dockerResult: boolean | undefined = undefined;

    await Promise.all([
      Promise.race([
        (async() => {

          console.log('sending start permission');

          await Promise.all([
            waitFor(() => {
              instance.socket?.emit('start permission');
              return startResult;
            }, timeout / 200),

            Promise.race([
              await waitFor(() => {
                if (instance.connected) {
                  console.log('awaiting start permission received');
                  instance.socket!.once('start permission received', () => {console.log('start permission received!!!');startResult = true;});
                  return true;
                }
              }, timeout / 200),

              sleep(timeout).then(() => {console.log('start permission timeout');startResult = false;}),
            ])
          ]);

          if (startResult) {
            console.log('instance connected! wait for "boot status booted"...');
            instance.socket!.once('boot status booted', success => {
              console.log('Controller', 'startInstance', '"boot status booted"');
              bootResult = success;
            });
          }
          else bootResult = false;
        })(),

        (async() => {
          await sleep(timeout);
          !await waitFor(async() => bootResult !== undefined || dockerResult === false || !await this.docker.instanceRunning(instance));
          console.log(`instance not running after ${timeout/1e3}s`);
        })()
      ]),

      (async() => {
        dockerResult = await this.docker.startInstance(instance);
        await instance.connect();
        console.log('instance connect done');
      })()
    ]);

    return bootResult!;
  }

  async stopInstance(instance: Instance): Promise<boolean> {
    return await this.docker.stopInstance(instance);
  }

  async init(): Promise<void> {
    await this.database.connect();
    //await (new VirtualInstance(this.database.url)).initDatabase();
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

    setTimeout(() => {
      if (this.#running) this.runInterval().then();
    }, this.instancesFetchInterval);
  }

  async destroy(): Promise<void> {
    await Promise.all([
      this.cli.stop(),
      this.socket.stop(),
      this.database.disconnect()
    ]);
    this.#running = false;
  }
}