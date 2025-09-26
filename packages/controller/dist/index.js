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
var _Controller_instances, _Controller_running, _Controller_runIntervalTimeout;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = exports.CLIClient = exports.Instance = exports.Socket = exports.Docker = void 0;
const types_1 = require("@octopuscentral/types");
const instance_1 = require("@octopuscentral/instance");
const node_events_1 = __importDefault(require("node:events"));
const CLIServer_1 = require("./CLIServer");
const Database_1 = require("./Database");
const helper_1 = require("./helper");
const Socket_1 = require("./Socket");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return Socket_1.Socket; } });
const Docker_1 = require("./Docker");
Object.defineProperty(exports, "Docker", { enumerable: true, get: function () { return Docker_1.Docker; } });
const Instance_1 = require("./Instance");
Object.defineProperty(exports, "Instance", { enumerable: true, get: function () { return Instance_1.Instance; } });
const CLIClient_1 = require("./CLIClient");
Object.defineProperty(exports, "CLIClient", { enumerable: true, get: function () { return CLIClient_1.CLIClient; } });
const fs_1 = require("fs");
const path_1 = require("path");
class Controller extends node_events_1.default {
    get instances() { return __classPrivateFieldGet(this, _Controller_instances, "f"); }
    get running() { return __classPrivateFieldGet(this, _Controller_running, "f"); }
    get version() {
        return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../package.json'), 'utf-8')).version;
    }
    constructor(serviceName, databaseUrl, instanceDockerProps) {
        super();
        this.instancesFetchInterval = 5000;
        _Controller_instances.set(this, []);
        _Controller_running.set(this, false);
        _Controller_runIntervalTimeout.set(this, void 0);
        this.serviceName = serviceName;
        this.database = new Database_1.Database(databaseUrl);
        this.docker = new Docker_1.Docker(this, instanceDockerProps);
        this.socket = new Socket_1.Socket(this);
        this.cli = new CLIServer_1.CLIServer(this);
    }
    addInstance(instance, overwrite = false) {
        if (!this.getInstance(instance.id))
            this.addAndSetupInstance(instance);
        else if (overwrite) {
            this.removeInstance(instance);
            this.addAndSetupInstance(instance);
        }
    }
    addAndSetupInstance(instance) {
        const instanceWithHandlers = instance;
        __classPrivateFieldGet(this, _Controller_instances, "f").push(instanceWithHandlers);
        instanceWithHandlers._connectedHandler = (error) => this.emit('instance socket connected', instance, error);
        instanceWithHandlers._disconnectedHandler = () => this.emit('instance socket disconnected', instance);
        instanceWithHandlers._statusHandler = (status) => {
            this.emit('instance status', instance, status);
            this.socket.sendStatus(instance.id, status);
        };
        instanceWithHandlers._restartMeHandler = (deadPromise) => __awaiter(this, void 0, void 0, function* () {
            this.emit('instance restartMe', instance);
            const virtualDeadInstance = new Instance_1.Instance(instance.id);
            yield deadPromise;
            yield (0, helper_1.sleep)(1e4);
            yield this.stopInstance(virtualDeadInstance);
            yield (0, helper_1.sleep)(1e4);
            yield this.startInstance(virtualDeadInstance, undefined, 12e4);
        });
        instanceWithHandlers.on('socket connected', instanceWithHandlers._connectedHandler);
        instanceWithHandlers.on('socket disconnected', instanceWithHandlers._disconnectedHandler);
        instanceWithHandlers.on('status received', instanceWithHandlers._statusHandler);
        instanceWithHandlers.on('restartMe', instanceWithHandlers._restartMeHandler);
    }
    get lastInstanceId() {
        return Math.max(0, ...__classPrivateFieldGet(this, _Controller_instances, "f").map(instance => instance.id));
    }
    createInstance() {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit('instance creating');
            yield this.fetchSyncInstances();
            const virtualInstance = new instance_1.Instance(this.database.url, this.lastInstanceId + 1);
            yield virtualInstance._initVirtual(this.serviceName, 'init');
            yield this.fetchSyncInstances();
            const instance = this.getInstance(virtualInstance.id);
            this.emit('instance created', instance);
            return instance;
        });
    }
    updateInstanceSettings(instance, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            if (settings.length === 0)
                return;
            const virtualInstance = new instance_1.Instance(this.database.url, instance.id);
            for (const setting of settings) {
                const virtualSetting = new instance_1.Setting(setting.name, setting.value, setting.type, setting.min, setting.max);
                yield virtualInstance.settings.updateSetting(virtualSetting);
            }
        });
    }
    getInstance(id) {
        return __classPrivateFieldGet(this, _Controller_instances, "f").find(_instance => _instance.id === id);
    }
    removeInstance(instance) {
        const index = __classPrivateFieldGet(this, _Controller_instances, "f").findIndex(_instance => _instance.id === instance.id);
        if (index !== -1) {
            const instanceWithHandlers = __classPrivateFieldGet(this, _Controller_instances, "f")[index];
            instanceWithHandlers.disconnect();
            instanceWithHandlers.off('socket connected', instanceWithHandlers._connectedHandler);
            instanceWithHandlers.off('socket disconnected', instanceWithHandlers._disconnectedHandler);
            instanceWithHandlers.off('status received', instanceWithHandlers._statusHandler);
            instanceWithHandlers.off('restartMe', instanceWithHandlers._restartMeHandler);
            __classPrivateFieldGet(this, _Controller_instances, "f").splice(index, 1);
        }
    }
    loadInstances() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.database.connection.query(`SELECT id, socketHostname FROM ${types_1.instancesTableName}`))
                .map(({ id, socketHostname }) => new Instance_1.Instance(id, socketHostname));
        });
    }
    fetchSyncInstances() {
        return __awaiter(this, void 0, void 0, function* () {
            const instances = yield this.loadInstances();
            for (const instance of __classPrivateFieldGet(this, _Controller_instances, "f"))
                if (!instances.some(_instance => _instance.id === instance.id))
                    this.removeInstance(instance);
            for (const newInstance of instances) {
                this.addInstance(newInstance);
                const instance = this.getInstance(newInstance.id);
                instance.socketHostname = newInstance.socketHostname;
            }
            return __classPrivateFieldGet(this, _Controller_instances, "f");
        });
    }
    updateInstanceSocketHostname(instance_2, socketHostname_1) {
        return __awaiter(this, arguments, void 0, function* (instance, socketHostname, autoReconnect = false) {
            yield this.database.connection.execute(`UPDATE ${types_1.instancesTableName} SET socketHostname = ? WHERE id = ?`, [socketHostname, instance.id]);
            instance.socketHostname = socketHostname;
            if (autoReconnect && instance.connected)
                yield instance.connect(true);
        });
    }
    connectInstances() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const instance of __classPrivateFieldGet(this, _Controller_instances, "f"))
                if (!instance.connected)
                    yield instance.connect();
        });
    }
    startInstance(instance_2, mode_1) {
        return __awaiter(this, arguments, void 0, function* (instance, mode, timeout = 6e4) {
            this.emit('instance starting', instance);
            let bootResult, dockerResult, timeoutId;
            const resetTimeout = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => timeoutController.abort(), timeout);
            };
            const timeoutController = new AbortController();
            resetTimeout();
            const bootStatusListener = (_, reset) => reset && resetTimeout();
            instance.on('boot status', bootStatusListener);
            instance.on('boot status booted', bootStatusListener);
            try {
                yield Promise.all([
                    Promise.race([
                        new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                            instance.once('boot status booted', success => {
                                clearTimeout(timeoutId);
                                resolve(bootResult = success);
                            });
                            if (!(yield instance.sendStartPermission(timeout)))
                                if (bootResult === undefined)
                                    resolve(bootResult = false);
                        })),
                        (() => __awaiter(this, void 0, void 0, function* () {
                            yield new Promise(resolve => timeoutController.signal.addEventListener('abort', resolve));
                            if (!(yield (0, helper_1.waitFor)(() => __awaiter(this, void 0, void 0, function* () {
                                return bootResult !== undefined ||
                                    dockerResult !== undefined ||
                                    (yield this.docker.instanceRunning(instance));
                            }), timeout / 500, 500)))
                                dockerResult = false;
                        }))()
                    ]),
                    (() => __awaiter(this, void 0, void 0, function* () {
                        dockerResult = yield this.docker.startInstance(instance, mode);
                        yield instance.connect();
                    }))()
                ]);
            }
            finally {
                instance.off('boot status', bootStatusListener);
                instance.off('boot status booted', bootStatusListener);
                clearTimeout(timeoutId);
            }
            const success = !!bootResult;
            this.emit('instance started', instance, success);
            return success;
        });
    }
    stopInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit('instance stopping', instance);
            const result = yield this.docker.stopInstance(instance);
            this.emit('instance stopped', instance, result);
            return result;
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.database.connect();
            yield (new instance_1.Instance(this.database.url, null)).initDatabase();
            yield this.docker.init();
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldSet(this, _Controller_running, true, "f");
            yield this.init();
            yield Promise.all([
                this.socket.start(),
                this.cli.start()
            ]);
            yield this.runInterval();
        });
    }
    runInterval() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.fetchSyncInstances();
            yield this.connectInstances();
            __classPrivateFieldSet(this, _Controller_runIntervalTimeout, setTimeout(() => {
                if (__classPrivateFieldGet(this, _Controller_running, "f"))
                    this.runInterval().then();
            }, this.instancesFetchInterval), "f");
        });
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldSet(this, _Controller_running, false, "f");
            clearTimeout(__classPrivateFieldGet(this, _Controller_runIntervalTimeout, "f"));
            for (const instance of __classPrivateFieldGet(this, _Controller_instances, "f"))
                this.removeInstance(instance);
            yield Promise.all([
                this.cli.stop(),
                this.socket.stop(),
                this.database.disconnect()
            ]);
        });
    }
}
exports.Controller = Controller;
_Controller_instances = new WeakMap(), _Controller_running = new WeakMap(), _Controller_runIntervalTimeout = new WeakMap();
//# sourceMappingURL=index.js.map