import { ApiProperty } from '@nestjs/swagger';

class ParticipantDto {
  @ApiProperty({ example: '260839a8-fc27-4d0b-9cd0-7598dff0a13b' })
  userId: string;

  @ApiProperty({ example: 'REQUEST' })
  status: string;

  @ApiProperty({ example: false })
  is_deleted: boolean;

  @ApiProperty({ example: '66ed3a3a81a132fbd382bf15' })
  _id: string;
}

export class AddParticipantResponseDto {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 'Participant added successfully.' })
  message: string;

  @ApiProperty({
    type: 'object',
    properties: {
      _id: { type: 'string', example: '66ed3a3a81a132fbd382bf14' },
      name: { type: 'string', example: 'Sample Group' },
      type: { type: 'string', example: 'GROUP' },
      status: { type: 'boolean', example: true },
      image: { type: 'string', example: '' },
      participants: { type: 'array', items: { $ref: '#/components/schemas/ParticipantDto' } },
      admins: { type: 'array', items: { type: 'string', example: 'e74f198b-0599-4805-8d51-eb600b9577ad' } },
      created_by: { type: 'string', example: 'e74f198b-0599-4805-8d51-eb600b9577ad' },
      updated_by: { type: 'string', example: 'e74f198b-0599-4805-8d51-eb600b9577ad' },
      is_deleted: { type: 'boolean', example: false },
      createdAt: { type: 'string', example: '2024-09-20T09:02:50.852Z' },
      updatedAt: { type: 'string', example: '2024-09-20T09:04:02.191Z' },
      __v: { type: 'number', example: 0 },
    },
  })
  data: {
    _id: string;
    name: string;
    type: string;
    status: boolean;
    image: string;
    participants: ParticipantDto[];
    admins: string[];
    created_by: string;
    updated_by: string;
    is_deleted: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}
