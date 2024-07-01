import { Controller } from '.';
import express from 'express';
import http, { Server as HttpServer } from 'http';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { Instance } from './Instance';

export class Socket {
  private readonly controller: Controller;
  private readonly server: HttpServer;
  private readonly io: IOServer;

  #port: number;

  get port(): number { return this.#port }

  set port(port: number) {
    if (typeof port as unknown !== 'number') throw new Error('port must be a number');
    if (port <= 0) throw new Error('port must be greater than zero');
    if (port > 65535) throw new Error('port must be smaller than 65535');
    this.#port = port;
  }

  constructor(controller: Controller, server: HttpServer = http.createServer(express()), port: number = 1778) {
    this.controller = controller;
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

  private setupSocketHandlers() {
    this.io.on('connection', (socket: IOSocket) =>
    {
      socket.on('request controller', async (sessionId: string, command: string, args: any) => {
        let instance: Instance | undefined;
        switch (command) {
          case 'get serviceName':
            socket.emit('response controller', 200 as any, sessionId as any, this.controller.serviceName as any);
            break;

          case 'get instances':
            const values: string[] | true = args?.values === true || args?.values || ['id'];
            socket.emit('response controller', 200 as any, sessionId as any, this.controller.instances.map(instance => ({
              ...(values === true || values.includes('id'            ) ? { id             : instance.id             } : {}),
              ...(values === true || values.includes('socketProtocol') ? { socketProtocol : instance.socketProtocol } : {}),
              ...(values === true || values.includes('socketHostname') ? { socketHostname : instance.socketHostname } : {}),
              ...(values === true || values.includes('socketPort'    ) ? { socketPort     : instance.socketPort     } : {}),
            })) as any);
            break;

          case 'fetch instances':
            await this.controller.fetchSyncInstances();
            socket.emit('response controller', 200 as any, sessionId as any);
            break;

          case 'docker get clientProps':
            socket.emit('response controller', 200 as any, sessionId as any, this.controller.docker.clientProps);
            break;

          case 'docker get instanceProps':
            socket.emit('response controller', 200 as any, sessionId as any, this.controller.docker.instanceProps);
            break;

          case 'docker start instance':
            instance = this.controller.getInstance(args.id);
            socket.emit('response controller', 200 as any, sessionId as any,
              (instance ? await this.controller.docker.startInstance(instance) : undefined) as any);
            break;

          case 'docker stop instance':
            instance = this.controller.getInstance(args.id);
            socket.emit('response controller', 200 as any, sessionId as any,
              (instance ? await this.controller.docker.stopInstance(instance) : undefined) as any);
            break;

          case 'docker pause instance':
            instance = this.controller.getInstance(args.id);
            socket.emit('response controller', 200 as any, sessionId as any,
              (instance ? await this.controller.docker.pauseInstance(instance) : undefined) as any);
            break;

          case 'docker unpause instance':
            instance = this.controller.getInstance(args.id);
            socket.emit('response controller', 200 as any, sessionId as any,
              (instance ? await this.controller.docker.unpauseInstance(instance) : undefined) as any);
            break;

          case 'docker instance paused':
            instance = this.controller.getInstance(args.id);
            socket.emit('response controller', 200 as any, sessionId as any,
              (instance ? await this.controller.docker.instancePaused(instance) : undefined) as any);
            break;

          default:
            socket.emit('response controller', 404 as any, sessionId as any);
        }
      });

      socket.on('request instance', (sessionId: string, instanceId: number, command: string, args: any) => {
        const instance = this.controller.getInstance(instanceId);
        if (!instance?.connected)
          socket.emit('response instance', 404 as any, sessionId as any);
        else {
          this.listenForResponse(socket, instance, sessionId);
          instance.socket!.emit('request', sessionId, command, args);
        }
      });
    });
  }

  private listenForResponse(socket: IOSocket, instance: Instance, sessionId: string) {
    if (!instance.connected)
      socket.emit('response instance', 408, sessionId);
    else instance.socket!.once('response', (_code: number, _sessionId: string, data: any) => {
      if (_sessionId !== sessionId)
        this.listenForResponse(socket, instance, sessionId);
      else switch (_code)
      {
        case 200:
          socket.emit('response instance', 200 as any, sessionId as any, data);
          break;

        case 404:
          socket.emit('response instance', 410 as any, sessionId as any);
          break;
      }
    });
  }
}