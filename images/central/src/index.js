import { Central } from '@octopuscentral/central';


const central = new Central(process.env.DATABASE_URL);


process.on('SIGTERM', async () => {
  console.log('stopping central...')
  await central.stop();
  console.info('central stopped');
  process.exit();
});


await central.start();
console.info('central started');