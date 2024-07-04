export const serverPort: number = 7000;

export type responseDataType = 'value' | 'list' | 'table';

export interface ResponseData {
  type: responseDataType,
  data: any
}

export const warningCode = {
  invalid_command: 1,
  empty_response: 2,
  unknown_response_code: 3
};