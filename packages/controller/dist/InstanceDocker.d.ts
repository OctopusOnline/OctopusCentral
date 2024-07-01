import { Instance } from './Instance';
export declare class InstanceDocker {
    #private;
    private client?;
    clientOpts: any;
    get connected(): Promise<boolean>;
    constructor(instance: Instance, clientOpts?: any);
    connect(reconnect?: boolean): Promise<boolean>;
    disconnect(): boolean;
}
