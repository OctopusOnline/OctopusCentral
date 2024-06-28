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

  // TODO: endpoint to ask for serviceName
  // TODO: endpoint to ask for all instance IDs

  private setupSocketHandlers() {
    this.io.on('connection', (socket: IOSocket) => {
      socket.on('request instance', (sessionId: string, instanceId: number, command: string, args: any) => {
        const instance = this.controller.getInstance(instanceId);
        if (!instance?.connected)
          socket.emit('response instance', 404, sessionId);
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
          this.io.emit('response instance', 200, sessionId, data);
          break;

        case 404:
          this.io.emit('response instance', 410, sessionId);
          break;
      }
    });
  }
}