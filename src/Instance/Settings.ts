import { Instance } from '.';
import { Setting, SettingValueType, SettingValueTypeType } from './class/Setting';

export class Settings {
  readonly table: string = 'InstanceSettings';

  private readonly instance: Instance;
  private settings: Setting[] = [];

  constructor(instance: Instance) {
    this.instance = instance;
  }

  async init(): Promise<void> {
    await this.instance.connection.query(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          id          INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
          instance_id INT UNSIGNED NOT NULL,
          name        VARCHAR(255) NOT NULL,
          value       TEXT         NOT NULL DEFAULT '',
          type        CHAR(3)      NOT NULL,
          min         INT UNSIGNED     NULL,
          max         INT UNSIGNED     NULL,
          FOREIGN KEY (instance_id) REFERENCES ${this.instance.table} (id),
          UNIQUE INDEX instance_setting (instance_id, name)
        )
      `);
    await this.fetchSettings();
  }

  private async loadSettings(): Promise<Setting[]> {
    return (await this.instance.connection.execute(`
        SELECT name, value, type, min, max
        FROM ${this.table}
        WHERE instance_id = ?`,
      [this.instance.id]
    ) as unknown as Setting[]).map(({ name, value, type, min, max }) =>
      new Setting(name, value, type, min, max));
  }

  async fetchSettings(): Promise<Setting[]> {
    return this.settings = await this.loadSettings();
  }

  private async getSettingId(name: string): Promise<number | undefined> {
    return (await this.instance.connection.execute(`
        SELECT id
        FROM ${this.table}
        WHERE instance_id = ?
        AND name = ?`,
      [this.instance.id, name]
    ) as unknown as { id: number }[])[0]?.id;
  }

  getSetting(
    name: string
  ): Setting | undefined {
    return this.settings.find(setting => setting.name === name);
  }

  async updateSetting(
    setting: Setting | string,
    settingValue?: SettingValueType,
    settingType?: SettingValueTypeType,
    settingMin?: number,
    settingMax?: number
  ): Promise<Setting> {
    let thisSetting: Setting;
    if (setting instanceof Setting) thisSetting = setting as Setting;
    else if (typeof setting as unknown === 'string' && settingValue !== undefined) {
      const loadedSetting = await this.getSetting(setting);
      thisSetting = new Setting(
        setting, settingValue, settingType,
        settingMin === undefined ? loadedSetting?.min : settingMin,
        settingMax === undefined ? loadedSetting?.max : settingMax
      );
    } else throw new Error('invalid params');

    const settingId = await this.getSettingId(thisSetting.name);

    if (settingId)
      await this.instance.connection.execute(`
          UPDATE ${this.table}
          SET instance_id = ?, name = ?, value = ?, type = ?, min = ?, max = ?
          WHERE id = ?
        `, [this.instance.id, thisSetting.name, thisSetting.valueString, thisSetting.type, thisSetting.min, thisSetting.max, settingId]
      );
    else
      await this.instance.connection.execute(`
          INSERT INTO ${this.table} (instance_id, name, value, type, min, max)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [this.instance.id, thisSetting.name, thisSetting.valueString, thisSetting.type, thisSetting.min, thisSetting.max]
      );

    const settingsIndex = this.settings.findIndex(_setting => _setting.name === thisSetting.name);
    if (settingsIndex === -1) this.settings.push(thisSetting);
    else this.settings[settingsIndex] = thisSetting;

    return thisSetting;
  }

  async deleteSetting(
    setting: Setting | string
  ) {
    const settingName = setting instanceof Setting ? setting.name : setting;

    await this.instance.connection.execute(
      `DELETE FROM ${this.table} WHERE instance_id = ? AND name = ?`,
      [this.instance.id, settingName]
    );
    this.settings = this.settings.filter(({ name }) => name !== settingName);
  }
}