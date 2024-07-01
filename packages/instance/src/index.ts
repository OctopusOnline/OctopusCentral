import { Connection } from 'mysql2';
import { Socket } from './Socket';
import { Settings } from './Settings';

export class Instance {
  readonly table: string = 'Instances';

  #id?: number;
  readonly _connection: Connection;

  readonly socket: Socket;
  readonly settings: Settings;

  get id(): number { return this.#id! }

  constructor(connection: Connection, id?: number) {
    if (!connection) throw new Error('no database connection given');
    this._connection = connection;
    this.#id = id;

    this.settings = new Settings(this);
    this.socket = new Socket(this);
  }

  async init(): Promise<void> {
    await this._connection.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id             INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHostname VARCHAR(255)     NULL
      )`);

    if (this.#id === undefined)
      this.#id = Number((await this._connection.query(`INSERT INTO ${this.table} (id) VALUES (NULL)`) as unknown as {insertId:any}).insertId);
    else await this._connection.execute(`INSERT IGNORE INTO ${this.table} (id) VALUES (?)`, [this.#id]);

    await this.settings.init();
  }

  async start(): Promise<void> {
    await this.socket.start();
  }

  async setSocketHostname(hostname: string): Promise<void> {
    await this._connection.execute(`UPDATE ${this.table} SET socketHostname = ? WHERE id = ?`, [hostname, this.#id]);
  }
}