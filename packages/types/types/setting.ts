export type SettingValueType = string | number | boolean | null;
export type SettingValueTypeType = 'str' | 'num' | 'bol' | 'nul';

export interface Setting {
  name: string,
  value: SettingValueType,
  type?: SettingValueTypeType,
  min?: number,
  max?: number
}

export type SettingsArrayType = { [key: string]: SettingValueType };