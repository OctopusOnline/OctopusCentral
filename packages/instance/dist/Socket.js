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
var _Socket_instances, _Socket_port, _Socket_startPermission, _Socket_statusQueue, _Socket_sendStatusQueue;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socket = void 0;
const helper_1 = require("./helper");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
class Socket {
    get port() { return __classPrivateFieldGet(this, _Socket_port, "f"); }
    get running() { return this.server.listening; }
    set port(port) {
        if (typeof port !== 'number')
            throw new Error('port must be a number');
        if (port <= 0)
            throw new Error('port must be greater than zero');
        if (port > 65535)
            throw new Error('port must be smaller than 65535');
        __classPrivateFieldSet(this, _Socket_port, port, "f");
    }
    constructor(instance, server = http_1.default.createServer((0, express_1.default)()), port = 1777) {
        _Socket_instances.add(this);
        _Socket_port.set(this, void 0);
        _Socket_startPermission.set(this, false);
        _Socket_statusQueue.set(this, []);
        this.instance = instance;
        this.server = server;
        this.io = new socket_io_1.Server(this.server);
        __classPrivateFieldSet(this, _Socket_port, port, "f");
        this.setupSocketHandlers();
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => this.server.listen(this.port, () => resolve(this)));
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => this.server.close(() => resolve(this)));
        });
    }
    awaitStartPermission() {
        return __awaiter(this, arguments, void 0, function* (timeout = 6e4) {
            return yield (0, helper_1.waitFor)(() => __classPrivateFieldGet(this, _Socket_startPermission, "f"), timeout / 200);
        });
    }
    sendBootStatus(messageOrBooted, resetTimeout = true) {
        this.io.emit(typeof messageOrBooted === 'boolean'
            ? 'boot status booted'
            : 'boot status', messageOrBooted, resetTimeout);
    }
    getStatus(timestamp) {
        return __classPrivateFieldGet(this, _Socket_statusQueue, "f").find(status => status.timestamp === timestamp);
    }
    sendStatus(status) {
        __classPrivateFieldGet(this, _Socket_statusQueue, "f").push(Object.assign(Object.assign({}, status), { timestamp: Date.now() }));
        __classPrivateFieldGet(this, _Socket_instances, "m", _Socket_sendStatusQueue).call(this);
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            socket.on('start permission', () => {
                __classPrivateFieldSet(this, _Socket_startPermission, true, "f");
                this.io.emit('start permission received');
            });
            socket.on('status received', (timestamps) => {
                for (const timestamp of timestamps) {
                    const index = __classPrivateFieldGet(this, _Socket_statusQueue, "f").findIndex(status => status.timestamp === timestamp);
                    if (index > -1)
                        __classPrivateFieldGet(this, _Socket_statusQueue, "f").splice(index, 1);
                }
            });
            socket.on('request', (sessionId, command, args) => __awaiter(this, void 0, void 0, function* () {
                switch (command) {
                    case 'setting get':
                        socket.emit('response', 200, sessionId, this.instance.settings.getSetting(args.name));
                        break;
                    case 'setting update':
                        socket.emit('response', 200, sessionId, yield this.instance.settings.updateSetting(args.name, args.value, args.type, args.min, args.max));
                        break;
                    case 'setting delete':
                        yield this.instance.settings.deleteSetting(args.name);
                        socket.emit('response', 200, sessionId);
                        break;
                    default:
                        socket.emit('response', 404, sessionId);
                }
            }));
            socket.on('disconnect', () => {
                socket.removeAllListeners();
            });
            __classPrivateFieldGet(this, _Socket_instances, "m", _Socket_sendStatusQueue).call(this);
        });
    }
}
exports.Socket = Socket;
_Socket_port = new WeakMap(), _Socket_startPermission = new WeakMap(), _Socket_statusQueue = new WeakMap(), _Socket_instances = new WeakSet(), _Socket_sendStatusQueue = function _Socket_sendStatusQueue() {
    console.log('emit status', __classPrivateFieldGet(this, _Socket_statusQueue, "f"));
    if (__classPrivateFieldGet(this, _Socket_statusQueue, "f").length > 0)
        this.io.emit('status', __classPrivateFieldGet(this, _Socket_statusQueue, "f"));
};
//# sourceMappingURL=Socket.js.map