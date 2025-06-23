export const serverPort: number = 7000;

type responseDataType = 'value' | 'list' | 'table';
export type ResponseValueDataType = null | number | string;
export type ResponseListDataType = ResponseValueDataType[];
export type ResponseTableDataType = {
  head: string[],
  rows: ResponseValueDataType[][]
};

interface ResponseData {
  type: responseDataType,
  data: any
}

export interface ResponseValueData extends ResponseData {
  type: 'value',
  data: ResponseValueDataType
}

export interface ResponseListData extends ResponseData {
  type: 'list',
  data: ResponseListDataType
}

export interface ResponseTableData extends ResponseData {
  type: 'table',
  data: ResponseTableDataType
}

export const warningCode = {
  invalid_command: 1,
  empty_response: 2,
  unknown_response_code: 3
};