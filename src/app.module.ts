import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './modules/chat/chat.module';
import { MongooseModule } from '@nestjs/mongoose';
import { config } from 'dotenv';
import { TranslationService } from './shared/service/translation.service';
import { I18nJsonLoader, I18nModule, I18nService } from 'nestjs-i18n';
import * as path from 'path';
import { CognitoAuthGuard } from './shared/guard/cognito-auth.guard';
import { ConfigModule } from '@nestjs/config';

config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const i18nPath = isDevelopment ? path.join(__dirname, '..', 'src', 'i18n') : path.join(__dirname, 'i18n');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app-db'),
    ChatModule,
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(i18nPath),
        watch: true,
      },
      // loader: I18nJsonLoader,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, TranslationService, CognitoAuthGuard],
  exports: [TranslationService, CognitoAuthGuard],
})
export class AppModule {}
