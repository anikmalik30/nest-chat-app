import { Request } from '@nestjs/common';

export interface IRequest extends Request {
  readonly i18nLang: string;
}
