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

  #restartMe: boolean = false;
  autoRestart: boolean = false;

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  get statusQueue(): InstanceStatus[] { return this.#statusQueue }

  get restartMe(): boolean { return this.#restartMe }

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
    if (!this.socketProtocol || !this.socketHostname || !this.socketPort) {
      this.#restartMe = false;
      return false;
    }

    if (this.connected && reconnect)
      await this.disconnect();

    this.#restartMe = false;

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

    const handlers: { [event: string]: (...args: any[]) => void } = {
      'boot status': (
        (message: string,  resetTimeout: boolean) => this.emit('boot status',        message, resetTimeout)
      ),
      'boot status booted': (
        (success: boolean, resetTimeout: boolean) => this.emit('boot status booted', success, resetTimeout)
      ),
      'status': (
        (status: InstanceStatus[] | unknown) => {
          if (Array.isArray(status))
            this.#socket!.emit('status received', status.map(status => {
              if (this.#queueStatus(status))
                this.emit('status received', status);
              return status.timestamp;
            }));
        }
      ),
      'restartMe': (
        () => {
          if (!this.#restartMe) {
            this.#restartMe = true;
            let deadListener: (value: unknown) => void;
            this.emit('restartMe', Promise.race([
              new Promise(resolve => {
                deadListener = resolve;
                this.once('dead', deadListener);
              }),
              sleep(3e4)
            ]).finally(() => this.off('dead', deadListener)));
          }
          this.#socket!.emit('restartMe received');
        }
      ),
      'autoRestart update': (
        (enabled: boolean) => {
          this.emit('autoRestart update', enabled);
          this.autoRestart = enabled;
          this.#socket!.emit('autoRestart update received');
        }
      )
    }

    for (const event in handlers)
      this.#socket!.on(event, handlers[event]);

    this.#socket!.on('disconnect', () => {
      for (const event in handlers)
        this.#socket!.off(event, handlers[event]);
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
        this.socket?.off('start permission received', listener);
        clearInterval(permissionInterval);
        resolve(false);
      }, timeout);

      this.socket!.once('start permission received', listener);

      const permissionInterval = setInterval(() =>
        this.socket?.emit('start permission'), timeout / 60);
    });
  }

  async disconnect(timeout: number = 1e4, disableAutoRestart: boolean = true): Promise<boolean> {
    let success: boolean = true;

    if (!this.#socket) return success;

    if (this.#socket.connected) {
      if (disableAutoRestart) this.autoRestart = false;

      const disconnectPromise = new Promise(resolve => this.once('disconnect', resolve));
      this.#socket.disconnect();

      success = await Promise.race<boolean>([
        disconnectPromise.then(() => true),
        sleep(timeout).then(() => false)
      ]);
    }

    this.#socket = undefined;
    this.emit('socket disconnected', success);
    return success;
  }
}
