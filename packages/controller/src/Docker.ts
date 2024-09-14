import { instanceDatabaseEnvVarName, DockerClientProps, DockerInstanceProps } from '@octopuscentral/types';
import { instanceIdEnvVarName } from '@octopuscentral/types';
import { Docker as DockerClient } from 'node-docker-api';
import { Container } from 'node-docker-api/lib/container';
import { Network } from 'node-docker-api/lib/network';
import { Controller } from './index';
import { Instance } from './Instance';
import { hostname } from 'os';

export interface DockerContainer extends Container {
  State?: {
    Running?: boolean;
    Paused?: boolean;
  }
}

export interface DockerNetwork extends Network {
  NetworkID: string;
}

export class Docker {
  private readonly controller: Controller;
  private readonly client: DockerClient;

  readonly clientProps: DockerClientProps = { socketPath: '/var/run/docker.sock' };
  readonly instanceProps: DockerInstanceProps;

  #selfContainer?: DockerContainer;

  get connected(): Promise<boolean> {
    const client: DockerClient = this.client;
    return new Promise(async resolve => {
      await client.ping()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }

  constructor(controller: Controller, instanceProps: DockerInstanceProps) {
    if (!instanceProps) throw new Error('no instance properties set!');

    this.controller = controller;
    this.instanceProps = instanceProps;

    this.client = new DockerClient(this.clientProps);
  }

  async init(): Promise<void> {
    if (!await this.connected)
      throw new Error(`Docker client not connected (at: '${this.clientProps.socketPath}')`);
    await this.fetchSelfContainer();
  }

  private getContainerName(instance: Instance | number): string {
    return this.controller.serviceName + '_instance-' + (instance instanceof Instance ? instance.id : instance);
  }

  private async getContainer(instance: Instance | string, onlyRunning: boolean = false): Promise<DockerContainer | undefined> {
    const name: string = instance instanceof Instance ? this.getContainerName(instance) : instance
    return (await this.client.container.list({ all: !onlyRunning })).find(container =>
      (container.data as { Names: string[] }).Names.includes(`/${name}`)
      || container.id.startsWith(name)
    );
  }

  private async getContainerNetwork(container: DockerContainer): Promise<{ [key: string]: DockerNetwork } | undefined> {
    const networks: { [key: string]: DockerNetwork } | undefined
      = (container.data as { NetworkSettings: { Networks: object } })?.NetworkSettings?.Networks as { [key: string]: DockerNetwork };
    if (!networks) return;

    return networks;
  }

  private async fetchSelfContainer(): Promise<void> {
    const containerName: string = hostname();
    if (!containerName)
      throw new Error('could not find any hostname (running in a docker container?)');

    this.#selfContainer = await this.getContainer(containerName);
    if (!this.#selfContainer)
      throw new Error(`could not find controller container (${containerName})`);
  }

  private async startInstanceContainer(instance: Instance, networks: { [key: string]: DockerNetwork }, forceRestart: boolean = true, autoReconnect: boolean = false): Promise<DockerContainer | undefined> {
    const runningContainer = await this.getContainer(instance);
    if (runningContainer) {
      if (!forceRestart) return;
      await this.stopInstance(instance);
    }

    const containerName: string = this.getContainerName(instance);

    let endpointConfig = {};
    for (const networkKey in networks)
      endpointConfig = {
        ...endpointConfig,
        [networks[networkKey].NetworkID]: {
          Aliases: [containerName]
        }
      };

    const container: DockerContainer = await this.client.container.create({
      Image: this.instanceProps.image,
      Tty: true,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      StdinOnce: false,
      Env: [
        `${instanceIdEnvVarName}=${instance.id}`,
        `${instanceDatabaseEnvVarName}=${this.controller.database.url}`
      ],
      Hostname: containerName,
      ExposedPorts: {
        [instance.socketPort]: {}
      },
      HostConfig: {
        NetworkMode: 'bridge'
      },
      NetworkingConfig: {
        EndpointsConfig: endpointConfig
      }
    });
    await container.rename({ name: containerName });
    await container.start();

    await this.controller.updateInstanceSocketHostname(instance, containerName, autoReconnect);

    // TODO: check container Errors (look in debug mode)
    return container;
  }

  async instanceRunning(instance: Instance): Promise<boolean> {
    const container = await this.getContainer(instance);
    return !!container && (!container.State?.Running || !!container.State.Paused);
  }

  async instancePaused(instance: Instance): Promise<boolean | undefined> {
    return (await this.getContainer(instance))?.State!.Paused;
  }

  async startInstance(instance: Instance): Promise<boolean> {
    const networks = await this.getContainerNetwork(this.#selfContainer!);
    if (!networks) return false;

    const container = await this.startInstanceContainer(instance, networks, true, true);
    return !!container && instance.connected;
  }

  async stopInstance(instance: Instance): Promise<boolean> {
    const container = await this.getContainer(instance);
    if (container) {
      await container.delete({ force: true });
      return true;
    }
    return false;
  }

  async pauseInstance(instance: Instance): Promise<boolean> {
    const container = await this.getContainer(instance);
    if (container) {
      await container.pause();
      return true;
    }
    return false;
  }

  async unpauseInstance(instance: Instance): Promise<boolean> {
    const container = await this.getContainer(instance);
    if (container) {
      await container.unpause();
      return true;
    }
    return false;
  }
}