import { Status } from "./instance";
export declare const tableName: string;
export declare const labelPrefix: string;
export interface InstanceStatus {
    instanceId: number;
    status: Status;
}
