export declare class CLIClient {
    private readonly consoleInputPrefix;
    private readonly rl;
    private running;
    constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream);
    start(): void;
    private inputLoop;
}
