import { cliServerPort, cliWarningCode } from '@octopuscentral/types';
import readline, { Interface as ReadlineInterface } from 'node:readline/promises';
import axios, { AxiosResponse } from 'axios';
import EventEmitter from 'node:events';
import { Writable } from 'node:stream';
import process from 'node:process';
import path from 'node:path';
import { sleep } from './helper';

export class CLIClient extends EventEmitter {
  private readonly consoleInputPrefix: string = '> ';

  private readonly rl: ReadlineInterface;

  private running: boolean = false;
  private abortController?: AbortController;

  private getServerUrl(path: string): string {
    return `http://0.0.0.0:${cliServerPort}/${path}`;
  }

  constructor(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout
  ) {
    super();
    this.rl = readline.createInterface(input as any, output as any);
    this.rl.on('close', () => this.stop());
    this.rl.on('SIGINT', () => {
      if (this.abortController) {
        this.abortController.abort();
      } else {
        this.rl.write('');
        this.rl.prompt(true);
      }
    });
  }

  start(): void {
    if (this.running) return;
    else this.running = true;

    this.emit('start');
    this.inputLoop().then();
  }

  private async request(command: string): Promise<void> {
    const requestPath: string = path.normalize(command.split(' ').join('/'));
    let response: AxiosResponse | undefined;
    try {
      response = await axios.get(this.getServerUrl(requestPath), {
        signal: this.abortController?.signal,
      });
    } catch (error: any) {
      if (axios.isCancel(error)) {
        this.emit('warning', cliWarningCode.command_cancelled);
        return;
      }
      response = error.response;
    }
    if (response) {
      if (response.status === 404) this.emit('warning', cliWarningCode.invalid_command);
      else if (response.status === 200) {
        if (response.data?.type)
          this.emit('response', response.data.type, response.data.data);
        else this.emit('warning', cliWarningCode.empty_response);
      } else this.emit('warning', cliWarningCode.unknown_response_code, response.status);
    }
  }

  private async requestTextStream(command: string): Promise<void> {
    const requestPath: string = path.normalize(command.split(' ').join('/'));
    await sleep(200);
    await new Promise<void>(async resolve => {
      try {
        const response = await axios({
          url: this.getServerUrl('stream/' + requestPath),
          responseType: 'stream',
          validateStatus: status => status < 500,
          signal: this.abortController?.signal
        });
        const self = this;
        response.data.pipe(new Writable({
          write(chunk, encoding, callback) {
            self.emit('response', 'streamChunk', chunk, encoding);
            callback();
          }
        }));
        response.data.on('end', () => resolve());
        response.data.on('error', () => resolve());
      }
      catch { resolve() }
    });
  }

  async handleCommand(args: string | string[]): Promise<void> {
    this.abortController = new AbortController();
    const command: string = typeof args === 'string' ? args : args.join(' ');
    await Promise.all([
      this.request(command),
      this.requestTextStream(command)
    ]);
    delete this.abortController;
  }

  private async inputLoop(): Promise<void> {
    const input: string = (await this.rl.question(this.consoleInputPrefix)).trim();
    this.emit('input', input);

    switch (input) {
      case '':
        break;
      case 'clear':
        this.clear();
        break;
      case 'exit':
        return this.stop();

      default:
        await this.handleCommand(input);
    }

    await this.inputLoop();
  }

  stop(): void {
    this.rl.close();
    this.emit('stop');
  }

  clear(): void {
    this.emit('clear');
  }
}