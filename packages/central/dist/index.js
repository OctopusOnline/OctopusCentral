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
var _Central_controllers, _Central_running;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Central = void 0;
const node_events_1 = __importDefault(require("node:events"));
const node_util_1 = require("node:util");
const Controller_1 = require("./Controller");
class Central extends node_events_1.default {
    get controllers() { return __classPrivateFieldGet(this, _Central_controllers, "f"); }
    get running() { return __classPrivateFieldGet(this, _Central_running, "f"); }
    constructor(connection) {
        super();
        this.table = 'Controllers';
        this.controllersFetchInterval = 10000;
        _Central_controllers.set(this, []);
        _Central_running.set(this, false);
        this._connection = connection;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._connection.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id         INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        socketHost VARCHAR(255)     NULL
      )`);
        });
    }
    addController(controller, socketHost) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(controller instanceof Controller_1.Controller)) {
                if (controller === undefined)
                    return yield this.addController(yield this.insertNewController(socketHost));
                else
                    controller = new Controller_1.Controller(controller, socketHost);
            }
            if (!this.getController(controller.id)) {
                yield this.insertController(controller);
                __classPrivateFieldGet(this, _Central_controllers, "f").push(controller);
                return controller;
            }
        });
    }
    insertNewController(socketHost) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Controller_1.Controller(Number((yield this._connection.query(`
          INSERT INTO ${this.table} (socketHost)
          VALUES (?)`, [socketHost])).insertId), socketHost);
        });
    }
    insertController(controller) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.loadController(controller.id)))
                yield this._connection.execute(`
          INSERT INTO ${this.table} (id, socketHost)
          VALUES (?, ?)`, [controller.id, controller.socketHost]);
        });
    }
    getController(id) {
        return __classPrivateFieldGet(this, _Central_controllers, "f").find(_controller => _controller.id === id);
    }
    removeController(controller) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const _controller of __classPrivateFieldGet(this, _Central_controllers, "f"))
                if (_controller.id === controller.id) {
                    yield this.deleteController(controller);
                    __classPrivateFieldGet(this, _Central_controllers, "f").splice(__classPrivateFieldGet(this, _Central_controllers, "f").findIndex(({ id }) => id === _controller.id), 1);
                    controller.disconnect();
                    return;
                }
        });
    }
    deleteController(controller) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._connection.execute(`DELETE FROM ${this.table} WHERE id = ?`, [controller.id]);
        });
    }
    fetchSyncControllers() {
        return __awaiter(this, void 0, void 0, function* () {
            const controllers = yield this.loadControllers();
            for (const controller of __classPrivateFieldGet(this, _Central_controllers, "f"))
                if (!controllers.some(_controller => _controller.id === controller.id))
                    yield this.removeController(controller);
            for (const newController of controllers) {
                yield this.addController(newController);
                const controller = this.getController(newController.id);
                controller.socketHost = newController.socketHost;
            }
            return __classPrivateFieldGet(this, _Central_controllers, "f");
        });
    }
    loadController(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._connection.query(`SELECT id, socketHost FROM ${this.table} WHERE id = ?`, [id]))
                .map(({ id, socketHost }) => new Controller_1.Controller(id, socketHost || undefined))[0];
        });
    }
    loadControllers() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._connection.query(`SELECT id, socketHost FROM ${this.table}`))
                .map(({ id, socketHost }) => new Controller_1.Controller(id, socketHost || undefined));
        });
    }
    connectControllers() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const controller of __classPrivateFieldGet(this, _Central_controllers, "f"))
                if (!controller.connected)
                    yield controller.connect();
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldSet(this, _Central_running, true, "f");
            this.runInterval().then();
        });
    }
    runInterval() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.fetchSyncControllers();
            yield this.connectControllers();
            yield (0, node_util_1.promisify)(setTimeout)(this.controllersFetchInterval);
            if (__classPrivateFieldGet(this, _Central_running, "f"))
                this.runInterval().then();
        });
    }
    getInstances() {
        return __awaiter(this, arguments, void 0, function* (filter = []) {
            let instances = [];
            for (const controller of __classPrivateFieldGet(this, _Central_controllers, "f")) {
                const serviceName = filter.some(_filter => _filter.serviceName)
                    ? yield controller.getServiceName() : undefined;
                if (!serviceName || filter.some(_filter => _filter.serviceName === serviceName))
                    instances = instances.concat((yield controller.getInstances()) || []);
            }
            return instances;
        });
    }
}
exports.Central = Central;
_Central_controllers = new WeakMap(), _Central_running = new WeakMap();
//# sourceMappingURL=index.js.map