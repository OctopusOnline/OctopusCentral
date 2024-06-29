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
const socket_io_client_1 = require("socket.io-client");
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
            const socket = (0, socket_io_client_1.io)(this.socketHost);
            __classPrivateFieldSet(this, _Controller_socket, socket, "f");
            const _this = this;
            if (!(yield new Promise((resolve => {
                socket.once('connect', () => {
                    _this.emit('socket connect');
                    resolve(true);
                });
                socket.once('connect_error', error => {
                    _this.emit('socket connect_error', error);
                    resolve(false);
                });
            })))) {
                _this.disconnect();
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
}
exports.Controller = Controller;
_Controller_socket = new WeakMap();
//# sourceMappingURL=Controller.js.map