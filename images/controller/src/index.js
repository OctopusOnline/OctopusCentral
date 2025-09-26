import { Controller } from "@octopuscentral/controller";


const controller = new Controller(
  process.env.SERVICE_NAME,
  process.env.DATABASE_URL,
  {
    image: process.env.INSTANCE_DOCKER_IMAGE
  }
);
console.info('version:', controller.version);

controller.on('instance creating', () => console.log('creating new instance...'));
controller.on('instance created',   instance => console.log(`created new instance ${instance.id}`));
controller.on('instance starting',  instance => console.log(`starting instance ${instance.id}...`));
controller.on('instance started',  (instance, success) => console.log(success ? `started instance ${instance.id}` : `instance ${instance.id} start failed`));
controller.on('instance stopping',  instance => console.log(`stopping instance ${instance.id}...`));
controller.on('instance stopped',  (instance,  result) => console.log(result  ? `stopped instance ${instance.id}` : `instance ${instance.id} already stopped`));
controller.on('instance restartMe', instance => console.log(`restartMe instance ${instance.id}`));


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