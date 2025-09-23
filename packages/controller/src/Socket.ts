import { Controller } from '.';
import express from 'express';
import http, { Server as HttpServer } from 'http';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { sleep } from './helper';
import { Instance } from './Instance';
import { InstanceStatus, ControllerInstanceStatus } from '@octopuscentral/types';

export class Socket {
  private readonly controller: Controller;
  private readonly server: HttpServer;
  private readonly io: IOServer;

  #port: number;

  #statusQueue: ControllerInstanceStatus[] = [];
  #statusQueueLimit: number = 100;

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
    await this.controller.fetchSyncInstances();

    for (const instance of this.controller.instances)
      await instance.connect().finally();

    await new Promise(resolve =>
      this.server.listen(this.port, () => resolve(this)));
  }

  async stop(): Promise<void> {
    for (const instance of this.controller.instances)
      instance.disconnect();

    await new Promise(resolve =>
      this.server.close(() => resolve(this)));
  }

  getStatus(instanceId: number, timestamp: number): ControllerInstanceStatus | undefined {
    return this.#statusQueue.find(status =>
        status.instanceId === instanceId && status.status.timestamp === timestamp);
  }

  sendStatus(instanceId: number, status: InstanceStatus): void {
    this.#queueStatus({ instanceId, status })
    this.#sendStatusQueue();
  }

  #queueStatus(status: ControllerInstanceStatus): boolean {
    if (this.getStatus(status.instanceId, status.status.timestamp)) return false;
    this.#statusQueue.unshift(status);
    if (this.#statusQueue.length > this.#statusQueueLimit)
      this.#statusQueue.pop();
    return true;
  }

  #sendStatusQueue(): void {
    if (this.#statusQueue.length > 0)
      this.io.emit('instance status', this.#statusQueue);
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: IOSocket) =>
    {
      socket.on('instance status received', (status: { instanceId: number, timestamp: number }[]) => {
        for (const _status of status) {
          const index = this.#statusQueue.findIndex(status =>
              status.instanceId === _status.instanceId && status.status.timestamp === _status.timestamp);
          if (index > -1) this.#statusQueue.splice(index, 1);
        }
      });

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
              ...(values === true || values.includes('statusQueue'   ) ? { statusQueue    : instance.statusQueue    } : {}),
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

          case 'create instance':
            instance = await this.controller.createInstance();
            socket.emit('response controller', 200 as any, sessionId as any, instance.id);
            break;

          case 'update instance settings':
            instance = this.controller.getInstance(args.id);
            if (instance) {
              await this.controller.updateInstanceSettings(instance, args.settings);
              socket.emit('response controller', 200 as any, sessionId as any, true);
            }
            else socket.emit('response controller', 200 as any, sessionId as any, false);
            break;

          case 'docker start instance':
            instance = this.controller.getInstance(args.id);
            if (instance) {
              let result: boolean | Error;

              const bootStatusEvent = (message: string) =>
                socket.emit('response controller instance boot status', sessionId, message);

              const connectEvent = async (error?: Error) => {
                if (error) return;

                instance!.off('socket connected', connectEvent);
                instance!.on('boot status', bootStatusEvent);

                socket.emit('response controller', 200 as any, sessionId as any, result as any);
              }

              instance.on('socket connected', connectEvent);

              try {
                result = await Promise.race([
                  this.controller.startInstance(instance!),
                  sleep(6e3).then(() => new Error('boot timeout'))
                ]) as boolean | Error;
              }
              catch (error: any) { result = error }

              instance.off('boot status', bootStatusEvent);

              if (result !== true) {
                instance.off('socket connected', connectEvent);
                await this.controller.stopInstance(instance);
                socket.emit('response controller', 200 as any, sessionId as any, result as any);
              }
            }
            else socket.emit('response controller', 200 as any, sessionId as any, undefined);
            break;

          case 'docker stop instance':
            instance = this.controller.getInstance(args.id);
            socket.emit('response controller', 200 as any, sessionId as any,
              (instance ? await this.controller.stopInstance(instance) : undefined) as any);
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

      socket.on('disconnect', () => {
        socket.removeAllListeners();
      });

      this.#sendStatusQueue();
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