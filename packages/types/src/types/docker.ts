const envVarPrefix: string = 'OCTOPUS_INSTANCE';

export const instanceIdEnvVarName: string = envVarPrefix + '_ID';
export const instanceServiceNameEnvVarName: string = envVarPrefix + '_SERVICE_NAME';
export const instanceDatabaseEnvVarName: string = envVarPrefix + '_DATABASE_URL';

export const labelPrefix: string = 'octopus';
export const volumeLabelPrefix: string = 'volume';

export interface DockerClientProps {
  socketPath: string;
}

export interface DockerInstanceProps {
  image: string;
}