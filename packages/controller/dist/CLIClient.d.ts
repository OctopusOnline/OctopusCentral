import EventEmitter from 'node:events';
export declare class CLIClient extends EventEmitter {
    private readonly consoleInputPrefix;
    private readonly rl;
    private running;
    constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream);
    start(): void;
    private inputLoop;
    stop(): void;
}
