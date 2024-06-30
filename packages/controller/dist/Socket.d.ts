import { Controller } from '.';
import { Server as HttpServer } from 'http';
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
    private setupSocketHandlers;
    private listenForResponse;
}
