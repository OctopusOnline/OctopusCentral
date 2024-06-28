import { io, Socket as IOSocket } from 'socket.io-client';

export class Client {
  // TODO: change this to ControllerClient, so the Client can connect to multiple Controllers

  private readonly socket: IOSocket;

  readonly protocol: 'http' | 'https';
  readonly host: string;
  readonly port: number;

  constructor(
    host: string = '0.0.0.0',
    protocol: 'http' | 'https' = 'http',
    port: number = 1778
  ) {
    this.protocol = protocol;
    this.host = host;
    this.port = port;

    this.socket = io(`${this.protocol}://${this.host}:${this.port}`);
  }

  // TODO: connect to controller socket
}