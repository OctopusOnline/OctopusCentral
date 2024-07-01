import { Connection } from 'mysql2';
import { Socket } from './Socket';
import { Settings } from './Settings';
export declare class Instance {
    #private;
    readonly table: string;
    readonly _connection: Connection;
    readonly socket: Socket;
    readonly settings: Settings;
    get id(): number;
    constructor(connection: Connection, id?: number);
    init(): Promise<void>;
    start(): Promise<void>;
    setSocketHostname(hostname: string): Promise<void>;
}
