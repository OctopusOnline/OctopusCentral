export const instanceIdEnvVarName: string = 'OCTOPUS_INSTANCE_ID';

export interface DockerClientProps {
  socketPath: string;
}

export interface DockerInstanceProps {
  image: string;
  // TODO: add volume mappings
  // TODO: add port mappings
}