import { Database } from './Database';
import { Setting } from './Setting';
import { Socket } from './Socket';
import { Settings } from './Settings';
export { Settings, Setting, Socket };
export declare class Instance {
    #private;
    readonly socket: Socket;
    readonly settings: Settings;
    get id(): number;
    get database(): Database;
    constructor(databaseUrl?: string, id?: number);
    init(): Promise<void>;
    initDatabase(): Promise<void>;
    start(): Promise<boolean>;
    sendBootStatus(messageOrBooted: string | boolean): void;
    setSocketHostname(hostname: string): Promise<void>;
}
