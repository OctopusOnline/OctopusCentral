#!/usr/bin/env node

import { CLIClient } from "@octopuscentral/controller";
import { cliWarningCode } from "@octopuscentral/types";
import Table from 'cli-table3';

const args = process.argv.slice(2);
const batching = args.length > 0;

const cli = new CLIClient();

cli.on('response', (type, data) => {
  switch (type) {
    case 'value':
      console.log(data);
      break;
    case 'list':
      console.log(`count: (${data.length})${data.map(value=>`\n- ${value}`)}`);
      break;
    case 'table':
      const table = new Table({ head: data.head });
      for (const row of data.rows) table.push(row);
      console.log(table.toString());
      break;
    case 'streamChunk':
      console.log(data.toString());
      break;
  }
});

cli.on('warning', (code, data) =>
  console.warn('[!]', (code => {
    switch (code) {
      case cliWarningCode.invalid_command:       return 'invalid command';
      case cliWarningCode.empty_response:        return 'empty response';
      case cliWarningCode.unknown_response_code: return `unknown response code: ${data}`;
    }

    if (batching) process.exit(1);
  })(code)));

cli.on('clear', () => {
  console.clear();
  console.log('===============================\n OctopusCentral Controller CLI \n===============================');
});
cli.on('stop', () => process.exit());

if (batching) {
  await cli.handleCommand(args);
  process.exit(0);
}

cli.clear();
cli.start();