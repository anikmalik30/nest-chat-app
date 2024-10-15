import { ApiProperty } from '@nestjs/swagger';
import { ParticipantDto } from './create-room.dto';
import { RoomType } from 'src/shared/schemas/chat.schema';

export class CreateRoomResponseDto {
  @ApiProperty({
    description: 'The name of the chat room or',
    example: 'General  = name of the group ',
  })
  name: string;

  @ApiProperty({
    description: 'The type of the chat room',
    example: 'GROUP',
  })
  type: RoomType;

  @ApiProperty({
    description: 'The status of the chat room',
    example: true,
  })
  status: boolean;

  @ApiProperty({
    description: 'The image URL of the chat room',
    example: '',
  })
  image: string;

  @ApiProperty({
    description: 'The participants of the chat room',
    type: [ParticipantDto],
  })
  participants: ParticipantDto[];

  @ApiProperty({
    description: 'The admins of the chat room',
    example: ['e74f198b-0599-4805-8d51-eb600b9577ad'],
  })
  admins: string[];

  @ApiProperty({
    description: 'The ID of the user who created the room',
    example: 'e74f198b-0599-4805-8d51-eb600b9577ad',
  })
  created_by: string;

  @ApiProperty({
    description: 'The ID of the user who last updated the room',
    example: 'e74f198b-0599-4805-8d51-eb600b9577ad',
  })
  updated_by: string;

  @ApiProperty({
    description: 'Indicates if the chat room is deleted',
    example: false,
  })
  is_deleted: boolean;

  @ApiProperty({
    description: 'The ID of the chat room',
    example: '66ed21e2b4c4fd1fa4d4f80a',
  })
  _id: string;

  @ApiProperty({
    description: 'The date and time when the chat room was created',
    example: '2024-09-20T07:18:58.039Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the chat room was last updated',
    example: '2024-09-20T07:18:58.039Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'The version of the chat room document',
    example: 0,
  })
  __v: number;
}
