export declare const tableName: string;
export declare const labelPrefix: string;
export interface PortBinding {
    host: {
        ip: string;
        port: number;
        protocol: 'tcp' | 'udp';
    };
    src: {
        port: number;
    };
}
export interface Status {
    timestamp: number;
    healthy: boolean;
    message: string;
    data?: object;
}
