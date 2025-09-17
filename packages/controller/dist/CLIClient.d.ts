import EventEmitter from 'node:events';
export declare class CLIClient extends EventEmitter {
    private readonly consoleInputPrefix;
    private readonly rl;
    private running;
    private abortController?;
    private getServerUrl;
    constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream);
    start(): void;
    private request;
    private requestTextStream;
    handleCommand(args: string | string[]): Promise<void>;
    private inputLoop;
    stop(): void;
    clear(): void;
}
