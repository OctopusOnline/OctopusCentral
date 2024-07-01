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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Controller_socket;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = void 0;
const node_events_1 = __importDefault(require("node:events"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const socket_io_client_1 = require("socket.io-client");
const Instance_1 = require("./Instance");
class Controller extends node_events_1.default {
    get socket() { return __classPrivateFieldGet(this, _Controller_socket, "f"); }
    get connected() { return !!__classPrivateFieldGet(this, _Controller_socket, "f"); }
    constructor(id, socketHost) {
        super();
        _Controller_socket.set(this, void 0);
        this.id = id;
        this.socketHost = socketHost;
    }
    connect() {
        return __awaiter(this, arguments, void 0, function* (reconnect = false) {
            if (!this.socketHost)
                return false;
            if (this.connected && reconnect)
                yield this.disconnect();
            const socket = (0, socket_io_client_1.io)(this.socketHost, {
                reconnection: true,
                reconnectionAttempts: Infinity
            });
            __classPrivateFieldSet(this, _Controller_socket, socket, "f");
            if (!(yield new Promise((resolve => {
                socket.once('connect', () => {
                    this.emit('socket connect');
                    resolve(true);
                });
                socket.once('connect_error', error => {
                    this.emit('socket connect_error', error);
                    resolve(false);
                });
            })))) {
                this.disconnect();
                return false;
            }
            return true;
        });
    }
    disconnect() {
        if (__classPrivateFieldGet(this, _Controller_socket, "f")) {
            __classPrivateFieldGet(this, _Controller_socket, "f").close();
            __classPrivateFieldSet(this, _Controller_socket, undefined, "f");
        }
    }
    _request(command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.connected)
                return;
            const sessionId = node_crypto_1.default.randomBytes(16).toString('hex').toUpperCase();
            __classPrivateFieldGet(this, _Controller_socket, "f").emit('request controller', sessionId, command, args);
            return yield this.listenForResponse(sessionId);
        });
    }
    listenForResponse(sessionId) {
        return new Promise(resolve => {
            if (!this.connected)
                resolve({ code: 408, data: undefined });
            else
                __classPrivateFieldGet(this, _Controller_socket, "f").once('response controller', (code, _sessionId, data) => __awaiter(this, void 0, void 0, function* () {
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
    getServiceName() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('get serviceName');
        });
    }
    getInstances() {
        return __awaiter(this, void 0, void 0, function* () {
            const instances = yield this._requestData('get instances', { values: ['id'] });
            return instances === null || instances === void 0 ? void 0 : instances.map(({ id }) => new Instance_1.Instance(this, id));
        });
    }
    fetchInstances() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return ((_a = (yield this._request('fetch instances'))) === null || _a === void 0 ? void 0 : _a.code) === 200 ? true : undefined;
        });
    }
    dockerGetClientProps() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker get clientProps');
        });
    }
    dockerGetInstanceProps() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker get instanceProps');
        });
    }
    dockerStartInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker start instance', { id: instance.id });
        });
    }
    dockerStopInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker stop instance', { id: instance.id });
        });
    }
    dockerPauseInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker pause instance', { id: instance.id });
        });
    }
    dockerUnpauseInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker unpause instance', { id: instance.id });
        });
    }
    dockerInstancePaused(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._requestData('docker instance paused', { id: instance.id });
        });
    }
}
exports.Controller = Controller;
_Controller_socket = new WeakMap();
//# sourceMappingURL=Controller.js.map