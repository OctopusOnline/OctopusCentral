import { Connection } from 'mysql2';
import { Socket } from './Socket';
import { Instance } from './Instance';
export declare class Controller {
    #private;
    readonly table: string;
    readonly serviceName: string;
    instancesFetchInterval: number;
    readonly socket: Socket;
    readonly _connection: Connection;
    get instances(): Instance[];
    get running(): boolean;
    constructor(serviceName: string, connection: Connection);
    addInstance(instance: Instance, overwrite?: boolean): void;
    getInstance(id: number): Instance | undefined;
    removeInstance(instance: Instance): void;
    private loadInstances;
    fetchSyncInstances(): Promise<Instance[]>;
    connectInstances(): Promise<void>;
    start(): Promise<void>;
    private runInterval;
}
