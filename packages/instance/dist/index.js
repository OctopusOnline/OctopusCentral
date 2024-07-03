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
var _Instance_id, _Instance_database;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = exports.Socket = exports.Setting = exports.Settings = void 0;
const types_1 = require("@octopuscentral/types");
const mariadb_1 = __importDefault(require("mariadb"));
const Setting_1 = require("./Setting");
Object.defineProperty(exports, "Setting", { enumerable: true, get: function () { return Setting_1.Setting; } });
const Socket_1 = require("./Socket");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return Socket_1.Socket; } });
const Settings_1 = require("./Settings");
Object.defineProperty(exports, "Settings", { enumerable: true, get: function () { return Settings_1.Settings; } });
const node_process_1 = __importDefault(require("node:process"));
class Instance {
    get id() {
        if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
            throw new Error('instance.id is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_id, "f");
    }
    get database() {
        if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
            throw new Error('instance.database is not set\nmaybe run init() first?');
        return __classPrivateFieldGet(this, _Instance_database, "f");
    }
    constructor(database, id) {
        _Instance_id.set(this, void 0);
        _Instance_database.set(this, void 0);
        __classPrivateFieldSet(this, _Instance_database, database, "f");
        __classPrivateFieldSet(this, _Instance_id, id, "f");
        this.settings = new Settings_1.Settings(this);
        this.socket = new Socket_1.Socket(this);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined) {
                const idValue = node_process_1.default.env[types_1.instanceIdEnvVarName];
                if (idValue === undefined)
                    throw new Error(`env var ${types_1.instanceIdEnvVarName} is not set`);
                __classPrivateFieldSet(this, _Instance_id, Number(idValue), "f");
                if (isNaN(__classPrivateFieldGet(this, _Instance_id, "f")) || __classPrivateFieldGet(this, _Instance_id, "f") <= 0)
                    throw new Error(`invalid ${types_1.instanceIdEnvVarName} value: '${idValue}'`);
            }
            if (__classPrivateFieldGet(this, _Instance_database, "f") === undefined) {
                const databaseValue = node_process_1.default.env[types_1.instanceDatabaseEnvVarName];
                if (databaseValue === undefined)
                    throw new Error(`env var ${types_1.instanceDatabaseEnvVarName} is not set`);
                try {
                    __classPrivateFieldSet(this, _Instance_database, yield mariadb_1.default.createConnection(databaseValue), "f");
                }
                catch (error) {
                    throw new Error(`could not connect to database at '${databaseValue}': ${error.message}`);
                }
            }
            yield this.database.query(`
      CREATE TABLE IF NOT EXISTS ${types_1.instancesTableName} (
        id             INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHostname VARCHAR(255)     NULL
      )`);
            if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
                __classPrivateFieldSet(this, _Instance_id, Number((yield this.database.query(`INSERT INTO ${types_1.instancesTableName} (id) VALUES (NULL)`)).insertId), "f");
            else
                yield this.database.execute(`INSERT IGNORE INTO ${types_1.instancesTableName} (id) VALUES (?)`, [__classPrivateFieldGet(this, _Instance_id, "f")]);
            yield this.settings.init();
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.socket.start();
        });
    }
    setSocketHostname(hostname) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.database.execute(`UPDATE ${types_1.instancesTableName} SET socketHostname = ? WHERE id = ?`, [hostname, __classPrivateFieldGet(this, _Instance_id, "f")]);
        });
    }
}
exports.Instance = Instance;
_Instance_id = new WeakMap(), _Instance_database = new WeakMap();
//# sourceMappingURL=index.js.map