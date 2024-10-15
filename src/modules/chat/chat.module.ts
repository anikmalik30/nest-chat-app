import { Logger, Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { ChatController } from './chat.controller';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatAuthGuard } from 'src/shared/guard/chat-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { TranslationService } from 'src/shared/service/translation.service';
import { CognitoAuthGuard } from 'src/shared/guard/cognito-auth.guard';
import { Redis } from 'ioredis';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    ConfigModule,
  ],
  providers: [
    ChatService,
    ChatGateway,
    ChatAuthGuard,
    CognitoAuthGuard,
    TranslationService,
    Logger,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
        });
      },
    },
  ],
  controllers: [ChatController],
  exports: ['REDIS_CLIENT'],
})
export class ChatModule {}
