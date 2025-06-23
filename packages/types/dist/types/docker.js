"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.volumeLabelPrefix = exports.labelPrefix = exports.instanceModeEnvVarName = exports.instanceDatabaseEnvVarName = exports.instanceServiceNameEnvVarName = exports.instanceIdEnvVarName = void 0;
const envVarPrefix = 'OCTOPUS_INSTANCE';
exports.instanceIdEnvVarName = envVarPrefix + '_ID';
exports.instanceServiceNameEnvVarName = envVarPrefix + '_SERVICE_NAME';
exports.instanceDatabaseEnvVarName = envVarPrefix + '_DATABASE_URL';
exports.instanceModeEnvVarName = envVarPrefix + 'MODE';
exports.labelPrefix = 'octopus';
exports.volumeLabelPrefix = 'volume';
//# sourceMappingURL=docker.js.map