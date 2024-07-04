"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = void 0;
const node_events_1 = __importDefault(require("node:events"));
const commander_1 = require("commander");
class CLI extends node_events_1.default {
    constructor() {
        super();
        this.program = new commander_1.Command();
    }
}
exports.CLI = CLI;
//# sourceMappingURL=CLI.js.map