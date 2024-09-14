const envVarPrefix: string = 'OCTOPUS_INSTANCE';

export const instanceIdEnvVarName: string = envVarPrefix + '_ID';
export const instanceDatabaseEnvVarName: string = envVarPrefix + '_DATABASE_URL';

export const labelPrefix: string = 'octopus';

export interface DockerClientProps {
  socketPath: string;
}

export interface DockerInstanceProps {
  image: string;
}