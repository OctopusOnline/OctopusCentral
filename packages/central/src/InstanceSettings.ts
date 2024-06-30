import { Instance } from './Instance';

export interface Setting {
  name: string,
  value: SettingValueType,
  type: SettingValueTypeType,
  min: number | null,
  max: number | null
}

export type SettingValueType = string | number | boolean | null;
export type SettingValueTypeType = 'str' | 'num' | 'bol' | 'nul';

export class InstanceSettings {
  #instance: Instance;

  constructor(instance: Instance) {
    this.#instance = instance;
  }

  async getSetting(name: string): Promise<Setting> {
    return await this.#instance._requestData('setting get', { name });
  }

  async updateSetting(
    name: string,
    value: SettingValueType,
    type: SettingValueTypeType,
    min: number | null,
    max: number | null
  ): Promise<Setting> {
    return await this.#instance._requestData('setting update', { name, value, type, min, max });
  }

  async deleteSetting(name: string): Promise<true | undefined> {
    return (await this.#instance._request('setting delete', { name }))?.code === 200 ? true : undefined
  }
}