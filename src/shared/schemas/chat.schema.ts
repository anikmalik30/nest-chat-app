import { z } from 'zod';

export const MessageSchema = z.string().min(1, { message: 'Must be at least 1 character.' });

export const RoomNameSchema = z
  .string()
  .min(2, { message: 'Must be at least 2 characters.' })
  .max(16, { message: 'Must be at most 16 characters.' });

export const UserIdSchema = z.string().min(1, { message: 'User ID is required.' }).optional();

export enum RoomType {
  SINGLE = 'SINGLE',
  GROUP = 'GROUP',
}

export enum ParticipantStatus {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  BLOCKED = 'BLOCKED',
  REQUEST = 'REQUEST',
}

export const ParticipantSchema = z.object({
  userId: z.string(),
  status: z.nativeEnum(ParticipantStatus).default(ParticipantStatus.REQUEST),
  is_deleted: z.boolean().default(false),
});

export const CreateRoomSchema = z
  .object({
    name: RoomNameSchema.optional(),
    type: z.enum([RoomType.SINGLE, RoomType.GROUP], { message: 'Invalid room type.' }),
    image: z.string().url().optional(),
    status: z.boolean().default(true),
    participantIds: z.array(z.string()).nonempty({ message: 'Participant IDs array must not be empty.' }),
    participants: z.array(ParticipantSchema).optional(),
    created_by: UserIdSchema,
    updated_by: UserIdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.type === RoomType.GROUP && !data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Name must be provided for GROUP room type',
        path: ['name'],
      });
    }
    if (data.type === RoomType.SINGLE && data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Name should not be provided for SINGLE room type',
        path: ['name'],
      });
    }
    if (data.type === RoomType.SINGLE && data.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Image should not be provided for SINGLE room type',
        path: ['image'],
      });
    }
  });

export const JoinRoomSchema = z.object({
  roomId: z.string().min(1, { message: 'Room ID is required.' }),
});

export const AddParticipantSchema = z.object({
  roomId: z.string().min(1, { message: 'Room ID is required.' }),
  userIds: z
    .array(z.string().min(1, { message: 'User ID is required.' }))
    .nonempty({ message: 'User IDs array must not be empty.' }),
});

export const SendMessageSchema = z.object({
  message: MessageSchema,
});
