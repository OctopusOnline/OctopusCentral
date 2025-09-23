import { Controller } from "@octopuscentral/controller";


const controller = new Controller(
  process.env.SERVICE_NAME,
  process.env.DATABASE_URL,
  {
    image: process.env.INSTANCE_DOCKER_IMAGE
  }
);
console.info('version:', controller.version);

const instancesFetchInterval = Number(process.env.INSTANCES_FETCH_INTERVAL);
if (!isNaN(instancesFetchInterval)) controller.instancesFetchInterval = instancesFetchInterval;


process.on('SIGTERM', async () => {
  console.log('stopping controller...')
  await controller.destroy();
  console.info('controller stopped');
  process.exit();
});


await controller.start();
console.info('controller started');