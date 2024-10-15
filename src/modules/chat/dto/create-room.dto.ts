// src/chat/dto/create-room.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipantStatus, RoomType } from 'src/shared/schemas/chat.schema';

export class ParticipantDto {
  @ApiProperty({
    description: 'The ID of the participant',
    example: 'e74f198b-0599-4805-8d51-eb600b9577ad',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'The status of the participant',
    example: ParticipantStatus.REQUEST,
  })
  @IsEnum(ParticipantStatus)
  status: ParticipantStatus = ParticipantStatus.REQUEST;

  @ApiProperty({
    description: 'Indicates if the participant is deleted',
    example: false,
  })
  @IsBoolean()
  is_deleted: boolean = false;
}

export class CreateRoomDto {
  @ApiPropertyOptional({
    description: 'The name of the chat room',
    example: 'General - Name only provide with the group type only ', // Optional for SINGLE room type
  })
  @IsString()
  @ValidateIf((o) => o.type === RoomType.GROUP)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The type of the chat room',
    example: 'SINGLE / GROUP',
  })
  @IsEnum(RoomType, { message: 'Invalid room type.' })
  type: RoomType;

  //   @ApiPropertyOptional({
  //     description: 'The image URL of the chat room',
  //     example: 'http://example.com/image.png - Optional for GROUP room type',
  //   })
  @IsUrl()
  @IsOptional()
  @ValidateIf((o) => o.type === RoomType.GROUP)
  image?: string;

  @IsBoolean()
  status: boolean = true;

  @ApiProperty({
    description: 'The IDs of the participants to be added to the chat room',
    example: ['e74f198b-0599-4805-8d51-eb600b9577ad', 'e74f198b-0599-4805-8d51-eb677b9577ad'],
  })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  @IsOptional()
  participants?: ParticipantDto[];

  @IsString()
  @IsOptional()
  created_by?: string;

  @IsString()
  @IsOptional()
  updated_by?: string;
}
