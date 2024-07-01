export interface DockerClientProps {
  socketPath: string;
}

export interface DockerInstanceProps {
  image: string;
  // TODO: add port mappings
}