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
const node_events_1 = __importDefault(require("node:events"));
const promises_1 = __importDefault(require("node:readline/promises"));
const node_process_1 = __importDefault(require("node:process"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
class CLIClient extends node_events_1.default {
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
    // TODO: add console coloring
    inputLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            const input = (yield this.rl.question(this.consoleInputPrefix)).trim();
            this.emit('input', input);
            switch (input) {
                case 'exit':
                    return this.stop();
                default:
                    const requestPath = path_1.default.normalize(input.split(' ').join('/'));
                    const response = yield axios_1.default.get(`http://0.0.0.0:${types_1.cliServerPort}/${requestPath}`);
                    if (response.status === 404)
                        console.warn('[!] invalid command');
                    else if (response.status === 200) {
                        if (response.data)
                            console.log(typeof response.data, '|', response.data);
                        else
                            console.warn('[!] empty response');
                        // TODO: parse and format response data (use response type in json, e.g. to tell to display a table or list)
                    }
                    else
                        console.warn('[!] unknown response code:', response.status);
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