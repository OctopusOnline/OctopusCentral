export declare const serverPort: number;
export type responseDataType = 'value' | 'list' | 'table';
export interface ResponseData {
    type: responseDataType;
    data: any;
}
export declare const warningCode: {
    invalid_command: number;
    empty_response: number;
    unknown_response_code: number;
    response_parse_error: number;
};
