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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.waitFor = waitFor;
function sleep(timeout) {
    return new Promise(resolve => setTimeout(() => resolve(), timeout));
}
function waitFor(breakFunction_1) {
    return __awaiter(this, arguments, void 0, function* (breakFunction, maxIterations = 150, interval = 200) {
        for (let i = 0; i < maxIterations; i++) {
            if (yield breakFunction())
                return true;
            yield sleep(interval);
        }
        return false;
    });
}
//# sourceMappingURL=helper.js.map