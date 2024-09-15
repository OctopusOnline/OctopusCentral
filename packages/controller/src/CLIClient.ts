import { cliServerPort, cliWarningCode } from '@octopuscentral/types';
import readline, { Interface as ReadlineInterface } from 'node:readline/promises';
import axios, { AxiosResponse } from 'axios';
import EventEmitter from 'node:events';
import process from 'node:process';
import path from 'path';
import { sleep } from './helper';

export class CLIClient extends EventEmitter {
  private readonly consoleInputPrefix: string = '> ';

  private readonly rl: ReadlineInterface;

  private running: boolean = false;

  private getServerUrl(path: string): string {
    return `http://0.0.0.0:${cliServerPort}/${path}`;
  }

  constructor(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout
  ) {
    super();
    this.rl = readline.createInterface(input as any, output as any);
    this.rl.on('close', () => this.stop())
  }

  start(): void {
    if (this.running) return;
    else this.running = true;

    this.emit('start');
    this.inputLoop().then();
  }

  private async request(command: string): Promise<void> {
    const requestPath: string = path.normalize(command.split(' ').join('/'));
    let response: AxiosResponse;
    console.log('CLIClient', 'request', 'send', requestPath);
    try { response = await axios.get(this.getServerUrl(requestPath)) }
    catch (error: any) { response = error.response }
    if (response) {
      console.log('CLIClient', 'request', 'response', response);
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
      console.log('CLIClient', 'requestTextStream', 'send', requestPath);
      const response = await axios({
        url: this.getServerUrl('stream/' + requestPath),
        responseType: 'stream',
        validateStatus: status => status < 500
      });
      console.log('CLIClient', 'requestTextStream', 'pipe');
      response.data.pipe(process.stdout);
      response.data.on('end', () => {console.log('CLIClient', 'requestTextStream', 'onEnd');resolve()});
      response.data.on('error', () => {console.log('CLIClient', 'requestTextStream', 'onError');resolve()});
    });
  }

  private async inputLoop(): Promise<void> {
    const input: string = (await this.rl.question(this.consoleInputPrefix)).trim();
    this.emit('input', input);

    switch (input) {
      case '':
        break;
      case 'clear':
        this.emit('clear');
        break;
      case 'exit':
        return this.stop();

      default:
        await Promise.all([
          this.request(input),
          this.requestTextStream(input)
        ]);
    }

    await this.inputLoop();
  }

  stop(): void {
    this.rl.close();
    this.emit('stop');
  }
}