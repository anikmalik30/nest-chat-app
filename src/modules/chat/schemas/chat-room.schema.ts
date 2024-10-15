// src/chat/schemas/chat-room.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ParticipantStatus, RoomType } from 'src/shared/schemas/chat.schema';

// Define enums for clarity
// enum RoomType {
//   SINGLE = 'SINGLE',
//   GROUP = 'GROUP',
// }

// enum ParticipantStatus {
//   ACCEPT = 'ACCEPT',
//   REJECT = 'REJECT',
//   BLOCKED = 'BLOCKED',
//   REQUEST = 'REQUEST',
// }

@Schema({ timestamps: true })
export class ChatRoom extends Document {
  @Prop()
  name: string;

  @Prop({ required: true, enum: RoomType })
  type: RoomType;

  @Prop({ required: true, default: true })
  status: boolean;

  @Prop({ type: String })
  image: string;

  @Prop({
    type: [
      {
        userId: String,
        status: { type: String, enum: ParticipantStatus, default: ParticipantStatus.REQUEST },
        is_deleted: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  participants: Array<{
    userId: string;
    status: ParticipantStatus;
    is_deleted: boolean;
  }>;

  @Prop({ type: [String], default: [] })
  admins: string[];

  @Prop({ required: true })
  created_by: string;

  @Prop({ required: true })
  updated_by: string;

  @Prop({ default: false })
  is_deleted: boolean;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

ChatRoomSchema.pre('validate', function (next) {
  if (this.type === RoomType.GROUP && !this.name) {
    next(new Error('Name must be provided for GROUP room type'));
  } else if (this.type === RoomType.SINGLE && this.name) {
    next(new Error('Name should not be provided for SINGLE room type'));
  } else {
    next();
  }
});

ChatRoomSchema.pre('save', function (next) {
  if (this.type === RoomType.SINGLE) {
    this.image = undefined;
  } else if (this.type === RoomType.GROUP && !this.image) {
    this.image = '';
  }
  next();
});
