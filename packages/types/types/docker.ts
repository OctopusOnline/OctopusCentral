export interface DockerClientProps {
  socketPath: string;
}

export interface DockerInstanceProps {
  image: string;
  // TODO: add volume mappings
  // TODO: add port mappings
}