"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Setting = void 0;
class Setting {
    constructor(name, value, type, min, max) {
        if (type !== undefined)
            this.type = type;
        else if ([undefined, null].includes(value))
            this.type = 'nul';
        else if (typeof value === 'string')
            this.type = 'str';
        else if (typeof value === 'number')
            this.type = 'num';
        else if (typeof value === 'boolean')
            this.type = 'bol';
        else
            throw new Error(`unknown type '${type}' for setting '${name}' with value '${value}'`);
        switch (this.type) {
            case 'str':
                this.value = String(value);
                break;
            case 'num':
                this.value = Number(value);
                break;
            case 'bol':
                this.value = String(value) === 'true';
                break;
            case 'nul':
                this.value = null;
                break;
        }
        this.name = name;
        this.min = min;
        this.max = max;
    }
    get valueString() {
        return String(this.value);
    }
}
exports.Setting = Setting;
//# sourceMappingURL=Setting.js.map