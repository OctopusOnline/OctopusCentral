import EventEmitter from 'node:events';
import { Socket as IOSocket } from 'socket.io-client';
import { InstanceStatus } from '@octopuscentral/types';
export declare class Instance extends EventEmitter {
    #private;
    readonly id: number;
    socketProtocol: string;
    socketHostname?: string;
    socketPort: number;
    autoRestart: boolean;
    get socket(): IOSocket | undefined;
    get connected(): boolean;
    get statusQueue(): InstanceStatus[];
    get restartMe(): boolean;
    constructor(id: number, socketHostname?: string, socketPort?: number);
    getStatus(timestamp: number): InstanceStatus | undefined;
    getLastStatus(): InstanceStatus | undefined;
    connect(reconnect?: boolean): Promise<boolean | Error>;
    sendStartPermission(timeout?: number): Promise<boolean>;
    disconnect(timeout?: number, disableAutoRestart?: boolean): Promise<boolean>;
}
