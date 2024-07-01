import { DockerClientProps, DockerInstanceProps } from '@octopuscentral/types';
import { Container } from 'node-docker-api/lib/container';
import { Network } from 'node-docker-api/lib/network';
import { Controller } from './index';
import { Instance } from './Instance';
export interface DockerContainer extends Container {
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
    private getContainer;
    private getContainerNetwork;
    private fetchSelfContainer;
    private startInstanceContainer;
    startInstance(instance: Instance): Promise<boolean>;
    stopInstance(instance: Instance): Promise<boolean>;
    pauseInstance(instance: Instance): Promise<boolean>;
    unpauseInstance(instance: Instance): Promise<boolean>;
}
