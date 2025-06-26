export const tableName: string = 'Instances';

export const labelPrefix: string = 'instance';

export interface PortBinding {
  host: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp';
  }
  src: {
    port: number;
  }
}