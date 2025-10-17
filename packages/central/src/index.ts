import { controllersTableName, CentralInstanceFilter } from '@octopuscentral/types';
import { InstanceSettings } from './InstanceSettings';
import { Database } from "./Database";
import EventEmitter from 'node:events';
import { promisify } from 'node:util';
import { Controller } from './Controller';
import { Instance } from './Instance';
import { readFileSync } from 'fs';
import { join } from 'path';

export { Database, Controller, Instance, InstanceSettings };

export class Central extends EventEmitter {
  controllersFetchInterval: number = 10000;

  readonly database: Database;
  readonly controllers: Controller[] = [];
  #running: boolean = false;

  get version(): string {
    return JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')).version;
  }

  get running(): boolean { return this.#running }

  constructor(databaseUrl: string) {
    super();
    this.database = new Database(databaseUrl);
  }

  async init(): Promise<void> {
    await this.database.connect();
    await this.database.pool.query(`
      CREATE TABLE IF NOT EXISTS ${controllersTableName} (
        id         INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHost VARCHAR(255)     NULL
      )`);
  }

  async addController(controller: Controller | number | undefined, socketHost?: string): Promise<Controller | undefined> {
    if (!(controller instanceof Controller)) {
      if (controller === undefined)
        return await this.addController(await this.insertNewController(socketHost));
      else controller = new Controller(controller, socketHost);
    }

    if (!this.getController(controller.id)) {
      await this.insertController(controller);
      this.controllers.push(controller);
      return controller;
    }
  }

  private async insertNewController(socketHost?: string): Promise<Controller> {
    return new Controller(
      Number((await this.database.pool.query(`
          INSERT INTO ${controllersTableName} (socketHost)
          VALUES (?)`,
        [socketHost]) as unknown as {insertId:any}).insertId),
      socketHost);
  }

  private async insertController(controller: Controller): Promise<void> {
    if (!await this.loadController(controller.id))
      await this.database.pool.execute(`
          INSERT INTO ${controllersTableName} (id, socketHost)
          VALUES (?, ?)`,
        [controller.id, controller.socketHost]);
  }

  getController(id: number): Controller | undefined {
    return this.controllers.find(_controller => _controller.id === id);
  }

  async removeController(controller: Controller): Promise<void> {
    for (const _controller of this.controllers)
      if (_controller.id === controller.id) {
        await this.deleteController(controller);
        this.controllers.splice(this.controllers.findIndex(({ id }) => id === _controller.id), 1);
        controller.disconnect();
        return;
      }
  }

  private async deleteController(controller: Controller): Promise<void> {
    await this.database.pool.execute(`DELETE FROM ${controllersTableName} WHERE id = ?`, [controller.id])
  }

  async fetchSyncControllers(): Promise<Controller[]> {
    const controllers = await this.loadControllers();

    for (const controller of this.controllers)
      if (!controllers.some(_controller => _controller.id === controller.id))
        await this.removeController(controller);

    for (const newController of controllers) {
      await this.addController(newController);
      const controller = this.getController(newController.id)!;
      controller.socketHost = newController.socketHost;
    }

    return this.controllers;
  }

  private async loadController(id: number): Promise<Controller | undefined> {
    return (await this.database.pool.query(`SELECT id, socketHost FROM ${controllersTableName} WHERE id = ?`, [id]) as unknown as {id: number, socketHost: string|null}[])
      .map(({ id, socketHost }) => new Controller(id, socketHost || undefined))[0];
  }

  private async loadControllers(): Promise<Controller[]> {
    return (await this.database.pool.query(`SELECT id, socketHost FROM ${controllersTableName}`) as unknown as {id: number, socketHost: string|null}[])
      .map(({ id, socketHost }) => new Controller(id, socketHost || undefined));
  }

  async connectControllers(): Promise<void> {
    for (const controller of this.controllers)
      if (!controller.connected) await controller.connect();
  }

  async start(): Promise<void> {
    await this.init();

    this.#running = true;
    this.runInterval().then();
  }

  async stop(): Promise<void> {
    this.#running = false;
    for (const controller of this.controllers)
      controller.disconnect();
  }

  private async runInterval(): Promise<void> {
    await this.fetchSyncControllers();
    await this.connectControllers();

    await promisify(setTimeout)(this.controllersFetchInterval);
    if (this.#running) this.runInterval().then();
  }

  async getInstances(filter: CentralInstanceFilter = []): Promise<Instance[]> {
    let instances: Instance[] = [];
    for (const controller of this.controllers) {
      const serviceName: string | undefined = filter.some(_filter => _filter.serviceName)
        ? await controller.getServiceName() : undefined;
      if (!serviceName || filter.some(_filter => _filter.serviceName === serviceName))
        instances = instances.concat(await controller.getInstances() || []);
    }
    return instances;
  }
}