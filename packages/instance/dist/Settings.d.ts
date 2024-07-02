import { Setting as SettingInterface, SettingValueType, SettingValueTypeType } from '@octopuscentral/types';
import EventEmitter from 'node:events';
import { Instance } from '.';
import { Setting } from './Setting';
export declare class Settings extends EventEmitter {
    readonly table: string;
    private readonly instance;
    private settings;
    constructor(instance: Instance);
    init(): Promise<void>;
    initSettings(settings?: SettingInterface[]): Promise<void>;
    private loadSettings;
    fetchSettings(): Promise<Setting[]>;
    private getSettingId;
    getSetting(name: string): Setting | undefined;
    updateSetting(setting: Setting | string, settingValue?: SettingValueType, settingType?: SettingValueTypeType, settingMin?: number, settingMax?: number, overwrite?: boolean): Promise<Setting>;
    deleteSetting(setting: Setting | string): Promise<void>;
}
