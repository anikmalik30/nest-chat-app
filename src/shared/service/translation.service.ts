import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class TranslationService {
  constructor(
    private i18n: I18nService,
    @Inject(REQUEST) private request,
  ) {}

  /**
   *
   * @param key
   * @param args
   * key: message
   * args: argument
   * @returns
   * translate message
   */
  async translate(key: string, args: unknown = null): Promise<string> {
    try {
      const lang = this.request?.i18nLang;
      if (args) {
        return this.i18n.translate(`en.${key}`, { args: args, lang: lang });
      } else {
        return this.i18n.translate(`en.${key}`, { lang: lang });
      }
    } catch (err) {
      return key;
    }
  }
}
