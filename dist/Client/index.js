"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const socket_io_client_1 = require("socket.io-client");
class Client {
    constructor(host = '0.0.0.0', protocol = 'http', port = 1778) {
        this.protocol = protocol;
        this.host = host;
        this.port = port;
        this.socket = (0, socket_io_client_1.io)(`${this.protocol}://${this.host}:${this.port}`);
    }
}
exports.Client = Client;
//# sourceMappingURL=index.js.map