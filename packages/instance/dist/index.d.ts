import { Connection } from 'mariadb';
import { Setting } from './Setting';
import { Socket } from './Socket';
import { Settings } from './Settings';
export { Settings, Setting, Socket };
export declare class Instance {
    #private;
    readonly socket: Socket;
    readonly settings: Settings;
    get id(): number;
    get database(): Connection;
    constructor(database?: Connection, id?: number);
    init(): Promise<void>;
    start(): Promise<void>;
    setSocketHostname(hostname: string): Promise<void>;
}
