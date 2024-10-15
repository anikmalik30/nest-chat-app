import { Body, Controller, Get, Post, Query, ConflictException, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { AddParticipantSchema, CreateRoomSchema, ParticipantStatus } from 'src/shared/schemas/chat.schema';
import { Request } from 'express';
import { CognitoAuthGuard } from 'src/shared/guard/cognito-auth.guard';
import { ZodValidationPipe } from 'nestjs-zod';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRoomResponseDto } from './dto/create-room-response.dto';
import { AddParticipantResponseDto } from './dto/add-participant-response.dto';
@ApiTags('Chat')
@ApiBearerAuth('bearer')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Handles the creation of a new chat room.
   *
   * This function accepts room details from the request body and returns the created room details.
   *
   * @param createRoomDto - The room creation data.
   * @param req - The request object containing user information.
   * @returns The created room details or an error message.
   * @throws ConflictException - If the user's own ID is included in the participants array.
   */
  @UseGuards(CognitoAuthGuard)
  @Post('create-room')
  @UsePipes(new ZodValidationPipe(CreateRoomSchema))
  @ApiResponse({
    status: 201,
    description: 'The room has been successfully created.',
    type: CreateRoomResponseDto,
  })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @Req() req: Request) {
    const user = req['user'];
    const userId = user.sub;

    if (createRoomDto.participantIds.includes(userId)) {
      throw new ConflictException({
        message: "You can't include your own user ID in the participants array",
      });
    }

    const participants = createRoomDto.participantIds.map((userId) => ({
      userId,
      status: ParticipantStatus.REQUEST,
      is_deleted: false,
    }));

    const updatedCreateRoomDto = { ...createRoomDto, participants };

    return await this.chatService.createRoom(updatedCreateRoomDto, user.sub);
  }

  /**
   * Handles adding a participant to a chat room.
   *
   * This function accepts participant details from the request body and adds the participant to the specified room.
   *
   * @param addParticipantDto - The data transfer object containing room ID and user IDs to be added.
   * @param req - The request object containing user information.
   * @returns The updated room details or an error message.
   */
  @UseGuards(CognitoAuthGuard)
  @Post('add-participant')
  @UsePipes(new ZodValidationPipe(AddParticipantSchema))
  @ApiResponse({
    status: 200,
    description: 'The Participant has been successfully added to the room.',
    type: AddParticipantResponseDto,
  })
  async handleAddParticipant(@Body() addParticipantDto: AddParticipantDto, @Req() req: Request) {
    const user = req['user'];
    return await this.chatService.addParticipantToRoom(addParticipantDto, user.sub);
  }

  /**
   * Fetches the chat list for a user.
   *
   * This function handles fetching the chat list for a user, including the latest messages and unseen message count.
   *
   * @param query - The query parameters containing the user ID.
   * @returns A promise that resolves to the chat list response.
   */
  @UseGuards(CognitoAuthGuard)
  @Get('chat-list')
  getChatList(@Req() req: Request) {
    const user = req['user'];
    return this.chatService.getChatList(user.sub);
  }

  /**
   * Fetches the chat list for a user where the status is "request".
   *
   * This function handles fetching the chat list for a user where the status is "request".
   *
   * @param query - The query parameters containing the userId and optional status.
   * @returns A promise that resolves to the chat list response.
   */
  @UseGuards(CognitoAuthGuard)
  @Get('request-list')
  getRequestChatList(@Req() req: Request) {
    const user = req['user'];
    return this.chatService.getRequestChatList(user.sub);
  }
}
