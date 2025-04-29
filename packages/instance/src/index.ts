import { instanceDatabaseEnvVarName, instanceIdEnvVarName, instanceServiceNameEnvVarName, instancesTableName } from '@octopuscentral/types';
import process from 'node:process';
import { Database } from './Database';
import { Setting } from './Setting';
import { Settings } from './Settings';
import { Socket } from './Socket';

export { Settings, Setting, Socket };

export class Instance {
  #id?: number | null;
  #serviceName?: string;
  #database?: Database;

  readonly socket: Socket;
  readonly settings: Settings;

  get id(): number {
    if (this.#id === undefined) throw new Error('instance.id is not set\nmaybe run init() first?');
    return this.#id!;
  }

  get serviceName(): string {
    if (this.#serviceName === undefined) throw new Error('instance.serviceName is not set\nmaybe run init() first?');
    return this.#serviceName!;
  }

  get database(): Database {
    if (this.#database === undefined) throw new Error('instance.database is not set\nmaybe run init() first?');
    return this.#database!;
  }

  constructor(databaseUrl?: string, id?: number | null) {
    if (databaseUrl) this.#database = new Database(databaseUrl);
    this.#id = id;

    this.settings = new Settings(this);
    this.socket = new Socket(this);
  }

  async init(): Promise<void> {
    if (this.#id === undefined) {
      const id: string | undefined = process.env[instanceIdEnvVarName];
      if (id === undefined)
        throw new Error(`env var ${instanceIdEnvVarName} is not set`);
      this.#id = Number(id);
      if (isNaN(this.#id as number) || this.#id <= 0)
        throw new Error(`invalid ${instanceIdEnvVarName} value: '${id}'`);
    }

    if (this.#serviceName === undefined) {
      this.#serviceName = String(process.env[instanceServiceNameEnvVarName]).trim() || undefined;
      if (this.#serviceName === undefined)
        throw new Error(`env var ${instanceServiceNameEnvVarName} is not set`);
    }

    await this.initDatabase();

    if (this.#id !== null) {
      if (this.#id === undefined)
        this.#id = Number((await this.database.connection.query(`INSERT INTO ${instancesTableName} (id) VALUES (NULL)`) as unknown as {insertId:any}).insertId);
      else await this.database.connection.execute(`INSERT IGNORE INTO ${instancesTableName} (id) VALUES (?)`, [this.#id]);
    }

    await this.settings.init();
  }

  async initDatabase(): Promise<void> {
    if (this.#database === undefined) {
      const url: string | undefined = process.env[instanceDatabaseEnvVarName] as any;
      if (url === undefined)
        throw new Error(`env var ${instanceDatabaseEnvVarName} is not set`);
      this.#database = new Database(url);
    }

    try {
      await this.#database!.connect();
    } catch (error: any) {
      throw new Error(`could not connect to database at '${this.#database!.url}': ${error.message}`);
    }

    await this.database.connection.query(`
      CREATE TABLE IF NOT EXISTS ${instancesTableName} (
        id             INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHostname VARCHAR(255)     NULL
      )`);
    await this.settings.initDatabase();
  }

  async start(awaitStartPermission: boolean = true): Promise<boolean> {
    await this.socket.start();
    return !awaitStartPermission || await this.socket.awaitStartPermission();
  }

  sendBootStatus(messageOrBooted: string | boolean): void{
    this.socket.sendBootStatus(messageOrBooted);
  }

  async setSocketHostname(hostname: string): Promise<void> {
    await this.database.connection.execute(`UPDATE ${instancesTableName} SET socketHostname = ? WHERE id = ?`, [hostname, this.#id]);
  }
}