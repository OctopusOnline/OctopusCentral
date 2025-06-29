export declare const instanceIdEnvVarName: string;
export declare const instanceServiceNameEnvVarName: string;
export declare const instanceDatabaseEnvVarName: string;
export declare const instanceModeEnvVarName: string;
export declare const instancePortBindingsEnvVarName: string;
export declare const labelPrefix: string;
export declare const volumeLabelPrefix: string;
export interface DockerClientProps {
    socketPath: string;
}
export interface DockerInstanceProps {
    image: string;
}
export type InstanceMode = 'init' | 'setup' | 'production';
