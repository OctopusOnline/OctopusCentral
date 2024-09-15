import { Controller } from ".";
export declare class CLIServer {
    private readonly controller;
    private readonly server;
    private readonly express;
    private readonly eventBuffer;
    constructor(controller: Controller);
    private setup;
    start(): Promise<void>;
    stop(): Promise<void>;
}
