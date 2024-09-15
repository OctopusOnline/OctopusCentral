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
var _Controller_instances, _Controller_running;
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
class Controller extends node_events_1.default {
    get instances() { return __classPrivateFieldGet(this, _Controller_instances, "f"); }
    get running() { return __classPrivateFieldGet(this, _Controller_running, "f"); }
    constructor(serviceName, databaseUrl, instanceDockerProps) {
        super();
        this.instancesFetchInterval = 5000;
        _Controller_instances.set(this, []);
        _Controller_running.set(this, false);
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
        __classPrivateFieldGet(this, _Controller_instances, "f").push(instance);
        instance.on('socket connected', (error) => this.emit('instance socket connected', instance, error));
        instance.on('socket disconnected', () => this.emit('instance socket disconnected', instance));
    }
    createInstance() {
        return __awaiter(this, void 0, void 0, function* () {
            const virtualInstance = new instance_1.Instance(this.database.url);
            yield virtualInstance.init();
            yield this.fetchSyncInstances();
            return this.getInstance(virtualInstance.id);
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
        __classPrivateFieldSet(this, _Controller_instances, __classPrivateFieldGet(this, _Controller_instances, "f").filter(_instance => {
            if (_instance.id === instance.id) {
                _instance.disconnect();
                return true;
            }
        }), "f");
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
    startInstance(instance_2) {
        return __awaiter(this, arguments, void 0, function* (instance, timeout = 6e4) {
            let bootResult = undefined, dockerResult = undefined;
            yield Promise.all([
                Promise.race([
                    new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                        console.log('wait for instance connected...');
                        if (yield (0, helper_1.waitFor)(() => instance.connected, timeout / 200)) {
                            console.log('instance connected! wait for "boot status booted"...');
                            instance.socket.once('boot status booted', success => {
                                console.log('Controller', 'startInstance', '"boot status booted"');
                                bootResult = success;
                                resolve();
                            });
                        }
                        else {
                            bootResult = false;
                            resolve();
                        }
                    })),
                    (() => __awaiter(this, void 0, void 0, function* () {
                        yield (0, helper_1.sleep)(timeout);
                        !(yield (0, helper_1.waitFor)(() => __awaiter(this, void 0, void 0, function* () { return bootResult !== undefined || dockerResult === false || !(yield this.docker.instanceRunning(instance)); })));
                        console.log(`instance not running after ${timeout / 1e3}s`);
                    }))()
                ]),
                (() => __awaiter(this, void 0, void 0, function* () {
                    dockerResult = yield this.docker.startInstance(instance);
                    yield instance.connect();
                    console.log('instance connect done');
                }))()
            ]);
            console.log('Controller', 'startInstance', 'dockerResult:', dockerResult, 'bootResult:', bootResult);
            return bootResult;
        });
    }
    stopInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.docker.stopInstance(instance);
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.database.connect();
            //await (new VirtualInstance(this.database.url)).initDatabase();
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
            setTimeout(() => {
                if (__classPrivateFieldGet(this, _Controller_running, "f"))
                    this.runInterval().then();
            }, this.instancesFetchInterval);
        });
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.cli.stop(),
                this.socket.stop(),
                this.database.disconnect()
            ]);
            __classPrivateFieldSet(this, _Controller_running, false, "f");
        });
    }
}
exports.Controller = Controller;
_Controller_instances = new WeakMap(), _Controller_running = new WeakMap();
//# sourceMappingURL=index.js.map