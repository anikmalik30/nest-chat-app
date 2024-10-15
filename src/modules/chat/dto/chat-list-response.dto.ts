import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class ChatListResponseDto<T> {
  @ApiProperty()
  @IsNumber()
  @Expose()
  status = 200;

  @ApiProperty()
  @IsString()
  @Expose()
  message = 'success';

  @ApiProperty()
  @IsArray()
  @Expose()
  data: T[] = [];
}
