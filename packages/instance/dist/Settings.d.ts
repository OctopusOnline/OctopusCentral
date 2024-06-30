import EventEmitter from 'node:events';
import { Instance } from '.';
import { Setting, SettingValueType, SettingValueTypeType } from './Setting';
export declare class Settings extends EventEmitter {
    readonly table: string;
    private readonly instance;
    private settings;
    constructor(instance: Instance);
    init(): Promise<void>;
    private loadSettings;
    fetchSettings(): Promise<Setting[]>;
    private getSettingId;
    getSetting(name: string): Setting | undefined;
    updateSetting(setting: Setting | string, settingValue?: SettingValueType, settingType?: SettingValueTypeType, settingMin?: number, settingMax?: number): Promise<Setting>;
    deleteSetting(setting: Setting | string): Promise<void>;
}
