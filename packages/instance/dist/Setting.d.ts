import { SettingValueType, SettingValueTypeType } from '@octopuscentral/types';
export declare class Setting {
    readonly name: string;
    readonly value: SettingValueType;
    readonly type: SettingValueTypeType;
    readonly min: number | null;
    readonly max: number | null;
    constructor(name: string, value: SettingValueType, type?: SettingValueTypeType, min?: number | null, max?: number | null);
    get valueString(): string;
}
