import { Connection } from 'mysql2';
import EventEmitter from 'node:events';
import { promisify } from 'node:util';
import { Controller } from './Controller';

export class Central extends EventEmitter {
  readonly table: string = 'Controllers';

  readonly _connection: Connection;

  controllersFetchInterval: number = 10000;

  #controllers: Controller[] = [];
  #running: boolean = false;

  get controllers(): Controller[] { return this.#controllers }
  get running(): boolean { return this.#running }

  constructor(connection: Connection) {
    super();
    this._connection = connection;
  }

  async init(): Promise<void> {
    await this._connection.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id         INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHost VARCHAR(255)     NULL
      )`);
  }

  async addController(controller: Controller, overwrite: boolean = false): Promise<void> {
    if (!this.getController(controller.id)) {
      await this.insertController(controller);
      this.#controllers.push(controller);
    }
    else if (overwrite) {
      await this.removeController(controller);
      await this.addController(controller);
    }
  }

  private async insertController(controller: Controller): Promise<void> {
    await this._connection.execute(`
        INSERT INTO ${this.table} (id, socketHost)
        VALUES (?, ?)`,
      [controller.id, controller.socketHost]);
  }

  getController(id: number): Controller | undefined {
    return this.#controllers.find(_controller => _controller.id === id);
  }

  async removeController(controller: Controller): Promise<void> {
    for (const _controller of this.#controllers)
      if (_controller.id === controller.id) {
        await this.deleteController(controller);
        this.#controllers.splice(this.#controllers.findIndex(({ id }) => id === _controller.id), 1);
        controller.disconnect();
        return;
      }
  }

  private async deleteController(controller: Controller): Promise<void> {
    await this._connection.execute(`DELETE FROM ${this.table} WHERE id = ?`, [controller.id])
  }

  async fetchSyncControllers(): Promise<Controller[]> {
    const controllers = await this.loadControllers();

    for (const controller of this.#controllers)
      if (!controllers.some(_controller => _controller.id === controller.id))
        await this.removeController(controller);

    for (const newController of controllers) {
      await this.addController(newController);
      const controller = this.getController(newController.id)!;
      controller.socketHost = newController.socketHost;
    }

    return this.#controllers;
  }

  private async loadControllers(): Promise<Controller[]> {
    return (await this._connection.query(`SELECT id, socketHost FROM ${this.table}`) as unknown as {id: number, socketHost: string|null}[])
      .map(({ id, socketHost }) => new Controller(id, socketHost || undefined));
  }

  async connectControllers(): Promise<void> {
    for (const controller of this.#controllers)
      if (!controller.connected) await controller.connect();
  }

  async start(): Promise<void> {
    this.#running = true;
    this.runInterval().then();
  }

  private async runInterval(): Promise<void> {
    await this.fetchSyncControllers();
    await this.connectControllers();

    await promisify(setTimeout)(this.controllersFetchInterval);
    if (this.#running) this.runInterval().then();
  }
}