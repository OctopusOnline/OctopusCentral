import { instanceSettingsTableName, SettingValueTypeType } from '@octopuscentral/types';
import { Setting } from '@octopuscentral/instance'
import { Controller } from './index';
import { Instance } from './Instance';

export class Settings {
  private readonly instance: Instance;
  private readonly controller: Controller;

  constructor(instance: Instance, controller: Controller) {
    this.instance = instance;
    this.controller = controller;
  }

  async getAll(): Promise<Setting[]> {
    const settingsResult = (await this.controller.database.connection.query(`
        SELECT name, value, type, min, max FROM ${instanceSettingsTableName}
        WHERE instance_id = ?
      `, [this.instance.id])) as {
      name: string,
      value: string,
      type: SettingValueTypeType,
      min: number | null,
      max: number | null,
    }[];

    return settingsResult.map(settingResult => new Setting(
      settingResult.name,
      settingResult.value,
      settingResult.type,
      settingResult.min === null ? undefined : settingResult.min,
      settingResult.max === null ? undefined : settingResult.max
    ));
  }

  async get(name: string): Promise<Setting> {
    const settingResult = (await this.controller.database.connection.query(`
        SELECT name, value, type, min, max FROM ${instanceSettingsTableName}
        WHERE instance_id = ? AND name = ?
      `, [this.instance.id, name]))[0] as {
        name: string,
        value: string,
        type: SettingValueTypeType,
        min: number | null,
        max: number | null,
    };

    if (!settingResult)
      throw new Error(`Setting ${name} for Instance ${this.instance.id} not found`);

    return new Setting(
      settingResult.name,
      settingResult.value,
      settingResult.type,
      settingResult.min === null ? undefined : settingResult.min,
      settingResult.max === null ? undefined : settingResult.max
    );
  }

  async set(name: string, value: string): Promise<Setting> {
    const existing = await this.get(name);

    const setting = new Setting(
      existing.name,
      value,
      existing.type,
      existing.min,
      existing.max
    );

    const result = await this.controller.database.connection.query(`
        UPDATE ${instanceSettingsTableName}
        SET value = ?, type = ?, min = ?, max = ?
        WHERE instance_id = ? AND name = ?
      `, [
        setting.value === null ? null : String(existing.value),
        setting.type,
        setting.min,
        setting.max,
        this.instance.id,
        setting.name
      ]
    );

    if (result.affectedRows === 0)
      throw new Error(`Failed to set Setting ${name} for Instance ${this.instance.id}`);

    return setting;
  }
}