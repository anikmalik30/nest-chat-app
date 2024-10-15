import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class AddParticipantDto {
  @ApiProperty({
    description: 'The ID of the room to which the participant will be added',
    example: '66ed3a3a81a132fbd382bf14',
  })
  @IsString()
  roomId: string;

  @ApiProperty({
    description: 'An array of user IDs to be added to the room',
    example: ['e3511bc7-8063-40f6-a2a9-5d1798act69f', 'e74f198b-0599-4805-8d51-eb600b9577ad'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];
}
