import { DockerInstanceProps } from '@octopuscentral/types';
import EventEmitter from 'node:events';
import { Socket } from './Socket';
import { Docker } from './Docker';
import { Connection } from 'mysql2';
import { Instance } from './Instance';

export class Controller extends EventEmitter {
  readonly table: string = 'Instances';

  readonly serviceName: string;
  instancesFetchInterval: number = 5000;

  readonly database: Connection;
  readonly docker: Docker;
  readonly socket: Socket;

  #instances: Instance[] = [];
  #running: boolean = false;

  get instances(): Instance[] { return this.#instances }
  get running(): boolean { return this.#running }

  constructor(serviceName: string, database: Connection, instanceDockerProps: DockerInstanceProps) {
    super();
    this.serviceName = serviceName;
    this.database = database;

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
    return (await this.database.query(`SELECT id, socketHostname FROM ${this.table}`) as unknown as {id: number, socketHostname: string}[])
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
    await this.database.execute(
      `UPDATE ${this.table} SET socketHostname = ? WHERE id = ?`,
      [socketHostname, instance.id]);
    instance.socketHostname = socketHostname;

    if (autoReconnect && instance.connected)
      await instance.connect(true);
  }

  async connectInstances(): Promise<void> {
    for (const instance of this.#instances)
      if (!instance.connected) await instance.connect();
  }

  async start(): Promise<void> {
    this.#running = true;

    await this.docker.init();
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