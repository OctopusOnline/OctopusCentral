import { Connection } from 'mysql2';
import { Settings } from './Settings';

export class Instance {
  readonly table: string = 'Instances';

  #id?: number;
  readonly connection: Connection;

  readonly settings: Settings;

  get id(): number { return this.#id! }

  constructor(connection: Connection, id?: number) {
    if (!connection) throw new Error('no database connection given');
    this.connection = connection;
    this.#id = id;

    this.settings = new Settings(this);
  }

  async init(): Promise<void> {
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT
      )
    `);

    if (this.#id === undefined)
      this.#id = Number((await this.connection.query(`INSERT INTO ${this.table} (id) VALUES (NULL)`) as unknown as {insertId:any}).insertId);
    else await this.connection.execute(`INSERT IGNORE INTO ${this.table} (id) VALUES (?)`, [this.#id]);

    await this.settings.init();
  }
}