import {
  instanceDatabaseEnvVarName,
  instanceIdEnvVarName,
  instanceServiceNameEnvVarName,
  instancesTableName,
  instanceModeEnvVarName,
  instancePortBindingsEnvVarName,
  instanceAutoRestartEnvVarName,
  DockerInstanceMode,
  InstancePortBinding
} from '@octopuscentral/types';
import process from 'node:process';
import { Database } from './Database';
import { Setting } from './Setting';
import { Settings } from './Settings';
import { Socket, InstanceStatusParam } from './Socket';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export { Settings, Setting, Socket };

export class Instance {
  #id?: number | null;
  #serviceName?: string;
  #mode?: DockerInstanceMode;
  #database?: Database;

  #portBindings?: InstancePortBinding[];

  readonly socket: Socket;
  readonly settings: Settings;

  get version(): string {
    return JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')).version;
  }

  get id(): number {
    if (this.#id === undefined) throw new Error('instance.id is not set\nmaybe run init() first?');
    return this.#id!;
  }

  get serviceName(): string {
    if (this.#serviceName === undefined) throw new Error('instance.serviceName is not set\nmaybe run init() first?');
    return this.#serviceName!;
  }

  get mode(): DockerInstanceMode {
    if (this.#mode === undefined) throw new Error('instance.mode is not set\nmaybe run init() first?');
    return this.#mode!;
  }

  get database(): Database {
    if (this.#database === undefined) throw new Error('instance.database is not set\nmaybe run init() first?');
    return this.#database!;
  }

  get portBindings(): InstancePortBinding[] {
    if (this.#portBindings === undefined) throw new Error('instance.portBindings is not set\nmaybe run init() first?');
    return this.#portBindings!;
  }

  get autoRestart(): boolean {
    return process.env[instanceAutoRestartEnvVarName] === 'true';
  }

  private parsePortBindingString(bindingString: string): InstancePortBinding {
    const binding = bindingString.split(',') as [string, string];
    const bindingSrc = binding[0].split('/') as [string, string];
    const bindingSrcHost = bindingSrc[0].split(':') as [string, string];
    const bindingSrcHostHasIP = !/^[0-9]+$/.test(bindingSrcHost[0]);
    return {
      host: {
        ip: bindingSrcHostHasIP ? bindingSrcHost[0] : '0.0.0.0',
        port: Number(binding[1]),
        protocol: bindingSrc[1] as 'tcp' | 'udp',
      },
      src: {
        port: Number(bindingSrcHost[bindingSrcHostHasIP ? 1 : 0]),
      },
    };
  }

  async _initVirtual(serviceName: string, mode: DockerInstanceMode, portBindings: InstancePortBinding[] = []): Promise<void> {
    this.#serviceName = serviceName;
    this.#mode = mode;
    this.#portBindings = portBindings;

    await this.init();
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
      const serviceName: string | undefined = process.env[instanceServiceNameEnvVarName];
      if (serviceName === undefined)
        throw new Error(`env var ${instanceServiceNameEnvVarName} is not set`);
      this.#serviceName = serviceName;
    }

    if (this.#mode === undefined) {
      this.#mode = (process.env[instanceModeEnvVarName] || 'production') as DockerInstanceMode;
    }

    if (this.#portBindings === undefined) {
      this.#portBindings = (process.env[instancePortBindingsEnvVarName] as string)
        ?.split(';').map(this.parsePortBindingString) ?? [];
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

  sendBootStatus(messageOrBooted: string | boolean, resetTimeout: boolean = true): void{
    this.socket.sendBootStatus(messageOrBooted, resetTimeout);
  }

  sendStatus(status: InstanceStatusParam): void {
    this.socket.sendStatus(status);
  }

  restartMe(timeout: number = 3e3): Promise<boolean> {
    console.log(`[Instance] restartMe called.`);
    return this.socket.sendRestartMe(timeout);
  }

  async updateAutoRestart(enabled: boolean, timeout: number = 1e4): Promise<boolean> {
    console.log(`[Instance] updateAutoRestart called with enabled: ${enabled}.`);
    const success = await this.socket.updateAutoRestart(enabled, timeout);
    if (success) {
      console.log(`[Instance] updateAutoRestart successful, updating environment variable.`);
      process.env[instanceAutoRestartEnvVarName] = String(enabled);
    } else {
      console.log(`[Instance] updateAutoRestart failed.`);
    }
    return success;
  }

  async setSocketHostname(hostname: string): Promise<void> {
    await this.database.connection.execute(`UPDATE ${instancesTableName} SET socketHostname = ? WHERE id = ?`, [hostname, this.#id]);
  }
}
