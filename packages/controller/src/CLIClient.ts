import { cliServerPort } from '@octopuscentral/types';
import EventEmitter from 'node:events';
import readline, { Interface as ReadlineInterface } from 'node:readline/promises';
import process from 'node:process';
import axios from 'axios';
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

  // TODO: add console coloring
  private async inputLoop(): Promise<void> {
    const input: string = (await this.rl.question(this.consoleInputPrefix)).trim();
    this.emit('input', input);

    switch (input) {
      case 'exit':
        return this.stop();

      default:
        const requestPath: string = path.normalize(input.split(' ').join('/'));
        const response = await axios.get(`http://0.0.0.0:${cliServerPort}/${requestPath}`);
        if (response.status === 404) console.warn('[!] invalid command');
        else if (response.status === 200) {
          if (response.data) console.log(typeof response.data, '|', response.data);
          else console.warn('[!] empty response');
          // TODO: parse and format response data (use response type in json, e.g. to tell to display a table or list)
        }
        else console.warn('[!] unknown response code:', response.status);
    }

    await this.inputLoop();
  }

  stop(): void {
    this.rl.close();
    this.emit('stop');
  }
}