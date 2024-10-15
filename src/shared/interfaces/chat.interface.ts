import { z } from 'zod';
import { JoinRoomSchema, MessageSchema } from '../schemas/chat.schema';

export interface User {
  userId: string;
}

export interface Room {
  roomName: string;
  participants: User[];
  type: number;
}

export type Message = z.infer<typeof MessageSchema>;

export type JoinRoom = z.infer<typeof JoinRoomSchema>;

export interface ServerToClientEvents {
  message: (e: Message) => void;
  join_room: (e: JoinRoom) => void;
}

export interface ClientToServerEvents {
  message: (e: Message) => void;
  join_room: (e: JoinRoom) => void;
}
