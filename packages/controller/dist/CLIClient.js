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
exports.CLIClient = void 0;
const types_1 = require("@octopuscentral/types");
const promises_1 = __importDefault(require("node:readline/promises"));
const axios_1 = __importDefault(require("axios"));
const node_events_1 = __importDefault(require("node:events"));
const node_process_1 = __importDefault(require("node:process"));
const path_1 = __importDefault(require("path"));
const helper_1 = require("./helper");
class CLIClient extends node_events_1.default {
    getServerUrl(path) {
        return `http://0.0.0.0:${types_1.cliServerPort}/${path}`;
    }
    constructor(input = node_process_1.default.stdin, output = node_process_1.default.stdout) {
        super();
        this.consoleInputPrefix = '> ';
        this.running = false;
        this.rl = promises_1.default.createInterface(input, output);
        this.rl.on('close', () => this.stop());
    }
    start() {
        if (this.running)
            return;
        else
            this.running = true;
        this.emit('start');
        this.inputLoop().then();
    }
    request(command) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const requestPath = path_1.default.normalize(command.split(' ').join('/'));
            let response;
            try {
                response = yield axios_1.default.get(this.getServerUrl(requestPath));
            }
            catch (error) {
                response = error.response;
            }
            if (response) {
                if (response.status === 404)
                    this.emit('warning', types_1.cliWarningCode.invalid_command);
                else if (response.status === 200) {
                    if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.type)
                        this.emit('response', response.data.type, response.data.data);
                    else
                        this.emit('warning', types_1.cliWarningCode.empty_response);
                }
                else
                    this.emit('warning', types_1.cliWarningCode.unknown_response_code, response.status);
            }
        });
    }
    requestTextStream(command) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, helper_1.sleep)(200);
            yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                const response = yield (0, axios_1.default)({
                    url: this.getServerUrl('stream/' + command),
                    responseType: 'stream',
                    validateStatus: status => status < 500
                });
                response.data.pipe(node_process_1.default.stdout);
                response.data.on('end', () => resolve());
                response.data.on('error', () => resolve());
            }));
        });
    }
    inputLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            const input = (yield this.rl.question(this.consoleInputPrefix)).trim();
            this.emit('input', input);
            switch (input) {
                case '':
                    break;
                case 'clear':
                    this.emit('clear');
                    break;
                case 'exit':
                    return this.stop();
                default:
                    yield Promise.all([
                        this.request(input),
                        this.requestTextStream(input)
                    ]);
            }
            yield this.inputLoop();
        });
    }
    stop() {
        this.rl.close();
        this.emit('stop');
    }
}
exports.CLIClient = CLIClient;
//# sourceMappingURL=CLIClient.js.map