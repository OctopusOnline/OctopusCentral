import { Controller } from './Controller';
import { InstanceSettings } from './InstanceSettings';
export declare class Instance {
    readonly controller: Controller;
    readonly id: number;
    readonly settings: InstanceSettings;
    constructor(controller: Controller, id: number);
    _request(command: string, args?: any): Promise<{
        code: number;
        data: any;
    } | undefined>;
    private listenForResponse;
    _requestData(command: string, args?: any): Promise<any | undefined>;
}
