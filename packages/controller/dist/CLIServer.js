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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIServer = void 0;
const types_1 = require("@octopuscentral/types");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const helper_1 = require("./helper");
class CLIServer {
    constructor(controller) {
        this.eventBuffer = {
            instance: []
        };
        this.controller = controller;
        this.express = (0, express_1.default)();
        this.server = http_1.default.createServer(this.express);
        this.setup();
    }
    setup() {
        this.express.use(express_1.default.json());
        this.express.get('/', (_, res) => res.send('Octopus Central CLI Server'));
        this.express.get('/serviceName', (_, res) => res.json({ type: 'value', data: this.controller.serviceName }));
        this.express.get(['/instance/ls', '/instances'], (_, res) => __awaiter(this, void 0, void 0, function* () {
            const data = {
                head: ['id', 'running'],
                rows: []
            };
            for (const instance of this.controller.instances)
                data.rows.push([
                    instance.id,
                    (yield this.controller.docker.instanceRunning(instance)) ? 'yes' : 'no'
                ]);
            res.json({ type: 'table', data });
        }));
        this.express.use(['/instance/:id/*', '/stream/instance/:id/*'], (req, res, next) => {
            req.instance = this.controller.getInstance(Number(req.params.id));
            if (!req.instance)
                res.json({
                    type: 'value',
                    data: `instance ${req.params.id} does not exist`
                });
            else
                next();
        });
        this.express.get('/instance/:id/start', (req, res) => __awaiter(this, void 0, void 0, function* () {
            this.eventBuffer.instance[req.instance.id] = { start: { waitingForStream: true, connected: false, booted: false } };
            let result;
            if (!(yield (0, helper_1.waitFor)(() => !this.eventBuffer.instance[req.instance.id].start.waitingForStream)))
                result = new Error('boot stream timeout');
            else {
                try {
                    result = yield this.controller.startInstance(req.instance);
                }
                catch (error) {
                    result = error;
                }
            }
            console.log('CLIServer', 'start', 'docker instance start result:', result);
            this.eventBuffer.instance[req.instance.id].start.booted = true;
            res.json({
                type: 'value',
                data: result instanceof Error
                    ? result.message : (result
                    ? `instance ${req.instance.id} started`
                    : `instance ${req.instance.id} could not be started`)
            });
        }));
        this.express.get('/stream/instance/:id/start', (req, res) => __awaiter(this, void 0, void 0, function* () {
            if (!(yield (0, helper_1.waitFor)(() => { var _a, _b; return (_b = (_a = this.eventBuffer.instance[req.instance.id]) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.waitingForStream; })))
                return res.destroy(new Error('no waitingForStream'));
            const bootStatusEvent = (message) => {
                console.log('CLIServer stream bootStatusEvent:', message);
                res.write(message);
            };
            const connectEvent = (error) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (!((_a = this.eventBuffer.instance[req.instance.id]) === null || _a === void 0 ? void 0 : _a.start)) {
                    req.instance.off('socket connected', connectEvent);
                    return;
                }
                else if (error)
                    return;
                req.instance.off('socket connected', connectEvent);
                req.instance.socket.on('boot status', bootStatusEvent);
                console.log('CLIServer stream: listening on "boot status" event');
                this.eventBuffer.instance[req.instance.id].start.connected = true;
                yield (0, helper_1.waitFor)(() => { var _a, _b; return (_b = (_a = this.eventBuffer.instance[req.instance.id]) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.booted; }, 300);
                console.log('CLIServer close stream cause instance has booted');
                (_b = req.instance.socket) === null || _b === void 0 ? void 0 : _b.off('boot status', bootStatusEvent);
                res.end(''); // TODO: this necessary?
            });
            req.instance.on('socket connected', connectEvent);
            this.eventBuffer.instance[req.instance.id].start.waitingForStream = false;
            if (yield Promise.race([
                (0, helper_1.waitFor)(() => { var _a, _b; return (_b = (_a = this.eventBuffer.instance[req.instance.id]) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.connected; }, 300).then(() => false),
                (0, helper_1.waitFor)(() => { var _a, _b; return (_b = (_a = this.eventBuffer.instance[req.instance.id]) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.booted; }, 300).then(() => true)
            ])) {
                console.log('CLIServer', 'stream', 'end stream after Promise.rage');
                req.instance.off('socket connected', connectEvent);
                res.end(''); // TODO: this necessary?
            }
        }));
        this.express.get('/instance/:id/stop', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let result;
            try {
                result = yield this.controller.stopInstance(req.instance);
            }
            catch (error) {
                result = error;
            }
            res.json({
                type: 'value',
                data: result instanceof Error
                    ? result.message : (result
                    ? `instance ${req.instance.id} stopped`
                    : `instance ${req.instance.id} could not be stopped`)
            });
        }));
        this.express.use((_, res) => res.status(404).send());
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => { var _a; return (_a = this.server) === null || _a === void 0 ? void 0 : _a.listen(types_1.cliServerPort, () => resolve()); });
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            (_a = this.server) === null || _a === void 0 ? void 0 : _a.close();
        });
    }
}
exports.CLIServer = CLIServer;
//# sourceMappingURL=CLIServer.js.map