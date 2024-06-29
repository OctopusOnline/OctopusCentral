import EventEmitter from 'node:events';
import { io, Socket as IOSocket } from 'socket.io-client';

export class Controller extends EventEmitter {
  readonly id: number;

  socketHost?: string;

  #socket?: IOSocket;

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  constructor(id: number, socketHost?: string) {
    super();
    this.id = id;
    this.socketHost = socketHost;
  }

  async connect(reconnect: boolean = false): Promise<boolean> {
    if (!this.socketHost)
      return false;
    if (this.connected && reconnect)
      await this.disconnect();

    const socket = io(this.socketHost);
    this.#socket = socket;

    const _this: Controller = this;
    if (!await new Promise<boolean>((resolve => {
      socket!.once('connect', () => {
        _this.emit('socket connect');
        resolve(true);
      });
      socket!.once('connect_error', error => {
        _this.emit('socket connect_error', error);
        resolve(false);
      });
    }))) {
      _this.disconnect();
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