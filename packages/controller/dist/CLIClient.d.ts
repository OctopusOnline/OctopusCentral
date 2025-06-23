import EventEmitter from 'node:events';
export declare class CLIClient extends EventEmitter {
    private readonly consoleInputPrefix;
    private readonly rl;
    private running;
    private getServerUrl;
    constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream);
    start(): void;
    private request;
    private requestTextStream;
    private inputLoop;
    stop(): void;
    clear(): void;
}
