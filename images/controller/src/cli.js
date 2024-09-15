import { CLIClient } from "@octopuscentral/controller";
import { cliWarningCode } from "@octopuscentral/types";
import Table from 'cli-table3';

console.log('===============================\n OctopusCentral Controller CLI \n===============================');

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
  })(code)));

cli.on('clear', () => console.clear());
cli.on('stop', () => process.exit());

cli.start();