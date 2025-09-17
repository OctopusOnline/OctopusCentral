import { InstanceStatus } from '@octopuscentral/types';
import { Instance } from '.';
import { Server as HttpServer } from 'http';
export type InstanceStatusParam = Omit<InstanceStatus, 'timestamp'>;
export declare class Socket {
    #private;
    private readonly instance;
    private readonly server;
    private readonly io;
    get port(): number;
    get running(): boolean;
    set port(port: number);
    constructor(instance: Instance, server?: HttpServer, port?: number);
    start(): Promise<void>;
    stop(): Promise<void>;
    awaitStartPermission(timeout?: number): Promise<boolean>;
    sendBootStatus(messageOrBooted: string | boolean, resetTimeout?: boolean): void;
    getStatus(timestamp: number): InstanceStatus | undefined;
    sendStatus(status: InstanceStatusParam): void;
    private setupSocketHandlers;
}
