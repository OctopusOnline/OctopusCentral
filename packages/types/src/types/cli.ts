export const serverPort: number = 7000;

export type responseDataType = 'value' | 'list' | 'table';

export interface ResponseData {
  type: responseDataType,
  data: any
}