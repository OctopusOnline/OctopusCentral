import { Instance } from './Instance';
export interface Setting {
    name: string;
    value: SettingValueType;
    type: SettingValueTypeType;
    min: number | null;
    max: number | null;
}
export type SettingValueType = string | number | boolean | null;
export type SettingValueTypeType = 'str' | 'num' | 'bol' | 'nul';
export declare class InstanceSettings {
    #private;
    constructor(instance: Instance);
    getSetting(name: string): Promise<Setting>;
    updateSetting(name: string, value: SettingValueType, type: SettingValueTypeType, min: number | null, max: number | null): Promise<Setting>;
    deleteSetting(name: string): Promise<true | undefined>;
}
