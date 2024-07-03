export declare const tableName: string;
export type SettingValueType = string | number | boolean | null;
export type SettingValueTypeType = 'str' | 'num' | 'bol' | 'nul';
export interface Setting {
    name: string;
    value: SettingValueType;
    type?: SettingValueTypeType;
    min?: number;
    max?: number;
}
export type SettingsObjectType = {
    [key: string]: SettingValueType;
};
