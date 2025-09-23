import { Controller } from '.';
import { Server as HttpServer } from 'http';
import { InstanceStatus, ControllerInstanceStatus } from '@octopuscentral/types';
export declare class Socket {
    #private;
    private readonly controller;
    private readonly server;
    private readonly io;
    get port(): number;
    set port(port: number);
    constructor(controller: Controller, server?: HttpServer, port?: number);
    start(): Promise<void>;
    stop(): Promise<void>;
    getStatus(instanceId: number, timestamp: number): ControllerInstanceStatus | undefined;
    sendStatus(instanceId: number, status: InstanceStatus): void;
    private setupSocketHandlers;
    private listenForResponse;
}
