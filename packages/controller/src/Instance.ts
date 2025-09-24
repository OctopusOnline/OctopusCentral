import EventEmitter from 'node:events';
import { io, Socket as IOSocket } from 'socket.io-client';
import { sleep, waitFor } from './helper';
import { InstanceStatus } from '@octopuscentral/types';

export class Instance extends EventEmitter {
  readonly id: number;

  socketProtocol: string = 'http';
  socketHostname?: string;
  socketPort: number;

  #socket?: IOSocket;

  #statusQueue: InstanceStatus[] = [];
  #statusQueueLimit: number = 100;

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  get statusQueue(): InstanceStatus[] { return this.#statusQueue }

  constructor(id: number, socketHostname?: string, socketPort: number = 1777) {
    super();
    this.id = id;
    this.socketHostname = socketHostname;
    this.socketPort = socketPort;
  }

  getStatus(timestamp: number): InstanceStatus | undefined {
    return this.#statusQueue.find(status => status.timestamp === timestamp);
  }

  getLastStatus(): InstanceStatus | undefined {
    return this.#statusQueue.reduce((prev, current) => (prev.timestamp > current.timestamp) ? prev : current);
  }

  #queueStatus(status: InstanceStatus): boolean {
    if (this.getStatus(status.timestamp)) return false;
    this.#statusQueue.unshift(status);
    if (this.#statusQueue.length > this.#statusQueueLimit)
      this.#statusQueue.pop();
    return true;
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
      socket.once('connect', () => {
        this.emit('socket connected');
        resolve();
      });
      socket.once('connect_error', error => {
        this.emit('socket connect_error', error);
        resolve(error);
      });
    }))

    if (connectResult instanceof Error) {
      this.#socket = undefined;
      return connectResult;
    }

    const bootHandler   = (message: string,  resetTimeout: boolean) => this.emit('boot status',        message, resetTimeout);
    const bootedHandler = (success: boolean, resetTimeout: boolean) => this.emit('boot status booted', success, resetTimeout);
    const statusHandler = (status: InstanceStatus[] | unknown) => {
      if (Array.isArray(status))
        this.#socket!.emit('status received', status.map(status => {
          if (this.#queueStatus(status))
            this.emit('status received', status);
          return status.timestamp;
        }));
    }
    const restartMeHandler = () => {
      this.emit('restartMe', Promise.race([
        new Promise(resolve => this.once('dead', resolve)),
        sleep(3e4)
      ]));
      this.#socket!.emit('restartMe received');
    }

    this.#socket!.on('boot status',          bootHandler);
    this.#socket!.on('boot status booted', bootedHandler);
    this.#socket!.on('status',             statusHandler);
    this.#socket!.on('restartMe',       restartMeHandler);

    this.#socket!.on('disconnect', () => {
      this.#socket!.off('boot status',          bootHandler);
      this.#socket!.off('boot status booted', bootedHandler);
      this.#socket!.off('status',             statusHandler);
      this.#socket!.off('restartMe',       restartMeHandler);
      this.emit('dead');
    });

    return true;
  }

  async sendStartPermission(timeout: number = 6e4): Promise<boolean> {
    await waitFor(() => this.connected)
    if (!this.connected) return false;

    return await new Promise(resolve => {
      const listener = () => {
        clearTimeout(timeoutTimer);
        clearInterval(permissionInterval);
        resolve(true);
      };

      const timeoutTimer = setTimeout(() => {
        this.socket!.off('start permission received', listener);
        clearInterval(permissionInterval);
        resolve(false);
      }, timeout);

      this.socket!.once('start permission received', listener);

      const permissionInterval = setInterval(() =>
        this.socket?.emit('start permission'), timeout / 60);
    });
  }

  disconnect(): void {
    if (this.#socket) {
      this.#socket.close();
      this.#socket = undefined;
      this.emit('socket disconnected');
    }
  }
}