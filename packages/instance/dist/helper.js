"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
function sleep(timeout) {
    return new Promise(resolve => setTimeout(() => resolve(), timeout));
}
//# sourceMappingURL=helper.js.map