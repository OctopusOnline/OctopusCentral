import { DockerClientProps, DockerInstanceProps } from '@octopuscentral/types';
import { Docker as DockerClient } from 'node-docker-api';
import { Container } from 'node-docker-api/lib/container';
import { Network } from 'node-docker-api/lib/network';
import { Controller } from './index';
import { Instance } from './Instance';
import { hostname } from 'os';

export interface DockerContainer extends Container {}

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

  private async getContainer(instance: Instance | string): Promise<DockerContainer | undefined> {
    const name: string = instance instanceof Instance ? this.getContainerName(instance) : instance
    return (await this.client.container.list()).find(container =>
      (container.data as { Names: string[] }).Names.includes(`/${name}`)
      || container.id.startsWith(name)
    );
  }

  private async getContainerNetwork(container: DockerContainer): Promise<DockerNetwork | undefined> {
    const networks: { [key: string]: DockerNetwork } | undefined
      = (container.data as { NetworkSettings: { Networks: object } })?.NetworkSettings?.Networks as { [key: string]: DockerNetwork };
    if (!networks) return;

    const networkNames: string[] = Object.keys(networks);
    let networkName: string = networkNames.find(networkName => networkName.endsWith('default')) || networkNames[0];

    return networks[networkName];
  }

  private async fetchSelfContainer(): Promise<void> {
    const containerName: string = hostname();
    if (!containerName)
      throw new Error('could not find any hostname (running in a docker container?)');

    this.#selfContainer = await this.getContainer(containerName);
    if (!this.#selfContainer)
      throw new Error(`could not find controller container (${containerName})`);
  }

  private async startInstanceContainer(instance: Instance, network: DockerNetwork, forceRestart: boolean = true, autoReconnect: boolean = false): Promise<DockerContainer | undefined> {
    const runningContainer = await this.getContainer(instance);
    if (runningContainer) {
      if (!forceRestart) return;
      await this.stopInstance(instance);
    }

    const containerName: string = this.getContainerName(instance);

    const container: DockerContainer = await this.client.container.create({
      Image: this.instanceProps.image,
      Tty: true,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      StdinOnce: false,
      Hostname: containerName,
      ExposedPorts: {
        [instance.socketPort]: {}
      },
      HostConfig: {
        NetworkMode: network.NetworkID
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [network.NetworkID]: {
            Aliases: [containerName]
          }
        }
      }
    });
    await container.rename({ name: containerName });
    await container.start();

    await this.controller.updateInstanceSocketHostname(instance, containerName, autoReconnect);

    return container;
  }

  async startInstance(instance: Instance): Promise<boolean> {
    const network = await this.getContainerNetwork(this.#selfContainer!);
    if (!network) return false;

    const container = await this.startInstanceContainer(instance, network, true, true);

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

  // TODO: pauseInstance
  // TODO: unpauseInstance
}