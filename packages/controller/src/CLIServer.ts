import { cliServerPort, CLIResponseValueData, CLIResponseTableDataType, CLIResponseValueDataType, DockerInstanceMode } from '@octopuscentral/types';
import express, { Request, Response } from 'express';
import http from 'http';
import { Controller, Instance } from '.';
import { Settings } from './Settings';
import { waitFor } from './helper';

interface RequestWithInstance extends Request {
  instance: Instance;
}

export class CLIServer {
  private readonly controller: Controller;

  private readonly server: http.Server;
  private readonly express: express.Express;

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


    this.express.get([
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
    ], <express.Application> ((req: RequestWithInstance, res: Response, next: express.NextFunction) => {
      req.instance = this.controller.getInstance(Number(req.params.id))!;
      if (!req.instance)
        res.json({
          type: 'value',
          data: `instance ${req.params.id} does not exist`
        } as CLIResponseValueData);
      else next();
    }));


    this.express.get([
      '/instance/:id/start',
      '/instance/:id/start/:mode',
      '/i/:id/start',
      '/i/:id/start/:mode'
    ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
      const mode = (req.params.mode?.trim() || 'production') as DockerInstanceMode;
      console.log('[CLIServer]', `[${req.path}]`, {mode});

      this.eventBuffer.instance[req.instance.id] = { start: { waitingForStream: true, connected: false, booted: false } };

      console.log('[CLIServer]', `[${req.path}]`, 'waitFor eventBuffer: waitingForStream = false', this.eventBuffer.instance[req.instance.id]);
      const result: boolean | Error = await waitFor(() => !this.eventBuffer.instance[req.instance.id].start.waitingForStream)
        ? await this.controller.startInstance(req.instance, mode, undefined, mode === 'production').catch(error => error as Error)
        : new Error('boot stream timeout');

      console.log('[CLIServer]', `[${req.path}]`, {result}, 'set eventBuffer booted "true"');
      this.eventBuffer.instance[req.instance.id].start.booted = true;

      console.log('[CLIServer]', `[${req.path}]`, `writableEnded=${res.writableEnded}`, {result});
      if (!res.writableEnded && result !== true)
        await this.controller.stopInstance(req.instance, mode === 'production');

      console.log('[CLIServer]', `[${req.path}]`, 'response json');
      res.json({
        type: 'value',
        data: result instanceof Error
          ? result.message : (result
            ? `instance ${ req.instance.id } started`
            : `instance ${ req.instance.id } could not be started`)
      } as CLIResponseValueData);

      console.log('[CLIServer]', `[${req.path}]`, 'delete eventBuffer');
      this.eventBuffer.instance.splice(req.instance.id, 1);
    }));


    this.express.get([
      '/stream/instance/:id/start',
      '/stream/instance/:id/start/*',
      '/stream/i/:id/start',
      '/stream/i/:id/start/*'
    ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
      console.log('[CLIServer]', `[${req.path}]`);
      console.log('[CLIServer]', `[${req.path}]`, 'waitFor eventBuffer: waitingForStream = true', this.eventBuffer.instance[req.instance.id]);
      if (!await waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.waitingForStream))
        return res.destroy(new Error('no waitingForStream'));

      const bootStatusEvent = (message: string | null) => {
        console.log('[CLIServer]', `[${req.path}]`, '[bootStatusEvent]', message);
        return message !== null && res.write(message);
      }
      const connectEvent = async (error?: Error) => {
        console.log('[CLIServer]', `[${req.path}]`, '[connectEvent]', error?.message, this.eventBuffer.instance[req.instance.id]);

        if (!this.eventBuffer.instance[req.instance.id]?.start) {
          console.log('[CLIServer]', `[${req.path}]`, 'removed instance event "socket connected"');
          req.instance.off('socket connected', connectEvent);
          return;
        }
        else if (error) return;

        console.log('[CLIServer]', `[${req.path}]`, 'removed instance event "socket connected"');
        req.instance.off('socket connected', connectEvent);
        console.log('[CLIServer]', `[${req.path}]`, 'register instance event "boot status"');
        req.instance.on('boot status', bootStatusEvent);

        console.log('[CLIServer]', `[${req.path}]`, 'set eventBuffer connected "true"', this.eventBuffer.instance[req.instance.id]);
        this.eventBuffer.instance[req.instance.id].start.connected = true;
        console.log('[CLIServer]', `[${req.path}]`, 'waitFor eventBuffer: booted = true', this.eventBuffer.instance[req.instance.id]);
        await waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.booted, 300);

        console.log('[CLIServer]', `[${req.path}]`, 'removed instance event "boot status"');
        req.instance.off('boot status', bootStatusEvent);
        res.end('');
      }

      console.log('[CLIServer]', `[${req.path}]`, 'register instance event "socket connected"');
      req.instance.on('socket connected', connectEvent);

      console.log('[CLIServer]', `[${req.path}]`, 'set eventBuffer waitingForStream "false"');
      this.eventBuffer.instance[req.instance.id].start.waitingForStream = false;

      console.log('[CLIServer]', `[${req.path}]`, 'waitFor eventBuffer: connected | booted', this.eventBuffer.instance[req.instance.id]);
      if (await Promise.race([
        waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.connected, 300).then(() => false),
        waitFor(() => this.eventBuffer.instance[req.instance.id]?.start?.booted, 300).then(() => true)
      ])) {
        console.log('[CLIServer]', `[${req.path}]`, 'removed instance event "socket connected"', this.eventBuffer.instance[req.instance.id]);
        req.instance.off('socket connected', connectEvent);
        res.end('');
      }
    }));


    this.express.get([
      '/instance/:id/stop',
      '/i/:id/stop'
      ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
      req.instance.running = false;
      let result: boolean | Error;
      try { result = await this.controller.stopInstance(req.instance) }
      catch (error) { result = error as Error }
      res.json({
        type: 'value',
        data: result instanceof Error
          ? result.message : (result
            ? `instance ${ req.instance.id } stopped`
            : `instance ${ req.instance.id } already stopped`)
      } as CLIResponseValueData);
    }));


    this.express.get([
      '/instance/:id/status',
      '/i/:id/status',
      '/instance/:id/ss',
      '/i/:id/ss'
    ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
      const status = req.instance.getLastStatus();
      res.json({
        type: 'value',
        data: status
          ? `timestamp: ${new Intl.DateTimeFormat('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(status.timestamp)}\n`
          + `healthy: ${status.healthy ? 'yes' : 'no'}\n`
          + `message: ${status.message}`
          + (status.data ? `data: ${Object.entries(status.data).map(([key, value]) => `- ${key}: ${typeof value === 'string' ? `'${value}'` : value}`).join('\n')}` : '')
          : 'no status available'
      } as CLIResponseValueData);
    }));


    this.express.get([
      '/instance/:id/settings',
      '/instance/:id/s/ls',
      '/i/:id/settings',
      '/i/:id/s/ls',
    ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
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
    }));


    this.express.get([
      '/instance/:id/setting/:name',
      '/instance/:id/s/:name',
      '/i/:id/setting/:name',
      '/i/:id/s/:name',
    ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
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
    }));


    this.express.get([
      '/instance/:id/setting/:name/set/:value',
      '/instance/:id/s/:name/set/:value',
      '/i/:id/setting/:name/set/:value',
      '/i/:id/s/:name/set/:value',
    ], <express.Application> (async (req: RequestWithInstance, res: Response) => {
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
    }));


    this.express.use((_: Request, res: Response) =>
      res.status(404).send());
  }

  start(): Promise<void> {
    return new Promise<void>(resolve =>
      this.server.listen(cliServerPort, () => resolve()));
  }

  stop(): Promise<void> {
    return new Promise<void>(resolve =>
      this.server.close(() => resolve()));
  }
}