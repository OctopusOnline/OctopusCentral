import mariadb, { Pool } from 'mariadb';

export class Database {
  readonly #url: string;
  #pool?: Pool;

  get url(): string {
    return this.#url;
  }

  /** @deprecated */
  get connection(): Pool {
    return this.pool;
  }

  get pool(): Pool {
    if (this.#pool === undefined) throw new Error('database is not connected  ( maybe run init() or start() first? )');
    return this.#pool;
  }

  constructor(url: string, pool?: Pool) {
    this.#url = url;
    this.#pool = pool;
  }

  async connect(): Promise<void> {
    if (!this.#pool) {
      this.#pool = mariadb.createPool(this.#url);
      await this.testConnection();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  private async testConnection(): Promise<void> {
    await this.pool.query('SELECT 1');
  }
}