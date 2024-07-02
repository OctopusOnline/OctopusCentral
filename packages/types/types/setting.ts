export interface Setting {
  name: string,
  value: SettingValueType,
  type?: SettingValueTypeType,
  min?: number,
  max?: number
}

export type SettingValueType = string | number | boolean | null;
export type SettingValueTypeType = 'str' | 'num' | 'bol' | 'nul';