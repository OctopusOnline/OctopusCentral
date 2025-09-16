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

export interface Status {
  timestamp: number;
  healthy: boolean;
  message: string;
  data?: object;
}

export type StatusParam = Omit<Status, 'timestamp'>;