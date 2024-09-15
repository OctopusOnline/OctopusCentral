import EventEmitter from 'node:events';
import { io, Socket as IOSocket } from 'socket.io-client';

export class Instance extends EventEmitter {
  readonly id: number;

  socketProtocol: string = 'http';
  socketHostname?: string;
  socketPort: number;

  #socket?: IOSocket;

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  constructor(id: number, socketHostname?: string, socketPort: number = 1777) {
    super();
    this.id = id;
    this.socketHostname = socketHostname;
    this.socketPort = socketPort;
  }

  async connect(reconnect: boolean = false): Promise<boolean | Error> {
    if (!this.socketProtocol || !this.socketHostname || !this.socketPort)
      return false;
    if (this.connected && reconnect)
      this.disconnect();

    const socket = io(`${this.socketProtocol}://${this.socketHostname}:${this.socketPort}`, {
      reconnection: true,
      reconnectionAttempts: Infinity
    });
    this.#socket = socket;

    const connectResult = await new Promise<Error | void>((resolve => {
      console.log('instance connect. socket:', socket);
      socket.once('connect', () => {
        this.emit('socket connected');
        resolve();
      });
      socket.once('connect_error', error => {
        this.emit('socket connected', error);
        resolve(error);
      });
    }))

    if (connectResult instanceof Error) {
      this.#socket = undefined;
      return connectResult;
    }
    return true;
  }

  disconnect(): void {
    if (this.#socket) {
      this.#socket.close();
      this.#socket = undefined;
      this.emit('socket disconnected');
    }
  }
}