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
var _Instance_id;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = void 0;
const Settings_1 = require("./Settings");
class Instance {
    get id() { return __classPrivateFieldGet(this, _Instance_id, "f"); }
    constructor(connection, id) {
        this.table = 'Instances';
        _Instance_id.set(this, void 0);
        if (!connection)
            throw new Error('no database connection given');
        this.connection = connection;
        __classPrivateFieldSet(this, _Instance_id, id, "f");
        this.settings = new Settings_1.Settings(this);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connection.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT
      )
    `);
            if (__classPrivateFieldGet(this, _Instance_id, "f") === undefined)
                __classPrivateFieldSet(this, _Instance_id, Number((yield this.connection.query(`INSERT INTO ${this.table} (id) VALUES (NULL)`)).insertId), "f");
            else
                yield this.connection.execute(`INSERT IGNORE INTO ${this.table} (id) VALUES (?)`, [__classPrivateFieldGet(this, _Instance_id, "f")]);
            yield this.settings.init();
        });
    }
}
exports.Instance = Instance;
_Instance_id = new WeakMap();
//# sourceMappingURL=index.js.map