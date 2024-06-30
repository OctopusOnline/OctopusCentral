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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _InstanceSettings_instance;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceSettings = void 0;
class InstanceSettings {
    constructor(instance) {
        _InstanceSettings_instance.set(this, void 0);
        __classPrivateFieldSet(this, _InstanceSettings_instance, instance, "f");
    }
    getSetting(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __classPrivateFieldGet(this, _InstanceSettings_instance, "f")._requestData('setting get', { name });
        });
    }
    updateSetting(name, value, type, min, max) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __classPrivateFieldGet(this, _InstanceSettings_instance, "f")._requestData('setting update', { name, value, type, min, max });
        });
    }
    deleteSetting(name) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return ((_a = (yield __classPrivateFieldGet(this, _InstanceSettings_instance, "f")._request('setting delete', { name }))) === null || _a === void 0 ? void 0 : _a.code) === 200 ? true : undefined;
        });
    }
}
exports.InstanceSettings = InstanceSettings;
_InstanceSettings_instance = new WeakMap();
//# sourceMappingURL=InstanceSettings.js.map