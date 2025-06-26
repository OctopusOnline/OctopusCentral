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
var _Instance_id, _Instance_serviceName, _Instance_mode, _Instance_database, _Instance_portBindings;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = exports.Socket = exports.Setting = exports.Settings = void 0;
const types_1 = require("@octopuscentral/types");
const node_process_1 = __importDefault(require("node:process"));
const Database_1 = require("./Database");
const Setting_1 = require("./Setting");
Object.defineProperty(exports, "Setting", { enumerable: true, get: function () { return Setting_1.Setting; } });
const Settings_1 = require("./Settings");
Object.defineProperty(exports, "Settings", { enumerable: true, get: function () { return Settings_1.Settings; } });
const Socket_1 = require("./Socket");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return Socket_1.Socket; } });
class Instance {
    get id() {
        if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
            throw new Error('instance.id is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_id, "f");
    }
    get serviceName() {
        if (__classPrivateFieldGet(this, _Instance_serviceName, "f") === undefined)
            throw new Error('instance.serviceName is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_serviceName, "f");
    }
    get mode() {
        if (__classPrivateFieldGet(this, _Instance_mode, "f") === undefined)
            throw new Error('instance.mode is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_mode, "f");
    }
    get database() {
        if (__classPrivateFieldGet(this, _Instance_database, "f") === undefined)
            throw new Error('instance.database is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_database, "f");
    }
    get portBindings() {
        if (__classPrivateFieldGet(this, _Instance_portBindings, "f") === undefined)
            throw new Error('instance.portBindings is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_portBindings, "f");
    }
    parsePortBindingString(bindingString) {
        const binding = bindingString.split(',');
        const bindingSrc = binding[0].split('/');
        const bindingSrcHost = bindingSrc[0].split(':');
        const bindingSrcHostHasIP = !/^[0-9]+$/.test(bindingSrcHost[0]);
        return {
            host: {
                ip: bindingSrcHostHasIP ? bindingSrcHost[0] : '0.0.0.0',
                port: Number(binding[1]),
                protocol: bindingSrc[1],
            },
            src: {
                port: Number(bindingSrcHost[bindingSrcHostHasIP ? 1 : 0]),
            },
        };
    }
    _initVirtual(serviceName_1, mode_1) {
        return __awaiter(this, arguments, void 0, function* (serviceName, mode, portBindings = []) {
            __classPrivateFieldSet(this, _Instance_serviceName, serviceName, "f");
            __classPrivateFieldSet(this, _Instance_mode, mode, "f");
            __classPrivateFieldSet(this, _Instance_portBindings, portBindings, "f");
            yield this.init();
        });
    }
    constructor(databaseUrl, id) {
        _Instance_id.set(this, void 0);
        _Instance_serviceName.set(this, void 0);
        _Instance_mode.set(this, void 0);
        _Instance_database.set(this, void 0);
        _Instance_portBindings.set(this, void 0);
        if (databaseUrl)
            __classPrivateFieldSet(this, _Instance_database, new Database_1.Database(databaseUrl), "f");
        __classPrivateFieldSet(this, _Instance_id, id, "f");
        this.settings = new Settings_1.Settings(this);
        this.socket = new Socket_1.Socket(this);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined) {
                const id = node_process_1.default.env[types_1.instanceIdEnvVarName];
                if (id === undefined)
                    throw new Error(`env var ${types_1.instanceIdEnvVarName} is not set`);
                __classPrivateFieldSet(this, _Instance_id, Number(id), "f");
                if (isNaN(__classPrivateFieldGet(this, _Instance_id, "f")) || __classPrivateFieldGet(this, _Instance_id, "f") <= 0)
                    throw new Error(`invalid ${types_1.instanceIdEnvVarName} value: '${id}'`);
            }
            if (__classPrivateFieldGet(this, _Instance_serviceName, "f") === undefined) {
                const serviceName = node_process_1.default.env[types_1.instanceServiceNameEnvVarName];
                if (serviceName === undefined)
                    throw new Error(`env var ${types_1.instanceServiceNameEnvVarName} is not set`);
                __classPrivateFieldSet(this, _Instance_serviceName, serviceName, "f");
            }
            if (__classPrivateFieldGet(this, _Instance_mode, "f") === undefined) {
                const mode = node_process_1.default.env[types_1.instanceModeEnvVarName];
                if (mode === undefined)
                    throw new Error(`env var ${types_1.instanceModeEnvVarName} is not set`);
                __classPrivateFieldSet(this, _Instance_mode, mode, "f");
            }
            if (__classPrivateFieldGet(this, _Instance_portBindings, "f") === undefined) {
                const portBindings = (_a = node_process_1.default.env[types_1.instancePortBindingsEnvVarName]) === null || _a === void 0 ? void 0 : _a.split(';').map(this.parsePortBindingString);
                if (portBindings === undefined)
                    throw new Error(`env var ${types_1.instancePortBindingsEnvVarName} is not set`);
                __classPrivateFieldSet(this, _Instance_portBindings, portBindings, "f");
            }
            yield this.initDatabase();
            if (__classPrivateFieldGet(this, _Instance_id, "f") !== null) {
                if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
                    __classPrivateFieldSet(this, _Instance_id, Number((yield this.database.connection.query(`INSERT INTO ${types_1.instancesTableName} (id) VALUES (NULL)`)).insertId), "f");
                else
                    yield this.database.connection.execute(`INSERT IGNORE INTO ${types_1.instancesTableName} (id) VALUES (?)`, [__classPrivateFieldGet(this, _Instance_id, "f")]);
            }
            yield this.settings.init();
        });
    }
    initDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _Instance_database, "f") === undefined) {
                const url = node_process_1.default.env[types_1.instanceDatabaseEnvVarName];
                if (url === undefined)
                    throw new Error(`env var ${types_1.instanceDatabaseEnvVarName} is not set`);
                __classPrivateFieldSet(this, _Instance_database, new Database_1.Database(url), "f");
            }
            try {
                yield __classPrivateFieldGet(this, _Instance_database, "f").connect();
            }
            catch (error) {
                throw new Error(`could not connect to database at '${__classPrivateFieldGet(this, _Instance_database, "f").url}': ${error.message}`);
            }
            yield this.database.connection.query(`
      CREATE TABLE IF NOT EXISTS ${types_1.instancesTableName} (
        id             INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHostname VARCHAR(255)     NULL
      )`);
            yield this.settings.initDatabase();
        });
    }
    start() {
        return __awaiter(this, arguments, void 0, function* (awaitStartPermission = true) {
            yield this.socket.start();
            return !awaitStartPermission || (yield this.socket.awaitStartPermission());
        });
    }
    sendBootStatus(messageOrBooted) {
        this.socket.sendBootStatus(messageOrBooted);
    }
    setSocketHostname(hostname) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.database.connection.execute(`UPDATE ${types_1.instancesTableName} SET socketHostname = ? WHERE id = ?`, [hostname, __classPrivateFieldGet(this, _Instance_id, "f")]);
        });
    }
}
exports.Instance = Instance;
_Instance_id = new WeakMap(), _Instance_serviceName = new WeakMap(), _Instance_mode = new WeakMap(), _Instance_database = new WeakMap(), _Instance_portBindings = new WeakMap();
//# sourceMappingURL=index.js.map