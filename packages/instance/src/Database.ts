import mariadb, { Connection } from 'mariadb';

export class Database {
  readonly #url: string;
  #connection?: Connection;

  get url(): string {
    return this.#url;
  }

  get connection(): Connection {
    if (this.#connection === undefined) throw new Error('database is not connected  ( maybe run init() first? )');
    return this.#connection!;
  }

  constructor(url: string, connection?: Connection) {
    this.#url = url;
    this.#connection = connection;
  }

  async init(): Promise<void> {
    if (!this.#connection) this.#connection = await mariadb.createConnection(this.#url);
  }
}