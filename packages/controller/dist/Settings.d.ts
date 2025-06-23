import { Setting } from '@octopuscentral/instance';
import { Controller } from './index';
import { Instance } from './Instance';
export declare class Settings {
    private readonly instance;
    private readonly controller;
    constructor(instance: Instance, controller: Controller);
    getAll(): Promise<Setting[]>;
    get(name: string): Promise<Setting>;
}
