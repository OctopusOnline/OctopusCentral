import { DockerInstanceMode, InstancePortBinding } from '@octopuscentral/types';
import { Database } from './Database';
import { Setting } from './Setting';
import { Settings } from './Settings';
import { Socket, InstanceStatusParam } from './Socket';
export { Settings, Setting, Socket };
export declare class Instance {
    #private;
    readonly socket: Socket;
    readonly settings: Settings;
    get id(): number;
    get serviceName(): string;
    get mode(): DockerInstanceMode;
    get database(): Database;
    get portBindings(): InstancePortBinding[];
    private parsePortBindingString;
    _initVirtual(serviceName: string, mode: DockerInstanceMode, portBindings?: InstancePortBinding[]): Promise<void>;
    constructor(databaseUrl?: string, id?: number | null);
    init(): Promise<void>;
    initDatabase(): Promise<void>;
    start(awaitStartPermission?: boolean): Promise<boolean>;
    sendBootStatus(messageOrBooted: string | boolean, resetTimeout?: boolean): void;
    sendStatus(status: InstanceStatusParam): void;
    setSocketHostname(hostname: string): Promise<void>;
}
