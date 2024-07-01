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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _InstanceDocker_instance;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceDocker = void 0;
const node_docker_api_1 = require("node-docker-api");
class InstanceDocker {
    get connected() {
        const client = this.client;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            if (!client)
                resolve(false);
            else
                yield client.ping()
                    .then(() => true)
                    .catch(() => false);
        }));
    }
    constructor(instance, clientOpts = { socketPath: '/var/run/docker.sock' }) {
        _InstanceDocker_instance.set(this, void 0);
        __classPrivateFieldSet(this, _InstanceDocker_instance, instance, "f");
        this.clientOpts = clientOpts;
    }
    connect() {
        return __awaiter(this, arguments, void 0, function* (reconnect = false) {
            if (!this.clientOpts)
                return false;
            if (yield this.connected) {
                if (reconnect)
                    this.disconnect();
                else
                    return false;
            }
            this.client = new node_docker_api_1.Docker(this.clientOpts);
            return yield this.connected;
        });
    }
    disconnect() {
        if (this.client) {
            this.client = undefined;
            return true;
        }
        return false;
    }
}
exports.InstanceDocker = InstanceDocker;
_InstanceDocker_instance = new WeakMap();
//# sourceMappingURL=InstanceDocker.js.map