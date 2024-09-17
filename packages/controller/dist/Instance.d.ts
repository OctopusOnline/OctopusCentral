import EventEmitter from 'node:events';
import { Socket as IOSocket } from 'socket.io-client';
export declare class Instance extends EventEmitter {
    #private;
    readonly id: number;
    socketProtocol: string;
    socketHostname?: string;
    socketPort: number;
    get socket(): IOSocket | undefined;
    get connected(): boolean;
    constructor(id: number, socketHostname?: string, socketPort?: number);
    connect(reconnect?: boolean): Promise<boolean | Error>;
    sendStartPermission(timeout?: number): Promise<boolean>;
    disconnect(): void;
}
