import { instanceDatabaseEnvVarName, instanceIdEnvVarName, instanceServiceNameEnvVarName, instancesTableName, instanceModeEnvVarName, instancePortBindingsEnvVarName, DockerInstanceMode, InstancePortBinding } from '@octopuscentral/types';
import process from 'node:process';
import { Database } from './Database';
import { Setting } from './Setting';
import { Settings } from './Settings';
import { Socket } from './Socket';

export { Settings, Setting, Socket };

export class Instance {
  #id?: number | null;
  #serviceName?: string;
  #mode?: DockerInstanceMode;
  #database?: Database;

  #portBindings?: InstancePortBinding[];

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
      const mode: DockerInstanceMode | undefined = process.env[instanceModeEnvVarName] as DockerInstanceMode;
      if (mode === undefined)
        throw new Error(`env var ${instanceModeEnvVarName} is not set`);
      this.#mode = mode;
    }

    if (this.#portBindings === undefined) {
      const portBindings: InstancePortBinding[] | undefined = (process.env[instancePortBindingsEnvVarName] as string)
        ?.split(';').map(this.parsePortBindingString);
      if (portBindings === undefined)
        throw new Error(`env var ${instancePortBindingsEnvVarName} is not set`);
      this.#portBindings = portBindings;
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