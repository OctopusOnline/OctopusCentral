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
var _Database_url, _Database_connection;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const mariadb_1 = __importDefault(require("mariadb"));
class Database {
    get url() {
        return __classPrivateFieldGet(this, _Database_url, "f");
    }
    get connection() {
        if (__classPrivateFieldGet(this, _Database_connection, "f") === undefined)
            throw new Error('database is not connected  ( maybe run init() or start() first? )');
        return __classPrivateFieldGet(this, _Database_connection, "f");
    }
    constructor(url, connection) {
        _Database_url.set(this, void 0);
        _Database_connection.set(this, void 0);
        __classPrivateFieldSet(this, _Database_url, url, "f");
        __classPrivateFieldSet(this, _Database_connection, connection, "f");
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _Database_connection, "f"))
                __classPrivateFieldSet(this, _Database_connection, yield mariadb_1.default.createConnection(__classPrivateFieldGet(this, _Database_url, "f")), "f");
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connection.end();
        });
    }
}
exports.Database = Database;
_Database_url = new WeakMap(), _Database_connection = new WeakMap();
//# sourceMappingURL=Database.js.map