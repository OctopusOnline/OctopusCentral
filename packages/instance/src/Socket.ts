import { waitFor } from './helper';
import { InstanceStatus, InstanceStatusParam } from '@octopuscentral/types';
import { Instance } from '.';
import express from 'express';
import http, { Server as HttpServer } from 'http';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';

export class Socket {
  private readonly instance: Instance;
  private readonly server: HttpServer;
  private readonly io: IOServer;

  #port: number;

  #startPermission: boolean = false;
  #status?: InstanceStatus;

  get port(): number { return this.#port }
  get running(): boolean { return this.server.listening }

  set port(port: number) {
    if (typeof port as unknown !== 'number') throw new Error('port must be a number');
    if (port <= 0) throw new Error('port must be greater than zero');
    if (port > 65535) throw new Error('port must be smaller than 65535');
    this.#port = port;
  }

  constructor(instance: Instance, server: HttpServer = http.createServer(express()), port: number = 1777) {
    this.instance = instance;
    this.server = server;
    this.io = new IOServer(this.server);
    this.#port = port;

    this.setupSocketHandlers();
  }

  async start(): Promise<void> {
    await new Promise(resolve =>
      this.server.listen(this.port, () => resolve(this)));
  }

  async stop(): Promise<void> {
    await new Promise(resolve =>
      this.server.close(() => resolve(this)));
  }

  async awaitStartPermission(timeout: number = 6e4): Promise<boolean> {
    return await waitFor(() => this.#startPermission, timeout / 200);
  }

  sendBootStatus(messageOrBooted: string | boolean): void {
    this.io.emit(
      typeof messageOrBooted === 'boolean'
        ? 'boot status booted'
        : 'boot status',
      messageOrBooted);
  }

  sendStatus(status: InstanceStatusParam = this.#status): void {
    if (status) {
      this.#status = {
        ...status,
        timestamp: Date.now()
      };
      this.io.emit('status', this.#status);
    }
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: IOSocket) => {

      socket.on('start permission', () => {
        this.#startPermission = true;
        this.io.emit('start permission received');
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

      this.sendStatus();
    });
  }
}