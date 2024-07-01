import { Connection } from 'mysql2';
import EventEmitter from 'node:events';
import { Controller } from './Controller';
import { Instance } from './Instance';
import { CentralInstanceFilter } from '@octopuscentral/types';
export declare class Central extends EventEmitter {
    #private;
    readonly table: string;
    readonly _connection: Connection;
    controllersFetchInterval: number;
    get controllers(): Controller[];
    get running(): boolean;
    constructor(connection: Connection);
    init(): Promise<void>;
    addController(controller: Controller | number | undefined, socketHost?: string): Promise<Controller | undefined>;
    private insertNewController;
    private insertController;
    getController(id: number): Controller | undefined;
    removeController(controller: Controller): Promise<void>;
    private deleteController;
    fetchSyncControllers(): Promise<Controller[]>;
    private loadController;
    private loadControllers;
    connectControllers(): Promise<void>;
    start(): Promise<void>;
    private runInterval;
    getInstances(filter?: CentralInstanceFilter): Promise<Instance[]>;
}
