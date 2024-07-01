import mariadb from "mariadb";
import { Controller } from "@octopuscentral/controller";

const controller = new Controller(
  process.env.SERVICE_NAME,
  await mariadb.createConnection({
    host:     process.env.MARIADB_HOST     || 'db',
    port:     process.env.MARIADB_PORT     ||  3306,
    user:     process.env.MARIADB_USER     || 'root',
    password: process.env.MARIADB_PASSWORD || 'root',
    database: process.env.MARIADB_DATABASE
  }),
  {
    image: process.env.INSTANCE_DOCKER_IMAGE
  }
);

const instancesFetchInterval = Number(process.env.INSTANCES_FETCH_INTERVAL);
if (!isNaN(instancesFetchInterval)) controller.instancesFetchInterval = instancesFetchInterval;

await controller.start();