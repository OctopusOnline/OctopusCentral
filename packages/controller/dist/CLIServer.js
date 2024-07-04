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
class CLIServer {
    constructor(controller) {
        this.controller = controller;
        this.express = (0, express_1.default)();
        this.server = http_1.default.createServer(this.express);
        this.setup();
    }
    setup() {
        this.express.use(express_1.default.json());
        this.express.get('/', (_, res) => res.send('Octopus Central CLI Server'));
        this.express.get('/serviceName', (_, res) => res.json({ type: 'value', data: this.controller.serviceName }));
        this.express.get(['/instance/ls', '/instances'], (_, res) => res.json({ type: 'list', data: this.controller.instances.map(instance => instance.id) }));
        // TODO: add CLI command processing
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