import { cliServerPort } from '@octopuscentral/types';
import readline, { Interface as ReadlineInterface } from 'node:readline/promises';
import process from 'node:process';
import axios from 'axios';
import path from 'path';

export class CLIClient {
  private readonly consoleInputPrefix: string = '>';

  private readonly rl: ReadlineInterface;

  private running: boolean = false;

  constructor(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout
  ) {
    this.rl = readline.createInterface(input, output);
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    this.inputLoop().then();
  }

  // TODO: add console coloring
  private async inputLoop(): Promise<void> {
    const input: string = (await this.rl.question(this.consoleInputPrefix)).trim();
    switch (input)
    {
      case 'exit':
        this.rl.close();
        process.exit();
        return;

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
}