export const serverPort: number = 7000;

type responseDataType = 'value' | 'list' | 'table';
export type responseValueDataType = null | number | string;
export type responseListDataType = responseValueDataType[];
export type responseTableDataType = {
  head: string[],
  rows: responseValueDataType[][]
};

interface ResponseData {
  type: responseDataType,
  data: any
}

export interface ResponseValueData extends ResponseData {
  type: 'value',
  data: responseValueDataType
}

export interface ResponseListData extends ResponseData {
  type: 'list',
  data: responseListDataType
}

export interface ResponseTableData extends ResponseData {
  type: 'table',
  data: responseTableDataType
}

export const warningCode = {
  invalid_command: 1,
  empty_response: 2,
  unknown_response_code: 3
};