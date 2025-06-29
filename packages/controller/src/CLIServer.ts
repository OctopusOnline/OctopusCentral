import { cliServerPort, CLIResponseValueData, CLIResponseTableDataType, CLIResponseValueDataType, DockerInstanceMode } from '@octopuscentral/types';
import { Controller, Instance } from ".";
import express, { Request, Response } from 'express';
import http, { Server as HttpServer } from 'http';
import { waitFor } from './helper';
import { Settings } from './Settings';

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
        connected: boolean;
        booted: boolean;
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
      res.json({ type: 'value', data: this.controller.serviceName } as CLIResponseValueData));

    this.express.get([
      '/instance/ls',
      '/i/ls',
      '/instances'
    ], async (_: Request, res: Response) => {
      const data: CLIResponseTableDataType = {
        head: ['id', 'running'],
        rows: [] as CLIResponseValueDataType[][]
      };
      for (const instance of this.controller.instances)
        data.rows.push([
          instance.id,
          await this.controller.docker.instanceRunning(instance) ? 'yes' : 'no'
        ]);
      res.json({ type: 'table', data });
    });

    this.express.use([
      '/instance/create'
    ], async (_: Request, res: Response) => {
      const instance = await this.controller.createInstance();
      res.json({ type: 'value', data: `instance created with id: ${instance.id}` });
    });

    this.express.use([
      '/instance/:id/*',
      '/stream/instance/:id/*',
      '/i/:id/*',
      '/stream/i/:id/*',
    ], (req: RequestWithInstance, res: Response, next: any) => {
      req.instance = this.controller.getInstance(Number(req.params.id))!;
      if (!req.instance)
        res.json({
          type: 'value',
          data: `instance ${req.params.id} does not exist`
        } as CLIResponseValueData);
      else next();
    });

    this.express.get([
      '/instance/:id/start',
      '/instance/:id/start/:mode',
      '/i/:id/start',
      '/i/:id/start/:mode'
    ], async (req: RequestWithInstance, res: Response) => {
      this.eventBuffer.instance[req.instance.id] = { start: { waitingForStream: true, connected: false, booted: false } };
      let result: boolean | Error;

      if (!await waitFor(() => !this.eventBuffer.instance[req.instance.id].start.waitingForStream))
        result = new Error('boot stream timeout');
      else {
        try { result = await this.controller.startInstance(req.instance, req.params.mode as DockerInstanceMode) }
        catch (error: any) { result = error }
      }
      this.eventBuffer.instance[req.instance.id].start.booted = true;

      if (result !== true)
        await this.controller.stopInstance(req.instance);

      res.json({
        type: 'value',
        data: result instanceof Error
          ? result.message : (result
            ? `instance ${ req.instance.id } started`
            : `instance ${ req.instance.id } could not be started`)
      } as CLIResponseValueData);
    });

    this.express.get([
      '/stream/instance/:id/start',
      '/stream/instance/:id/start/*',
      '/stream/i/:id/start',
      '/stream/i/:id/start/*'
    ], async (req: RequestWithInstance, res: Response) => {

      if (!await waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.waitingForStream))
        return res.destroy(new Error('no waitingForStream'));

      const bootStatusEvent = (message: string) => res.write(message);
      const connectEvent = async (error?: Error) => {
        if (!this.eventBuffer.instance[req.instance.id]?.start) {
          req.instance.off('socket connected', connectEvent);
          return;
        }
        else if (error) return;

        req.instance.off('socket connected', connectEvent);
        req.instance.on('boot status', bootStatusEvent);

        this.eventBuffer.instance[req.instance.id].start.connected = true;
        await waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.booted, 300);

        req.instance.off('boot status', bootStatusEvent);
        res.end('');
      };

      req.instance.on('socket connected', connectEvent);

      this.eventBuffer.instance[req.instance.id].start.waitingForStream = false;

      if (await Promise.race([
        waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.connected, 300).then(() => false),
        waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.booted, 300).then(() => true)
      ])) {
        req.instance.off('socket connected', connectEvent);
        res.end('');
      }
    });

    this.express.get([
      '/instance/:id/stop',
      '/i/:id/stop'
      ], async (req: RequestWithInstance, res: Response) => {
      let result: boolean | Error;
      try { result = await this.controller.stopInstance(req.instance) }
      catch (error: any) { result = error }
      res.json({
        type: 'value',
        data: result instanceof Error
          ? result.message : (result
            ? `instance ${ req.instance.id } stopped`
            : `instance ${ req.instance.id } could not be stopped`)
      } as CLIResponseValueData);
    });

    this.express.get([
      '/instance/:id/settings',
      '/instance/:id/s/ls',
      '/i/:id/settings',
      '/i/:id/s/ls',
    ], async (req: RequestWithInstance, res: Response) => {
      const data = { head: ['name', 'value', 'type', 'min', 'max'], rows: [] as CLIResponseValueDataType[][] } as CLIResponseTableDataType;

      try {
        for (const setting of await new Settings(req.instance, this.controller).getAll())
          data.rows.push([
            setting.name,
            String(setting.value),
            setting.type,
            setting.min === undefined ? '' : setting.min,
            setting.max === undefined ? '' : setting.max
          ])
      }
      catch (error) {
        res.json({ type: 'value', data: (error as Error).message } as CLIResponseValueData);
      }

      res.json({ type: 'table', data });
    });

    this.express.get([
      '/instance/:id/setting/:name',
      '/instance/:id/s/:name',
      '/i/:id/setting/:name',
      '/i/:id/s/:name',
    ], async (req: RequestWithInstance, res: Response) => {
      const data = { head: ['name', 'value', 'type', 'min', 'max'], rows: [] as CLIResponseValueDataType[][] } as CLIResponseTableDataType;

      try {
        const setting = await new Settings(req.instance, this.controller).get(req.params.name);
        data.rows.push([
          setting.name,
          String(setting.value),
          setting.type,
          setting.min === undefined ? '' : setting.min,
          setting.max === undefined ? '' : setting.max
        ])
      }
      catch (error) {
        res.json({ type: 'value', data: (error as Error).message } as CLIResponseValueData);
      }

      res.json({ type: 'table', data });
    });

    this.express.get([
      '/instance/:id/setting/:name/set/:value',
      '/instance/:id/s/:name/set/:value',
      '/i/:id/setting/:name/set/:value',
      '/i/:id/s/:name/set/:value',
    ], async (req: RequestWithInstance, res: Response) => {
      const data = { head: ['name', 'value', 'type', 'min', 'max'], rows: [] as CLIResponseValueDataType[][] } as CLIResponseTableDataType;

      try {
        const setting = await new Settings(req.instance, this.controller)
          .set(req.params.name, req.params.value === "''" ? '' : req.params.value);
        data.rows.push([
          setting.name,
          String(setting.value),
          setting.type,
          setting.min === undefined ? '' : setting.min,
          setting.max === undefined ? '' : setting.max
        ])
      }
      catch (error) {
        res.json({ type: 'value', data: (error as Error).message } as CLIResponseValueData);
      }

      res.json({ type: 'table', data });
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