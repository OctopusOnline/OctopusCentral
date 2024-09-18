import { DockerClientProps, DockerInstanceProps } from '@octopuscentral/types';
import { Image } from 'node-docker-api/lib/image';
import { Volume } from 'node-docker-api/lib/volume';
import { Container } from 'node-docker-api/lib/container';
import { Network } from 'node-docker-api/lib/network';
import { Controller } from './index';
import { Instance } from './Instance';
export interface DockerImage extends Image {
    data: {
        Config: {
            Labels: {
                [key: string]: string;
            };
        };
    };
}
export interface DockerVolume extends Volume {
    data: {
        Labels: {
            [key: string]: string;
        };
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
    NetworkID: string;
}
export declare class Docker {
    #private;
    private readonly controller;
    private readonly client;
    readonly clientProps: DockerClientProps;
    readonly instanceProps: DockerInstanceProps;
    get connected(): Promise<boolean>;
    constructor(controller: Controller, instanceProps: DockerInstanceProps);
    init(): Promise<void>;
    private getContainerName;
    private getVolumeName;
    private getImageLabel;
    private getContainer;
    private getContainerNetwork;
    private fetchSelfContainer;
    private startInstanceContainer;
    private parseVolumesString;
    private createInstanceVolumes;
    private parsePortsString;
    instanceRunning(instance: Instance): Promise<boolean>;
    instancePaused(instance: Instance): Promise<boolean | undefined>;
    startInstance(instance: Instance): Promise<boolean>;
    stopInstance(instance: Instance): Promise<boolean>;
    pauseInstance(instance: Instance): Promise<boolean>;
    unpauseInstance(instance: Instance): Promise<boolean>;
}
