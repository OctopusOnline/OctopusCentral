import { cliServerPort, cliWarningCode } from '@octopuscentral/types';
import readline, { Interface as ReadlineInterface } from 'node:readline/promises';
import axios, { AxiosResponse } from 'axios';
import EventEmitter from 'node:events';
import process from 'node:process';
import path from 'path';

export class CLIClient extends EventEmitter {
  private readonly consoleInputPrefix: string = '> ';

  private readonly rl: ReadlineInterface;

  private running: boolean = false;

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

  private async inputLoop(): Promise<void> {
    const input: string = (await this.rl.question(this.consoleInputPrefix)).trim();
    this.emit('input', input);

    switch (input) {
      case '': break;
      case 'exit': return this.stop();

      default:
        const requestPath: string = path.normalize(input.split(' ').join('/'));
        let response: AxiosResponse;
        try { response = await axios.get(`http://0.0.0.0:${cliServerPort}/${requestPath}`) }
        catch (error: any) { response = error.response }
        if (response) {
          if (response.status === 404) this.emit('warning', cliWarningCode.invalid_command);
          else if (response.status === 200) {
            if (response.data?.type)
              this.emit('response', response.data.type, response.data.data);
            else this.emit('warning', cliWarningCode.empty_response);
          } else this.emit('warning', cliWarningCode.unknown_response_code, response.status);
        }
    }

    await this.inputLoop();
  }

  stop(): void {
    this.rl.close();
    this.emit('stop');
  }
}