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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Docker_selfContainer;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Docker = void 0;
const types_1 = require("@octopuscentral/types");
const types_2 = require("@octopuscentral/types");
const node_docker_api_1 = require("node-docker-api");
const Instance_1 = require("./Instance");
const os_1 = require("os");
class Docker {
    get connected() {
        const client = this.client;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield client.ping()
                .then(() => resolve(true))
                .catch(() => resolve(false));
        }));
    }
    constructor(controller, instanceProps) {
        this.clientProps = { socketPath: '/var/run/docker.sock' };
        _Docker_selfContainer.set(this, void 0);
        if (!instanceProps)
            throw new Error('no instance properties set!');
        this.controller = controller;
        this.instanceProps = instanceProps;
        this.client = new node_docker_api_1.Docker(this.clientProps);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.connected))
                throw new Error(`Docker client not connected (at: '${this.clientProps.socketPath}')`);
            yield this.fetchSelfContainer();
        });
    }
    getContainerName(instance) {
        return this.controller.serviceName + '_instance-' + (instance instanceof Instance_1.Instance ? instance.id : instance);
    }
    getVolumeName(instance, name) {
        return this.getContainerName(instance) + '-' + name;
    }
    getImageLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = (yield this.client.image.get(this.instanceProps.image).status());
            return status.data.Config.Labels[label];
        });
    }
    getContainer(instance_1) {
        return __awaiter(this, arguments, void 0, function* (instance, onlyRunning = false) {
            const name = instance instanceof Instance_1.Instance ? this.getContainerName(instance) : instance;
            return (yield this.client.container.list({ all: !onlyRunning })).find(container => container.data.Names.includes(`/${name}`)
                || container.id.startsWith(name));
        });
    }
    getContainerNetwork(container) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const networks = (_b = (_a = container.data) === null || _a === void 0 ? void 0 : _a.NetworkSettings) === null || _b === void 0 ? void 0 : _b.Networks;
            if (!networks)
                return;
            return networks;
        });
    }
    fetchSelfContainer() {
        return __awaiter(this, void 0, void 0, function* () {
            const containerName = (0, os_1.hostname)();
            if (!containerName)
                throw new Error('could not find any hostname (running in a docker container?)');
            __classPrivateFieldSet(this, _Docker_selfContainer, yield this.getContainer(containerName), "f");
            if (!__classPrivateFieldGet(this, _Docker_selfContainer, "f"))
                throw new Error(`could not find controller container (${containerName})`);
        });
    }
    startInstanceContainer(instance_1, networks_1) {
        return __awaiter(this, arguments, void 0, function* (instance, networks, forceRestart = true, autoReconnect = false) {
            const runningContainer = yield this.getContainer(instance);
            if (runningContainer) {
                if (!forceRestart)
                    return;
                yield this.stopInstance(instance);
            }
            const containerName = this.getContainerName(instance);
            const volumes = yield this.createInstanceVolumes(instance);
            const binds = Object.entries(volumes).map(([name, mountPath]) => `${name}:${mountPath}`);
            let endpointConfig = {};
            for (const networkKey in networks)
                endpointConfig = Object.assign(Object.assign({}, endpointConfig), { [networks[networkKey].NetworkID]: {
                        Aliases: [containerName]
                    } });
            const container = yield this.client.container.create({
                Image: this.instanceProps.image,
                Tty: true,
                AttachStdin: false,
                AttachStdout: true,
                AttachStderr: true,
                OpenStdin: false,
                StdinOnce: false,
                Labels: {
                    [`${types_1.labelPrefix}.${types_1.controllerLabelPrefix}.service-name`]: this.controller.serviceName
                },
                Env: [
                    `${types_2.instanceIdEnvVarName}=${instance.id}`,
                    `${types_1.instanceDatabaseEnvVarName}=${this.controller.database.url}`
                ],
                HostConfig: {
                    Binds: binds
                },
                Hostname: containerName,
                ExposedPorts: {
                    [instance.socketPort]: {}
                },
                NetworkingConfig: {
                    EndpointsConfig: endpointConfig
                }
            });
            yield container.rename({ name: containerName });
            yield container.start();
            yield this.controller.updateInstanceSocketHostname(instance, containerName, autoReconnect);
            // TODO: check container Errors (look in debug mode)
            return container;
        });
    }
    parseVolumesString(volumesString) {
        return volumesString.split(';').reduce((volumes, volume) => {
            const [name, mountPath] = volume.split(':');
            volumes[name] = mountPath;
            return volumes;
        }, {});
    }
    createInstanceVolumes(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const volumesString = yield this.getImageLabel(`${types_1.labelPrefix}.${types_1.instanceLabelPrefix}.volumes`);
            if (!volumesString)
                return {};
            const imageVolumes = this.parseVolumesString(volumesString);
            if (Object.keys(imageVolumes).length > 0) {
                const volumes = (yield this.client.volume.list())
                    .filter(volume => volume.data.Labels[`${types_1.labelPrefix}.${types_1.volumeLabelPrefix}.service-name`] === this.controller.serviceName);
                for (const name in imageVolumes) {
                    const volumeName = this.getVolumeName(instance, name);
                    if (!volumes.some(volume => volume.data.Name === volumeName))
                        yield this.client.volume.create({
                            Name: volumeName,
                            Labels: {
                                [`${types_1.labelPrefix}.${types_1.volumeLabelPrefix}.service-name`]: this.controller.serviceName
                            }
                        });
                }
            }
            return imageVolumes;
        });
    }
    instanceRunning(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const container = yield this.getContainer(instance);
            return !!container && (!((_a = container.State) === null || _a === void 0 ? void 0 : _a.Running) || !!container.State.Paused);
        });
    }
    instancePaused(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return (_a = (yield this.getContainer(instance))) === null || _a === void 0 ? void 0 : _a.State.Paused;
        });
    }
    startInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const networks = yield this.getContainerNetwork(__classPrivateFieldGet(this, _Docker_selfContainer, "f"));
            if (!networks)
                return false;
            const container = yield this.startInstanceContainer(instance, networks, true, true);
            return !!container && instance.connected;
        });
    }
    stopInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const container = yield this.getContainer(instance);
            if (container) {
                yield container.delete({ force: true });
                return true;
            }
            return false;
        });
    }
    pauseInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const container = yield this.getContainer(instance);
            if (container) {
                yield container.pause();
                return true;
            }
            return false;
        });
    }
    unpauseInstance(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const container = yield this.getContainer(instance);
            if (container) {
                yield container.unpause();
                return true;
            }
            return false;
        });
    }
}
exports.Docker = Docker;
_Docker_selfContainer = new WeakMap();
//# sourceMappingURL=Docker.js.map