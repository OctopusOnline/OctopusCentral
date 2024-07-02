import { SettingValueType, SettingValueTypeType, Setting as SettingInterface } from '@octopuscentral/types';

export class Setting implements SettingInterface {
  readonly name: string;
  readonly value: SettingValueType;
  readonly type: SettingValueTypeType;
  readonly min?: number;
  readonly max?: number;

  constructor(name: string, value: SettingValueType, type?: SettingValueTypeType, min?: number, max?: number) {
    if (type !== undefined) this.type = type;
    else if        (value as unknown === null)      this.type = 'nul';
    else if (typeof value as unknown === 'string')  this.type = 'str';
    else if (typeof value as unknown === 'number')  this.type = 'num';
    else if (typeof value as unknown === 'boolean') this.type = 'bol';
    else throw new Error(`unknown type '${type}' for setting '${name}' with value '${value}'`);

    switch (this.type) {
      case 'str': this.value = String(value);    break;
      case 'num': this.value = Number(value);    break;
      case 'bol': this.value = value === 'true'; break;
      case 'nul': this.value = null;             break;
    }

    this.name = name;
    this.min = min;
    this.max = max;
  }

  get valueString(): string {
    return String(this.value);
  }
}