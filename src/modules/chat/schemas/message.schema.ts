// src/chat/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MessageStatus } from '../enums/message-status.enum';

// Define enums for clarity
// export enum MessageStatus {
//   SENT = 'SENT',
//   DELIVERED = 'DELIVERED',
//   SEEN = 'SEEN',
// }

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true })
  room_id: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  sender_id: string;

  @Prop({
    type: [
      {
        userId: String,
        status: { type: String, enum: MessageStatus, default: MessageStatus.SENT },
        is_deleted: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  receivers: Array<{
    userId: string;
    status: MessageStatus;
    is_deleted: boolean;
  }>;

  @Prop({ required: true, default: true })
  status: boolean;

  @Prop()
  createdAt: Date;

  @Prop({ required: true })
  created_by: string;

  @Prop({ required: true })
  updated_by: string;

  @Prop({ default: false })
  is_deleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
