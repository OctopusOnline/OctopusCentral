import { Connection } from 'mysql2';
import { Socket } from './Socket';
import { Instance } from './Instance';
import { promisify } from 'node:util';

export class Controller {
  readonly table: string = 'Instances';

  readonly serviceName: string;
  instancesFetchInterval: number = 5000;

  readonly socket: Socket;
  readonly _connection: Connection;

  #instances: Instance[] = [];
  #running: boolean = false;

  get instances(): Instance[] { return this.#instances }
  get running(): boolean { return this.#running }

  constructor(serviceName: string, connection: Connection) {
    this.serviceName = serviceName;
    this._connection = connection;

    this.socket = new Socket(this);
  }

  addInstance(instance: Instance, overwrite: boolean = false) {
    if (!this.getInstance(instance.id))
      this.#instances.push(instance);
    else if (overwrite) {
      this.removeInstance(instance);
      this.#instances.push(instance);
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
    return (await this._connection.query(`SELECT id, socketHostname FROM ${this.table}`) as unknown as {id: number, socketHostname: string}[])
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

  async connectInstances(): Promise<void> {
    for (const instance of this.#instances)
      if (!instance.connected) await instance.connect();
  }

  async start(): Promise<void> {
    this.#running = true;
    await this.socket.start();
    this.runInterval().then();
  }

  private async runInterval(): Promise<void> {
    await this.fetchSyncInstances();
    await this.connectInstances();

    await promisify(setTimeout)(this.instancesFetchInterval);
    if (this.#running) this.runInterval().then();
  }
}