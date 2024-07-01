import EventEmitter from 'node:events';
import { Socket as IOSocket } from 'socket.io-client';
import { Instance } from './Instance';
import { DockerClientProps, DockerInstanceProps, Setting } from '@octopuscentral/types';
export declare class Controller extends EventEmitter {
    #private;
    readonly id: number;
    socketHost?: string;
    get socket(): IOSocket | undefined;
    get connected(): boolean;
    constructor(id: number, socketHost?: string);
    connect(reconnect?: boolean): Promise<boolean>;
    disconnect(): void;
    _request(command: string, args?: any): Promise<{
        code: number;
        data: any;
    } | undefined>;
    private listenForResponse;
    _requestData(command: string, args?: any): Promise<any | undefined>;
    getServiceName(): Promise<string | undefined>;
    getInstances(): Promise<Instance[] | undefined>;
    fetchInstances(): Promise<true | undefined>;
    createInstance(): Promise<Instance>;
    updateInstanceSettings(instance: Instance, settings: Setting[]): Promise<boolean>;
    dockerGetClientProps(): Promise<DockerClientProps>;
    dockerGetInstanceProps(): Promise<DockerInstanceProps>;
    dockerStartInstance(instance: Instance): Promise<boolean>;
    dockerStopInstance(instance: Instance): Promise<boolean>;
    dockerPauseInstance(instance: Instance): Promise<boolean>;
    dockerUnpauseInstance(instance: Instance): Promise<boolean>;
    dockerInstancePaused(instance: Instance): Promise<boolean | undefined>;
}
