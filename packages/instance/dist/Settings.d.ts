import { Setting as SettingInterface, SettingsObjectType, SettingValueType, SettingValueTypeType } from '@octopuscentral/types';
import EventEmitter from 'node:events';
import { Instance } from '.';
import { Setting } from './Setting';
export declare class Settings extends EventEmitter {
    readonly table: string;
    private readonly instance;
    private settings;
    constructor(instance: Instance);
    init(): Promise<void>;
    initDefaultSettings(settings?: SettingInterface[] | SettingsObjectType): Promise<void>;
    private loadSettings;
    fetchSettings(): Promise<Setting[]>;
    private getSettingId;
    getSetting(name: string): Setting | undefined;
    getSettingValue(name: string): SettingValueType | undefined;
    getSettingStrValue(name: string): string | undefined;
    getSettingNumValue(name: string): number | undefined;
    getSettingBolValue(name: string): boolean | undefined;
    getSettingStrValueF(name: string): string;
    getSettingNumValueF(name: string): number;
    getSettingBolValueF(name: string): boolean;
    updateSetting(setting: Setting | string, settingValue?: SettingValueType, settingType?: SettingValueTypeType, settingMin?: number, settingMax?: number, overwrite?: boolean): Promise<Setting>;
    deleteSetting(setting: Setting | string): Promise<void>;
}
