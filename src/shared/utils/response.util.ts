import { HttpStatus } from '@nestjs/common';

export const response = (httpCode: HttpStatus, message: string, data?: any) => {
  return {
    status: httpCode,
    message: message,
    data: data,
  };
};
