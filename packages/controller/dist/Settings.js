"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const types_1 = require("@octopuscentral/types");
const instance_1 = require("@octopuscentral/instance");
class Settings {
    constructor(instance, controller) {
        this.instance = instance;
        this.controller = controller;
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const settingsResult = (yield this.controller.database.connection.query(`
        SELECT name, value, type, min, max FROM ${types_1.instanceSettingsTableName}
        WHERE instance_id = ?
      `, [this.instance.id]));
            return settingsResult.map(settingResult => new instance_1.Setting(settingResult.name, settingResult.value, settingResult.type, settingResult.min === null ? undefined : settingResult.min, settingResult.max === null ? undefined : settingResult.max));
        });
    }
    get(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const settingResult = (yield this.controller.database.connection.query(`
        SELECT name, value, type, min, max FROM ${types_1.instanceSettingsTableName}
        WHERE instance_id = ? AND name = ?
      `, [this.instance.id, name]))[0];
            if (!settingResult)
                throw new Error(`Setting ${name} for Instance ${this.instance.id} not found`);
            return new instance_1.Setting(settingResult.name, settingResult.value, settingResult.type, settingResult.min === null ? undefined : settingResult.min, settingResult.max === null ? undefined : settingResult.max);
        });
    }
    set(name, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield this.get(name);
            const setting = new instance_1.Setting(existing.name, value, existing.type, existing.min, existing.max);
            const result = yield this.controller.database.connection.query(`
        UPDATE ${types_1.instanceSettingsTableName}
        SET value = ?, type = ?, min = ?, max = ?
        WHERE instance_id = ? AND name = ?
      `, [
                setting.value === null ? null : String(existing.value),
                setting.type,
                setting.min,
                setting.max,
                this.instance.id,
                setting.name
            ]);
            if (result.affectedRows === 0)
                throw new Error(`Failed to set Setting ${name} for Instance ${this.instance.id}`);
            return setting;
        });
    }
}
exports.Settings = Settings;
//# sourceMappingURL=Settings.js.map