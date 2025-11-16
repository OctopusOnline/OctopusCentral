import EventEmitter from 'events';
import { InstanceStatus } from '@octopuscentral/types';
import { Instance } from '.';
import http from 'http';
import io from 'socket.io';
import { waitFor } from './helper';

export type InstanceStatusParam = Omit<InstanceStatus, 'timestamp'>;

export class Socket extends EventEmitter {
  private readonly instance: Instance;
  private readonly server: http.Server;
  private readonly io: io.Server;

  #port: number;

  #startPermission: boolean = false;
  #statusQueue: InstanceStatus[] = [];

  get port(): number { return this.#port }
  get running(): boolean { return this.server.listening }

  set port(port: number) {
    if (typeof port as unknown !== 'number') throw new Error('port must be a number');
    if (port <= 0) throw new Error('port must be greater than zero');
    if (port > 65535) throw new Error('port must be smaller than 65535');
    this.#port = port;
  }

  constructor(instance: Instance, server: http.Server = http.createServer(), port: number = 1777) {
    super();
    this.instance = instance;
    this.server = server;
    this.io = new io.Server(this.server, {
      cleanupEmptyChildNamespaces: true
    });
    this.#port = port;

    this.setupSocketHandlers();
  }

  async start(): Promise<void> {
    if (!this.running)
      await new Promise<void>(resolve =>
        this.server.listen(this.#port, () => resolve()));
  }

  async stop(): Promise<void> {
    if (this.running)
      await new Promise<void>(resolve =>
        this.server.close(() => resolve()));
  }

  async awaitStartPermission(timeout: number = 6e4): Promise<boolean> {
    return await waitFor(() => this.#startPermission, timeout / 200);
  }

  sendBootStatus(messageOrBooted: string | null | boolean, resetTimeout: boolean = true): void {
    this.io.emit(
      typeof messageOrBooted === 'boolean'
        ? 'boot status booted'
        : 'boot status',
      messageOrBooted,
      resetTimeout);
  }

  getStatus(timestamp: number): InstanceStatus | undefined {
    return this.#statusQueue.find(status => status.timestamp === timestamp);
  }

  sendStatus(status: InstanceStatusParam): void {
    this.#statusQueue.push({
      ...status,
      timestamp: Date.now()
    } as InstanceStatus);
    this.#sendStatusQueue();
  }

  #sendStatusQueue(): void {
    if (this.#statusQueue.length > 0)
      this.io.emit('status', this.#statusQueue);
  }

  //#sendAwaitReceived(event: string, params: unknown[] = [], timeout = 1e4): Promise<boolean> {
  //  const sendReceivedPromise = new Promise<void>(resolve =>
  //      this.once(`${event} received`, resolve));
  //  this.io.emit(event, ...params);
  //  return Promise.race([
  //    sendReceivedPromise.then(() => true),
  //    sleep(timeout).then(() => false)
  //  ]);
  //}

  private setupSocketHandlers() {
    this.io.on('connection', (socket: io.Socket) => {

      socket.on('healthcheck', () =>
        socket.emit('healthy'));

      socket.on('start permission', () => {
        this.#startPermission = true;
        socket.emit('start permission received');
      });

      socket.on('status received', (timestamps: number[]) => {
        for (const timestamp of timestamps) {
          const index = this.#statusQueue.findIndex(status => status.timestamp === timestamp);
          if (index > -1) this.#statusQueue.splice(index, 1);
        }
      });

      socket.on('request', async (sessionId: string, command: string, args: any) => {
        switch (command) {
          case 'setting get':
            socket.emit('response', 200 as any, sessionId as any,
              this.instance.settings.getSetting(args.name) as any);
            break;

          case 'setting update':
            socket.emit('response', 200 as any, sessionId as any,
              await this.instance.settings.updateSetting(args.name, args.value, args.type, args.min, args.max) as any);
            break;

          case 'setting delete':
            await this.instance.settings.deleteSetting(args.name);
            socket.emit('response', 200 as any, sessionId as any);
            break;

          default:
            socket.emit('response', 404 as any, sessionId as any);
        }
      });

      socket.on('disconnect', () => {
        socket.removeAllListeners();
      });

      this.#sendStatusQueue();
    });
  }
}