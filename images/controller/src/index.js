import { Controller } from "@octopuscentral/controller";

const controller = new Controller(
  process.env.SERVICE_NAME,
  process.env.DATABASE_URL,
  {
    image: process.env.INSTANCE_DOCKER_IMAGE
  }
);

const instancesFetchInterval = Number(process.env.INSTANCES_FETCH_INTERVAL);
if (!isNaN(instancesFetchInterval)) controller.instancesFetchInterval = instancesFetchInterval;

await controller.start();