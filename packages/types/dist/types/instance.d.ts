export declare const tableName: string;
export declare const labelPrefix: string;
export interface PortBinding {
    host: {
        port: number;
    };
    src: {
        ip: string;
        port: number;
        protocol: 'tcp' | 'udp';
    };
}
