import { Instance } from './index';
import express from 'express';
import http, { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

export class Socket {
  private readonly instance: Instance;
  private readonly server: HttpServer;
  private readonly io: SocketServer;

  #port: number;

  get port(): number { return this.#port }

  set port(port: number) {
    if (typeof port as unknown !== 'number') throw new Error('port must be a number');
    if (port <= 0) throw new Error('port must be greater than zero');
    if (port > 65535) throw new Error('port must be smaller than 65535');
    this.#port = port;
  }

  constructor(instance: Instance, server: HttpServer = http.createServer(express()), port: number = 1777) {
    this.instance = instance;
    this.server = server;
    this.io = new SocketServer(this.server);
    this.#port = port;
  }

  async start(): Promise<void> {
    await new Promise(resolve =>
      this.server.listen(this.port, () => resolve(this)));
  }

  async stop(): Promise<void> {
    await new Promise(resolve =>
      this.server.close(() => resolve(this)));
  }
}