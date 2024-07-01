import { Setting, SettingValueType, SettingValueTypeType } from '@octopuscentral/types';
import { Instance } from './Instance';
export declare class InstanceSettings {
    #private;
    constructor(instance: Instance);
    getSetting(name: string): Promise<Setting>;
    updateSetting(name: string, value: SettingValueType, type: SettingValueTypeType, min: number | null, max: number | null): Promise<Setting>;
    deleteSetting(name: string): Promise<true | undefined>;
}
