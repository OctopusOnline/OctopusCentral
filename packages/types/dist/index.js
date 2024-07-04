"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instanceDatabaseEnvVarName = exports.instanceIdEnvVarName = exports.cliServerPort = exports.controllersTableName = exports.instanceSettingsTableName = exports.instancesTableName = void 0;
const instance_1 = require("./types/instance");
Object.defineProperty(exports, "instancesTableName", { enumerable: true, get: function () { return instance_1.tableName; } });
const setting_1 = require("./types/setting");
Object.defineProperty(exports, "instanceSettingsTableName", { enumerable: true, get: function () { return setting_1.tableName; } });
const controller_1 = require("./types/controller");
Object.defineProperty(exports, "controllersTableName", { enumerable: true, get: function () { return controller_1.tableName; } });
const cli_1 = require("./types/cli");
Object.defineProperty(exports, "cliServerPort", { enumerable: true, get: function () { return cli_1.serverPort; } });
const docker_1 = require("./types/docker");
Object.defineProperty(exports, "instanceIdEnvVarName", { enumerable: true, get: function () { return docker_1.instanceIdEnvVarName; } });
Object.defineProperty(exports, "instanceDatabaseEnvVarName", { enumerable: true, get: function () { return docker_1.instanceDatabaseEnvVarName; } });
//# sourceMappingURL=index.js.map