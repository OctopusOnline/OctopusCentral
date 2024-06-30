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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const InstanceSettings_1 = require("./InstanceSettings");
class Instance {
    constructor(controller, id) {
        this.controller = controller;
        this.id = id;
        this.settings = new InstanceSettings_1.InstanceSettings(this);
    }
    _request(command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.controller.connected)
                return;
            const sessionId = node_crypto_1.default.randomBytes(16).toString('hex').toUpperCase();
            this.controller.socket.emit('request instance', sessionId, this.id, command, args);
            return yield this.listenForResponse(sessionId);
        });
    }
    listenForResponse(sessionId) {
        return new Promise(resolve => {
            if (!this.controller.connected)
                resolve({ code: 408, data: undefined });
            else
                this.controller.socket.once('response instance', (code, _sessionId, data) => __awaiter(this, void 0, void 0, function* () {
                    return resolve(_sessionId === sessionId
                        ? { code, data }
                        : yield this.listenForResponse(sessionId));
                }));
        });
    }
    _requestData(command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this._request(command, args);
            return !response || response.code !== 200 ? undefined : response.data;
        });
    }
}
exports.Instance = Instance;
//# sourceMappingURL=Instance.js.map