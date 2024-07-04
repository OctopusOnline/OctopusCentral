import { cliServerPort, CliResponseData } from '@octopuscentral/types';
import { Controller } from ".";
import express, { Request, Response } from 'express';
import http, { Server as HttpServer } from 'http';

export class CLIServer {
  private readonly controller: Controller;

  private readonly server: HttpServer;
  private readonly express: any;

  constructor(controller: Controller) {
    this.controller = controller;
    this.express = express();
    this.server = http.createServer(this.express);

    this.setup();
  }

  private setup(): void {
    this.express.use(express.json());

    this.express.get('/', (_: Request, res: Response) =>
      res.send('Octopus Central CLI Server'));

    this.express.get('/serviceName', (_: Request, res: Response) =>
      res.json({ type: 'value', data: this.controller.serviceName } as CliResponseData));

    this.express.get(['/instance/ls', '/instances'], (_: Request, res: Response) =>
      res.json({ type: 'list', data: this.controller.instances.map(instance => instance.id) } as CliResponseData));

    // TODO: add CLI command processing

    this.express.use((_: Request, res: Response) =>
      res.status(404).send());
  }

  async start(): Promise<void> {
    return new Promise<void>(resolve =>
      this.server?.listen(cliServerPort, () => resolve()));
  }

  async stop(): Promise<void> {
    this.server?.close();
  }
}