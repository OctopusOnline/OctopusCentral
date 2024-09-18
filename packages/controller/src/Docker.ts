import { instanceDatabaseEnvVarName, DockerClientProps, DockerInstanceProps, labelPrefix, volumeLabelPrefix, instanceLabelPrefix, controllerLabelPrefix } from '@octopuscentral/types';
import { instanceIdEnvVarName } from '@octopuscentral/types';
import { Docker as DockerClient } from 'node-docker-api';
import { Image } from 'node-docker-api/lib/image';
import { Volume } from 'node-docker-api/lib/volume';
import { Container } from 'node-docker-api/lib/container';
import { Network } from 'node-docker-api/lib/network';
import { Controller } from './index';
import { Instance } from './Instance';
import { hostname } from 'os';

export interface DockerImage extends Image {
  data: {
    Config: {
      Labels: { [key: string]: string };
    };
  };
}

export interface DockerVolume extends Volume {
  data: {
    Labels: { [key: string]: string };
    Mountpoint: string;
    Name: string;
  };
}

export interface DockerContainer extends Container {
  State?: {
    Running?: boolean;
    Paused?: boolean;
  };
}

export interface DockerNetwork extends Network {
  data: {
    Name: string;
    Id: string;
  };
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

  private getVolumeName(instance: Instance | number, name: string): string {
    return this.getContainerName(instance) + '-' + name;
  }

  private async getImageLabel(label: string): Promise<string | undefined> {
    const status = (await this.client.image.get(this.instanceProps.image).status()) as DockerImage;
    return status.data.Config.Labels[label];
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
    if (forceRestart && await this.getContainer(instance))
      await this.stopInstance(instance);

    const containerName: string = this.getContainerName(instance);

    const volumes: { [key: string]: string } = await this.createInstanceVolumes(instance);
    const binds: string[] = Object.entries(volumes).map(([name, mountPath]) => `${name}:${mountPath}`);

    const portMappings: { [key: number]: number } = this.parsePortsString(await this.getImageLabel(`${labelPrefix}.${instanceLabelPrefix}.ports`) ?? '', instance);
    let portBindings: { [key: string]: { HostPort: string }[] } = {};
    for (const portMapping in portMappings)
      portBindings = {
       ...portBindings,
        [`${portMapping}/tcp`]: [{ HostPort: String(portMappings[portMapping]) }]
      };

    const container: DockerContainer = await this.client.container.create({
      Image: this.instanceProps.image,
      Tty: true,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      StdinOnce: false,
      Labels: {
        [`${labelPrefix}.${controllerLabelPrefix}.service-name`]: this.controller.serviceName
      },
      Env: [
        `${instanceIdEnvVarName}=${instance.id}`,
        `${instanceDatabaseEnvVarName}=${this.controller.database.url}`
      ],
      HostConfig: {
        Binds: binds,
        NetworkMode: 'bridge',
        PortBindings: portBindings
      },
      Hostname: containerName,
      ExposedPorts: {
        [instance.socketPort]: {}
      }
    });

    await container.rename({ name: containerName });
    await container.start();

    await Promise.all([
      (async() => {
        for (const networkKey in networks)
          await this.client.network.get(networkKey).connect({
            Container: container.id,
            EndpointConfig: {
              Aliases: [containerName]
            }
          });
      })(),

      this.controller.updateInstanceSocketHostname(instance, containerName, autoReconnect)
    ]);

    return container;
  }

  private evalLabelString(labelString: string, instance: Instance): string {
    return labelString.replace(/{([^}]+)}/g, (_, expression: string) =>
      eval(expression.trim().replace(/id/g, () => instance.id.toString())));
  }

  private parseVolumesString(volumesString: string, instance: Instance): { [key: string]: string } {
    return volumesString.split(';').reduce((volumes, volume) => {
      const [name, mountPath] = volume.split(':');
      volumes[this.evalLabelString(name, instance)] = this.evalLabelString(mountPath, instance);
      return volumes;
    }, {} as { [key: string]: string });
  }

  private parsePortsString(portsString: string, instance: Instance): { [key: number]: number } {
    return portsString.split(';').reduce((portMappings, portMapping) => {
      const [hstPort, srcPort] = portMapping.split(':');
      portMappings[Number(this.evalLabelString(srcPort, instance))] = Number(this.evalLabelString(hstPort ?? srcPort, instance));
      return portMappings;
    }, {} as { [key: number]: number });
  }

  private async createInstanceVolumes(instance: Instance): Promise<{ [key: string]: string }> {
    const volumesString = await this.getImageLabel(`${labelPrefix}.${instanceLabelPrefix}.volumes`);
    if (!volumesString) return {};

    const namedVolumes: { [key: string]: string } = {};
    const imageVolumes: { [key: string]: string } = this.parseVolumesString(volumesString, instance);
    if (Object.keys(imageVolumes).length > 0) {

      const volumes = ((await this.client.volume.list()) as DockerVolume[])
        .filter(volume => volume?.data?.Labels && volume.data.Labels[`${labelPrefix}.${volumeLabelPrefix}.service-name`] === this.controller.serviceName);

      for (const name in imageVolumes) {
        const volumeName = this.getVolumeName(instance, name);
        namedVolumes[volumeName] = imageVolumes[name];

        if (!volumes.some(volume => volume.data.Name === volumeName))
          await this.client.volume.create({
            Name: volumeName,
            Labels: {
              [`${labelPrefix}.${volumeLabelPrefix}.service-name`]: this.controller.serviceName
            }
          });
      }
    }

    return namedVolumes;
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
    return !!container;
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