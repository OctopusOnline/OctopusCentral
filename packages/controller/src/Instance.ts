import EventEmitter from 'node:events';
import { io, Socket as IOSocket } from 'socket.io-client';
import { sleep, waitFor } from './helper';
import { InstanceStatus } from '@octopuscentral/types';

export class Instance extends EventEmitter {
  readonly id: number;

  #running: boolean;

  socketProtocol: string = 'http';
  socketHostname?: string;
  socketPort: number;

  #socket?: IOSocket;

  #statusQueue: InstanceStatus[] = [];
  #statusQueueLimit: number = 100;

  get running(): boolean { return this.#running }

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  get statusQueue(): InstanceStatus[] { return this.#statusQueue }

  set running(running: boolean) {
    this.#running = running;
    this.emit('set running', running);
  }

  constructor(id: number, socketHostname?: string, socketPort: number = 1777, running: boolean = false) {
    super();
    this.id = id;
    this.socketHostname = socketHostname;
    this.socketPort = socketPort;
    this.#running = running;
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
    if ((this.connected && !reconnect) || !this.socketProtocol || !this.socketHostname || !this.socketPort)
      return false;

    if (reconnect)
      await this.disconnect();

    const socket = io(`${this.socketProtocol}://${this.socketHostname}:${this.socketPort}`, {
      reconnection: true,
      reconnectionAttempts: Infinity
    });

    const connectResult = await new Promise<Error | void>(resolve => {
      socket.once('connect', () => {
        this.emit('socket connected');
        resolve();
      });
      socket.once('connect_error', error => {
        this.emit('socket connect_error', error);
        resolve(error);
      });
    });

    if (connectResult instanceof Error) {
      this.#socket = undefined;
      return connectResult;
    }
    this.#socket = socket;

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
      )
    }

    for (const event in handlers)
      this.#socket!.on(event, handlers[event]);

    this.#socket!.on('disconnect', () => {
      for (const event in handlers)
        this.#socket?.off(event, handlers[event]);
    });

    return true;
  }

  async sendStartPermission(timeout: number = 6e4): Promise<boolean> {
    if (!await waitFor(() => this.connected, timeout / 200, 200))
      return false;

    return await new Promise(resolve => {
      const startPermissionReceivedEvent = () => {
        clearTimeout(startPermissionTimeout);
        clearInterval(startPermissionInterval);
        resolve(true);
      }

      const startPermissionTimeout = setTimeout(() => {
        this.#socket?.off('start permission received', startPermissionReceivedEvent);
        clearInterval(startPermissionInterval);
        resolve(false);
      }, timeout);

      this.#socket!.once('start permission received', startPermissionReceivedEvent);

      const startPermissionInterval = setInterval(() =>
        this.#socket?.emit('start permission'), 200);
    });
  }

  async healthcheck(timeout: number = 18e4, interval: number = 1e3): Promise<boolean> {
    let healthy: boolean = false;
    let healthyHandler: null | (() => void) = null;
    return await waitFor(() => {
      if (!this.running || healthy)
        return true;
      if (this.socket) {
        if (!healthyHandler)
          this.socket.once('healthy', healthyHandler = () => healthy = true);
        this.socket.emit('healthcheck');
      } else if (healthyHandler)
        healthyHandler = null;
    }, timeout / interval, interval)
      .then(result => result || healthy)
      .finally(() => healthyHandler && this.socket?.off('healthy', healthyHandler));
  }

  async disconnect(timeout: number = 1e4): Promise<boolean> {
    let success: boolean = true;

    if (this.#socket?.connected) {
      const disconnectPromise = new Promise(resolve => this.#socket!.once('disconnect', resolve));
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
