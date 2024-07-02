import { SettingValueType, SettingValueTypeType, Setting as SettingInterface } from '@octopuscentral/types';
export declare class Setting implements SettingInterface {
    readonly name: string;
    readonly value: SettingValueType;
    readonly type: SettingValueTypeType;
    readonly min?: number;
    readonly max?: number;
    constructor(name: string, value: SettingValueType, type?: SettingValueTypeType, min?: number, max?: number);
    get valueString(): string;
}
