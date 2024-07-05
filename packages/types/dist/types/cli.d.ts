export declare const serverPort: number;
type responseDataType = 'value' | 'list' | 'table';
export type responseValueDataType = null | number | string;
export type responseListDataType = responseValueDataType[];
export type responseTableDataType = {
    head: string[];
    rows: responseValueDataType[][];
};
interface ResponseData {
    type: responseDataType;
    data: any;
}
export interface ResponseValueData extends ResponseData {
    type: 'value';
    data: responseValueDataType;
}
export interface ResponseListData extends ResponseData {
    type: 'list';
    data: responseListDataType;
}
export interface ResponseTableData extends ResponseData {
    type: 'table';
    data: responseTableDataType;
}
export declare const warningCode: {
    invalid_command: number;
    empty_response: number;
    unknown_response_code: number;
};
export {};
