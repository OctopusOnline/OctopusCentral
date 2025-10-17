import { createPool, Pool, PoolConfig } from 'mariadb';

export class Database {
  readonly #url: string;
  #pool?: Pool;

  get url(): string {
    return this.#url;
  }

  get pool(): Pool {
    if (this.#pool === undefined) throw new Error('database is not connected  ( maybe run init() or start() first? )');
    return this.#pool;
  }

  constructor(url: string, pool?: Pool) {
    this.#url = url;
    this.#pool = pool;
  }

  private parseUrl(url: string): PoolConfig {
    const urlObject = new URL(url);
    return {
      host: urlObject.hostname,
      port: Number(urlObject.port),
      user: urlObject.username,
      password: urlObject.password,
      database: urlObject.pathname.substring(1)
    };
  }

  async connect(): Promise<void> {
    if (!this.#pool) {
      this.#pool = createPool(this.parseUrl(this.#url));
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