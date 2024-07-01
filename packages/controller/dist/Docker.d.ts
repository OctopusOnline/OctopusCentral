import { Container as DockerContainer } from 'node-docker-api/lib/container';
import { Network as DockerNetwork } from 'node-docker-api/lib/network';
import { Controller } from './index';
import { Instance } from './Instance';
export interface DockerClientProps {
    socketPath: string;
}
export interface DockerInstanceProps {
    image: string;
}
export interface Container extends DockerContainer {
}
export interface Network extends DockerNetwork {
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
}
