import { CLIClient } from "@octopuscentral/controller";

const cli = new CLIClient();
cli.on('start', () => console.info('===============================\n OctopusCentral Controller CLI \n==============================='));
cli.on('stop', () => process.exit());

cli.start();