export const tableName: string = 'Instances';

export const labelPrefix: string = 'instance';

export interface PortBinding {
  host: {
    port: number;
  }
  src: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp';
  }
}