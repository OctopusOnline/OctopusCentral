import { Connection } from 'mariadb';
export declare class Database {
    #private;
    get url(): string;
    get connection(): Connection;
    constructor(url: string, connection?: Connection);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
