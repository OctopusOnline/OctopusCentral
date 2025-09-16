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
var _Instance_socket, _Instance_status;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = void 0;
const node_events_1 = __importDefault(require("node:events"));
const socket_io_client_1 = require("socket.io-client");
const helper_1 = require("./helper");
class Instance extends node_events_1.default {
    get socket() { return __classPrivateFieldGet(this, _Instance_socket, "f"); }
    get connected() { return !!__classPrivateFieldGet(this, _Instance_socket, "f"); }
    get status() { return __classPrivateFieldGet(this, _Instance_status, "f"); }
    constructor(id, socketHostname, socketPort = 1777) {
        super();
        this.socketProtocol = 'http';
        _Instance_socket.set(this, void 0);
        _Instance_status.set(this, void 0);
        this.id = id;
        this.socketHostname = socketHostname;
        this.socketPort = socketPort;
    }
    connect() {
        return __awaiter(this, arguments, void 0, function* (reconnect = false) {
            if (!this.socketProtocol || !this.socketHostname || !this.socketPort)
                return false;
            if (this.connected && reconnect)
                this.disconnect();
            const socket = (0, socket_io_client_1.io)(`${this.socketProtocol}://${this.socketHostname}:${this.socketPort}`, {
                reconnection: true,
                reconnectionAttempts: Infinity
            });
            __classPrivateFieldSet(this, _Instance_socket, socket, "f");
            const connectResult = yield new Promise((resolve => {
                socket.once('connect', () => {
                    this.emit('socket connected');
                    resolve();
                });
                socket.once('connect_error', error => {
                    this.emit('socket connect_error', error);
                    resolve(error);
                });
            }));
            if (connectResult instanceof Error) {
                __classPrivateFieldSet(this, _Instance_socket, undefined, "f");
                return connectResult;
            }
            const bootHandler = (message, resetTimeout) => this.emit('boot status', message, resetTimeout);
            const bootedHandler = (success, resetTimeout) => this.emit('boot status booted', success, resetTimeout);
            const statusHandler = (status) => {
                if (!__classPrivateFieldGet(this, _Instance_status, "f") || status.timestamp > __classPrivateFieldGet(this, _Instance_status, "f").timestamp) {
                    __classPrivateFieldSet(this, _Instance_status, status, "f");
                    this.emit('status update', __classPrivateFieldGet(this, _Instance_status, "f"));
                }
            };
            __classPrivateFieldGet(this, _Instance_socket, "f").on('boot status', bootHandler);
            __classPrivateFieldGet(this, _Instance_socket, "f").on('boot status booted', bootedHandler);
            __classPrivateFieldGet(this, _Instance_socket, "f").on('status', statusHandler);
            __classPrivateFieldGet(this, _Instance_socket, "f").on('disconnect', () => {
                __classPrivateFieldGet(this, _Instance_socket, "f").off('boot status', bootHandler);
                __classPrivateFieldGet(this, _Instance_socket, "f").off('boot status booted', bootedHandler);
                __classPrivateFieldGet(this, _Instance_socket, "f").off('status', statusHandler);
            });
            return true;
        });
    }
    sendStartPermission() {
        return __awaiter(this, arguments, void 0, function* (timeout = 6e4) {
            let startPermissionReceived = undefined;
            const self = this;
            yield Promise.all([
                (0, helper_1.waitFor)(() => {
                    var _a;
                    if (startPermissionReceived)
                        return true;
                    (_a = self.socket) === null || _a === void 0 ? void 0 : _a.emit('start permission');
                    return false;
                }, timeout / 200),
                Promise.race([
                    (0, helper_1.waitFor)(() => {
                        var _a;
                        (_a = self.socket) === null || _a === void 0 ? void 0 : _a.once('start permission received', () => startPermissionReceived = true);
                        return startPermissionReceived;
                    }, timeout / 60),
                    (0, helper_1.sleep)(timeout).then(() => {
                        if (startPermissionReceived === undefined)
                            startPermissionReceived = false;
                    })
                ])
            ]);
            return startPermissionReceived;
        });
    }
    disconnect() {
        if (__classPrivateFieldGet(this, _Instance_socket, "f")) {
            __classPrivateFieldGet(this, _Instance_socket, "f").close();
            __classPrivateFieldSet(this, _Instance_socket, undefined, "f");
            this.emit('socket disconnected');
        }
    }
}
exports.Instance = Instance;
_Instance_socket = new WeakMap(), _Instance_status = new WeakMap();
//# sourceMappingURL=Instance.js.map