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
var _Docker_selfContainer;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Docker = void 0;
const types_1 = require("@octopuscentral/types");
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
    getSelfContainerLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const status = (yield ((_a = __classPrivateFieldGet(this, _Docker_selfContainer, "f")) === null || _a === void 0 ? void 0 : _a.status()));
            return status === null || status === void 0 ? void 0 : status.data.Config.Labels[label];
        });
    }
    getContainer(instance_1) {
        return __awaiter(this, arguments, void 0, function* (instance, onlyRunning = false) {
            const name = instance instanceof Instance_1.Instance ? this.getContainerName(instance) : instance;
            return (yield this.client.container.list({ all: !onlyRunning })).find(container => {
                var _a, _b;
                return ((_a = container.data.Name) === null || _a === void 0 ? void 0 : _a.includes(`/${name}`))
                    || ((_b = container.data.Names) === null || _b === void 0 ? void 0 : _b.includes(`/${name}`))
                    || container.id.startsWith(name);
            });
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
    startInstanceContainer(instance_1, networks_1, mode_1) {
        return __awaiter(this, arguments, void 0, function* (instance, networks, mode, forceRestart = true, autoReconnect = false) {
            var _a;
            if (forceRestart && (yield this.getContainer(instance)))
                yield this.stopInstance(instance);
            const containerName = this.getContainerName(instance);
            const volumesString = (yield this.getSelfContainerLabel(`${types_1.labelPrefix}.${types_1.instanceLabelPrefix}.volumes`))
                || (yield this.getImageLabel(`${types_1.labelPrefix}.${types_1.instanceLabelPrefix}.volumes`)) || '';
            const volumes = yield this.createInstanceVolumes(volumesString, instance);
            const binds = [
                ...Object.entries(volumes),
                ...Object.entries(this.parseBindsString(volumesString))
            ].map(([name, mountPath]) => `${name}:${mountPath}`);
            let portBindings = {};
            let exposedPorts = { [`${instance.socketPort}/tcp`]: {} };
            const portsString = (yield this.getSelfContainerLabel(`${types_1.labelPrefix}.${types_1.instanceLabelPrefix}.ports`))
                || (yield this.getImageLabel(`${types_1.labelPrefix}.${types_1.instanceLabelPrefix}.ports`)) || '';
            const portMappings = this.parsePortsString(portsString, instance);
            for (const portMapping in portMappings) {
                exposedPorts = Object.assign(Object.assign({}, exposedPorts), { [`${portMapping}/tcp`]: {} });
                portBindings = Object.assign(Object.assign({}, portBindings), { [`${portMapping}/tcp`]: [{ HostPort: String(portMappings[portMapping]) }] });
            }
            const capaddString = (_a = yield this.getSelfContainerLabel(`${types_1.labelPrefix}.${types_1.instanceLabelPrefix}.capadd`)) !== null && _a !== void 0 ? _a : '';
            const capadd = this.parseCapaddString(capaddString);
            const container = (yield this.client.container.create({
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
                    `${types_1.instanceIdEnvVarName}=${instance.id}`,
                    `${types_1.instanceServiceNameEnvVarName}=${this.controller.serviceName}`,
                    `${types_1.instanceDatabaseEnvVarName}=${this.controller.database.url}`,
                    `${types_1.instanceModeEnvVarName}=${mode || 'production'}`,
                    `${types_1.instancePortBindingsEnvVarName}=${Object.entries(portBindings).map(([src, hosts]) => `${src},${hosts[0].HostPort}`).join(';')}`,
                ],
                HostConfig: {
                    Binds: binds,
                    NetworkMode: 'bridge',
                    PortBindings: portBindings,
                    CapAdd: capadd,
                    RestartPolicy: { Name: 'no' },
                },
                Hostname: containerName,
                ExposedPorts: exposedPorts
            }));
            yield container.rename({ name: containerName });
            yield container.start();
            yield Promise.all([
                (() => __awaiter(this, void 0, void 0, function* () {
                    for (const networkKey in networks)
                        yield this.client.network.get(networkKey).connect({
                            Container: container.id,
                            EndpointConfig: {
                                Aliases: [containerName]
                            }
                        });
                }))(),
                this.controller.updateInstanceSocketHostname(instance, containerName, autoReconnect)
            ]);
            return container;
        });
    }
    evalLabelString(labelString, instance) {
        return labelString.replace(/{([^}]+)}/g, (_, expression) => eval(expression.trim().replace(/id/g, () => instance.id.toString())));
    }
    parseVolumesString(volumesString, instance) {
        return volumesString.split(';').reduce((volumes, volume) => {
            const [name, mountPath] = volume.split(':');
            if (!name.includes('/'))
                volumes[this.evalLabelString(name, instance)] = this.evalLabelString(mountPath, instance);
            return volumes;
        }, {});
    }
    parseBindsString(volumesString) {
        return volumesString.split(';').reduce((volumes, volume) => {
            const [path, mountPath] = volume.split(':');
            if (path.includes('/'))
                volumes[path] = mountPath;
            return volumes;
        }, {});
    }
    parsePortsString(portsString, instance) {
        return portsString.split(';').reduce((portMappings, portMapping) => {
            const [hstPort, srcPort] = portMapping.split(':');
            portMappings[Number(this.evalLabelString(srcPort, instance))] = Number(this.evalLabelString(hstPort !== null && hstPort !== void 0 ? hstPort : srcPort, instance));
            return portMappings;
        }, {});
    }
    parseCapaddString(capaddString) {
        return capaddString.split(';').filter(Boolean);
    }
    createInstanceVolumes(volumesString, instance) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!volumesString)
                return {};
            const namedVolumes = {};
            const imageVolumes = this.parseVolumesString(volumesString, instance);
            if (Object.keys(imageVolumes).length > 0) {
                const volumes = (yield this.client.volume.list())
                    .filter(volume => { var _a; return ((_a = volume === null || volume === void 0 ? void 0 : volume.data) === null || _a === void 0 ? void 0 : _a.Labels) && volume.data.Labels[`${types_1.labelPrefix}.${types_1.volumeLabelPrefix}.service-name`] === this.controller.serviceName; });
                for (const name in imageVolumes) {
                    const volumeName = this.getVolumeName(instance, name);
                    namedVolumes[volumeName] = imageVolumes[name];
                    if (!volumes.some(volume => volume.data.Name === volumeName))
                        yield this.client.volume.create({
                            Name: volumeName,
                            Labels: {
                                [`${types_1.labelPrefix}.${types_1.volumeLabelPrefix}.service-name`]: this.controller.serviceName
                            }
                        });
                }
            }
            return namedVolumes;
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
    startInstance(instance, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            const networks = yield this.getContainerNetwork(__classPrivateFieldGet(this, _Docker_selfContainer, "f"));
            if (!networks)
                return false;
            const container = yield this.startInstanceContainer(instance, networks, mode, true, true);
            return !!container;
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