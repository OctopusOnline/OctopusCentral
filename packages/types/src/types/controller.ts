import { Status } from "./instance";

export const tableName: string = 'Controllers';

export const labelPrefix: string = 'controller';

export interface InstanceStatus {
    instanceId: number;
    status: Status;
}