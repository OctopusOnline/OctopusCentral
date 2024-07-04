export declare const serverPort: number;
export type responseDataType = 'value' | 'list' | 'table';
export interface ResponseData {
    type: responseDataType;
    data: any;
}
