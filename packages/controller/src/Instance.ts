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

  async connect(reconnect: boolean = false): Promise<boolean> {
    if (!this.socketProtocol || !this.socketHostname || !this.socketPort)
      return false;
    if (this.connected && reconnect)
      await this.disconnect();

    const socket = io(`${this.socketProtocol}://${this.socketHostname}:${this.socketPort}`);
    this.#socket = socket;

    if (!await new Promise<boolean>((resolve => {
      socket!.once('connect', () => {
        this.emit('socket connect');
        resolve(true);
      });
      socket!.once('connect_error', error => {
        this.emit('socket connect_error', error);
        resolve(false);
      });
    }))) {
      this.#socket = undefined;
      return false;
    }
    return true;
  }

  disconnect(): void {
    if (this.#socket) {
      this.#socket.close();
      this.#socket = undefined;
    }
  }
}