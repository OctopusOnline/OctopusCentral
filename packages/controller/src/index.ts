import { instancesTableName, DockerInstanceProps, Setting } from '@octopuscentral/types';
import { Instance as VirtualInstance, Setting as VirtualSetting } from '@octopuscentral/instance';
import EventEmitter from 'node:events';
import { Database } from './Database';
import { Socket } from './Socket';
import { Docker } from './Docker';
import { Instance } from './Instance';

export { Docker, Socket, Instance };

export class Controller extends EventEmitter {
  readonly serviceName: string;
  instancesFetchInterval: number = 5000;

  readonly database: Database;
  readonly docker: Docker;
  readonly socket: Socket;

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
    const virtualInstance = new VirtualInstance(this.database.connection);
    await virtualInstance.init();
    await this.fetchSyncInstances();
    return this.getInstance(virtualInstance.id)!;
  }

  async updateInstanceSettings(instance: Instance, settings: Setting[]): Promise<void> {
    if (settings.length === 0) return;

    const virtualInstance = new VirtualInstance(this.database.connection, instance.id);
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

  async init(): Promise<void> {
    await this.database.init();
    await this.docker.init();
  }

  async start(): Promise<void> {
    this.#running = true;

    await this.init();
    await this.socket.start();

    await this.runInterval();
  }

  private async runInterval(): Promise<void> {
    await this.fetchSyncInstances();
    await this.connectInstances();

    setTimeout(() => {
      if (this.#running) this.runInterval().then();
    }, this.instancesFetchInterval);
  }
}