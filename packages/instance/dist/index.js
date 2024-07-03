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
var _Instance_id;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = exports.Socket = exports.Setting = exports.Settings = void 0;
const types_1 = require("@octopuscentral/types");
const Setting_1 = require("./Setting");
Object.defineProperty(exports, "Setting", { enumerable: true, get: function () { return Setting_1.Setting; } });
const Socket_1 = require("./Socket");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return Socket_1.Socket; } });
const Settings_1 = require("./Settings");
Object.defineProperty(exports, "Settings", { enumerable: true, get: function () { return Settings_1.Settings; } });
const node_process_1 = __importDefault(require("node:process"));
class Instance {
    get id() { return __classPrivateFieldGet(this, _Instance_id, "f"); }
    constructor(connection, id, forceIdFromEnvVar = true) {
        _Instance_id.set(this, void 0);
        if (!connection)
            throw new Error('no database connection given');
        this._connection = connection;
        if (forceIdFromEnvVar || id === undefined) {
            id = Number(node_process_1.default.env[types_1.instanceIdEnvVarName]);
            if (isNaN(id))
                throw new Error('id and id env var value are not set');
        }
        __classPrivateFieldSet(this, _Instance_id, id, "f");
        this.settings = new Settings_1.Settings(this);
        this.socket = new Socket_1.Socket(this);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._connection.query(`
      CREATE TABLE IF NOT EXISTS ${types_1.instancesTableName} (
        id             INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHostname VARCHAR(255)     NULL
      )`);
            if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
                __classPrivateFieldSet(this, _Instance_id, Number((yield this._connection.query(`INSERT INTO ${types_1.instancesTableName} (id) VALUES (NULL)`)).insertId), "f");
            else
                yield this._connection.execute(`INSERT IGNORE INTO ${types_1.instancesTableName} (id) VALUES (?)`, [__classPrivateFieldGet(this, _Instance_id, "f")]);
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
            yield this._connection.execute(`UPDATE ${types_1.instancesTableName} SET socketHostname = ? WHERE id = ?`, [hostname, __classPrivateFieldGet(this, _Instance_id, "f")]);
        });
    }
}
exports.Instance = Instance;
_Instance_id = new WeakMap();
//# sourceMappingURL=index.js.map