import { cliServerPort, cliResponseTableDataType, CliResponseValueData, CLIResponseTableData } from '@octopuscentral/types';
import { ResponseTableData, responseTableDataType, responseValueDataType } from '@octopuscentral/types/dist/types/cli';
import { Controller, Instance } from ".";
import express, { Request, Response } from 'express';
import http, { Server as HttpServer } from 'http';
import { sleep } from './helper';

interface RequestWithInstance extends Request {
  instance: Instance;
}

export class CLIServer {
  private readonly controller: Controller;

  private readonly server: HttpServer;
  private readonly express: any;

  private readonly eventBuffer: {
    instance: {
      start: {
        waitingForStream: boolean;
        started: boolean;
      };
    }[];
  } = {
    instance: []
  };

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
      res.json({ type: 'value', data: this.controller.serviceName } as CliResponseValueData));

    this.express.get(['/instance/ls', '/instances'], async (_: Request, res: Response) => {
      const data: responseTableDataType = {
        head: ['id', 'running'],
        rows: [] as responseValueDataType[][]
      };
      for (const instance of this.controller.instances)
        data.rows.push([
          instance.id,
          await this.controller.docker.instanceRunning(instance) ? 'yes' : 'no'
        ]);
      res.json({ type: 'table', data });
    });

    this.express.use(['/instance/:id/*', '/stream/instance/:id/*'], (req: RequestWithInstance, res: Response, next: any) => {
      req.instance = this.controller.getInstance(Number(req.params.id))!;
      if (!req.instance)
        res.json({
          type: 'value',
          data: `instance ${req.params.id} does not exist`
        } as CliResponseValueData);
      else next();
    });

    this.express.get('/instance/:id/start', async (req: RequestWithInstance, res: Response) => {
      this.eventBuffer.instance[req.instance.id] = { start: { waitingForStream: true, started: false } };
      while (this.eventBuffer.instance[req.instance.id].start.waitingForStream)
        await sleep(100);

      let result: boolean | Error;
      try { result = await this.controller.startInstance(req.instance) }
      catch (error: any) { result = error }

      this.eventBuffer.instance[req.instance.id].start.started = true;
      res.json({
        type: 'value',
        data: result instanceof Error
          ? result.message : (result
            ? `instance ${ req.instance.id } started`
            : `instance ${ req.instance.id } could not be started`)
      } as CliResponseValueData);
    });

    this.express.get('/stream/instance/:id/start', async (req: RequestWithInstance, res: Response) => {
      if (this.eventBuffer.instance[req.instance.id]?.start?.waitingForStream) {
        this.eventBuffer.instance[req.instance.id].start.waitingForStream = false;

        const bootStatusEvent = (message: string) => res.write(message);
        req.instance.socket!.on('boot status', bootStatusEvent);

        while (!this.eventBuffer.instance[req.instance.id].start.started)
          await sleep(100);
        req.instance.socket!.off('boot status', bootStatusEvent);
      }
    });

    this.express.get('/instance/:id/stop', async (req: RequestWithInstance, res: Response) => {
      let result: boolean | Error;
      try { result = await this.controller.stopInstance(req.instance) }
      catch (error: any) { result = error }
      res.json({
        type: 'value',
        data: result instanceof Error
          ? result.message : (result
            ? `instance ${ req.instance.id } stopped`
            : `instance ${ req.instance.id } could not be stopped`)
      } as CliResponseValueData);
    });

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