import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom } from './schemas/chat-room.schema';
import { Message } from './schemas/message.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { response } from 'src/shared/utils/response.util';
import { AddParticipantDto } from './dto/add-participant.dto';
import { ParticipantStatus, RoomType } from 'src/shared/schemas/chat.schema';
import { ChatListResponseDto } from './dto/chat-list-response.dto';
import { MessageStatus } from './enums/message-status.enum';

@Injectable()
export class ChatService {
  private readonly logger: Logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoom>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
  ) {}

  /**
   * Creates a new chat room.
   *
   * This function handles the creation of a new chat room. It accepts room details from the request body
   * and returns the created room details or an error message.
   *
   * @param createRoomDto - The room creation data.
   * @param userId - The ID of the user creating the room.
   * @returns The created room details or an error message.
   * @throws ConflictException - If a single room with the same participants already exists or if more than one participant is provided for a single room.
   * @throws BadRequestException - If the request cannot be processed.
   */
  async createRoom(createRoomDto: CreateRoomDto, userId: string) {
    const { name, type, image, participants } = createRoomDto;
    try {
      if (type === RoomType.SINGLE) {
        const participantUserId = participants[0].userId;
        const existingRoom = await this.chatRoomModel.findOne({
          type: RoomType.SINGLE,
          $and: [{ 'participants.userId': userId }, { 'participants.userId': participantUserId }],
        });

        if (existingRoom) {
          throw new ConflictException({
            message: 'A single room with this user already exists',
          });
        }

        if (participants.length !== 1) {
          throw new ConflictException({
            message: "You can't provide more than one participant for a single room",
          });
        }
      }

      participants.push({ userId, status: ParticipantStatus.ACCEPT, is_deleted: false });

      const room = new this.chatRoomModel({
        name,
        type,
        image,
        status: true,
        participants,
        admins: [userId],
        created_by: userId,
        updated_by: userId,
      });
      await room.save();
      // return response(HttpStatus.CREATED, await this.translationService.translate('CREATE_USER_SUCCESSFULLY'), room);
      return response(HttpStatus.CREATED, 'CREATE_USER_SUCCESSFULLY', room);
    } catch (err) {
      const conflictErr = err.response;
      this.logger.error(`Error creating room: ${err.message}`);
      if (err instanceof ConflictException && conflictErr) throw new ConflictException(conflictErr);
      // else throw new BadRequestException(await this.translationService.translate('NOT_ABLE_TO_PROCESS_REQUEST'));
      else throw new BadRequestException('Not able to process request');
    }
  }

  /**
   * Checks if a user is in a room.
   *
   * This function checks if the given user is in the room with the given ID.
   * It returns true if the user is in the room, and false otherwise.
   *
   * @param roomId - The ID of the room.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to a boolean indicating whether the user is in the room.
   */
  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.chatRoomModel
      .findOne({
        _id: roomId,
        'participants.userId': userId,
      })
      .exec();

    return !!room;
  }

  /**
   * Gets a chat room by ID.
   *
   * This function retrieves a chat room with the given ID. If the room is not found,
   * it throws a NotFoundException.
   *
   * @param roomId - The ID of the chat room.
   * @returns A promise that resolves to the chat room.
   * @throws NotFoundException - If the chat room is not found.
   */
  async getRoom(roomId: string): Promise<ChatRoom> {
    const room = await this.chatRoomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException(`Chat room with ID ${roomId} not found`);
    }
    return room;
  }

  /**
   * Saves a message to the database.
   *
   * This function saves a message to the database with the given room ID, sender ID, message content,
   * and receiver IDs. It initializes the message status for each receiver as 'SENT'.
   *
   * @param roomId - The ID of the room where the message is sent.
   * @param senderId - The ID of the user sending the message.
   * @param message - The content of the message.
   * @param receiverIds - The IDs of the users receiving the message.
   * @returns A promise that resolves to the saved message.
   */
  async saveMessage(roomId: string, senderId: string, message: string, receiverIds: string[]): Promise<Message> {
    const receivers = receiverIds.map((userId) => ({
      userId,
      status: MessageStatus.SENT, // Initial status
      is_deleted: false,
    }));
    const newMessage = new this.messageModel({
      room_id: roomId,
      sender_id: senderId,
      message,
      created_by: senderId,
      updated_by: senderId,
      receivers,
    });
    return newMessage.save();
  }

  /**
   * Updates the status of a message.
   *
   * This function updates the status of a message for a specific user.
   *
   * @param messageId - The ID of the message to update.
   * @param userId - The ID of the user whose message status is being updated.
   * @param status - The new status of the message.
   * @returns A promise that resolves to the result of the update operation.
   */
  async updateMessageStatus(messageId: string, userId: string, status: MessageStatus) {
    return await this.messageModel.updateOne(
      { _id: messageId, 'receivers.userId': userId },
      { $set: { 'receivers.$.status': status } },
    );
  }

  /**
   * Adds participants to a chat room.
   *
   * This function handles the event of adding participants to a chat room. It:
   * 1. Verifies the room exists.
   * 2. Checks if the current user is an admin of the room.
   * 3. Ensures the room is a group room.
   * 4. Prevents the current user from adding themselves.
   * 5. Checks for duplicate participants.
   * 6. Adds new participants to the room.
   *
   * @param addParticipantDto - The data transfer object containing room ID and user IDs to be added.
   * @param currentUserId - The ID of the current user performing the action.
   * @returns A promise that resolves to the updated room details.
   * @throws ConflictException - If the user is already in the room or tries to add themselves.
   * @throws BadRequestException - If the request cannot be processed.
   * @throws NotFoundException - If the room is not found.
   * @throws UnauthorizedException - If the user is not an admin or tries to add participants to a private room.
   */
  async addParticipantToRoom(addParticipantDto: AddParticipantDto, currentUserId: string) {
    const { roomId, userIds } = addParticipantDto;

    try {
      const room = await this.getRoom(roomId);

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const isAdmin = room.admins.some((admin) => admin === currentUserId);
      if (!isAdmin) {
        throw new UnauthorizedException('Only admins can add participants to the room');
      }

      if (room.type !== RoomType.GROUP) {
        throw new UnauthorizedException('Cannot add participants to a private room');
      }
      if (userIds.includes(currentUserId)) {
        throw new ConflictException("You can't include your own user ID in the participants array");
      }

      const existingParticipants = room.participants.map((participant) => participant.userId);
      const duplicateUserIds = userIds.filter((userId) => existingParticipants.includes(userId));

      if (duplicateUserIds.length > 0) {
        throw new ConflictException(`User(s) already in room: ${duplicateUserIds.join(', ')}`);
      }

      const newParticipants = userIds.map((userId) => ({
        userId,
        status: ParticipantStatus.REQUEST,
        is_deleted: false,
      }));

      const result = await this.chatRoomModel
        .findOneAndUpdate(
          { _id: roomId, type: RoomType.GROUP },
          { $addToSet: { participants: { $each: newParticipants } } },
          { new: true },
        )
        .exec();

      return response(HttpStatus.OK, 'Participant added successfully.', result);
    } catch (err) {
      this.logger.error(`Error adding participant: ${err.message}`);
      if (
        err instanceof NotFoundException ||
        err instanceof UnauthorizedException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      // else throw new BadRequestException(await this.translationService.translate('NOT_ABLE_TO_PROCESS_REQUEST'));
      else throw new BadRequestException('NOT_ABLE_TO_PROCESS_REQUEST');
    }
  }

  /**
   * Gets messages for a room.
   *
   * This function retrieves all messages for the specified room, sorted by creation date.
   *
   * @param roomId - The ID of the room.
   * @returns A promise that resolves to an array of messages.
   */
  async getMessagesForRoom(roomId: string): Promise<Message[]> {
    return this.messageModel.find({ room_id: roomId }).sort({ createdAt: 1 }).exec();
  }

  /**
   * Gets a message by ID.
   *
   * This function retrieves a message with the specified ID.
   *
   * @param messageId - The ID of the message.
   * @returns A promise that resolves to the message.
   */
  async getMessageById(messageId: string): Promise<Message> {
    return this.messageModel.findById(messageId).exec();
  }

  /**
   * Fetches chat rooms list and their latest messages for a user.
   *
   * This function retrieves the list of chat rooms and their latest messages for the specified user,
   * including the count of unseen messages.
   *
   * @param query - The query parameters containing the user ID.
   * @returns A promise that resolves to the chat list response.
   */
  async getChatList(userId: string): Promise<ChatListResponseDto<ChatListResponse>> {
    try {
      const status = ParticipantStatus.ACCEPT;

      const chatList = await this.fetchChatList(userId, status);

      return response(HttpStatus.OK, 'Chat list fetched successfully.', chatList);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException('NOT_ABLE_TO_PROCESS_REQUEST');
    }
  }

  /**
   * Fetches the chat list for a user where the status is "REQUEST".
   *
   * This function handles fetching the chat list for a user where the status is "REQUEST".
   *
   * @param query - The query parameters containing the userId and optional status.
   * @returns A promise that resolves to the chat list response.
   * @throws BadRequestException - If the request cannot be processed.
   */
  async getRequestChatList(userId: string): Promise<ChatListResponseDto<ChatListResponse>> {
    try {
      const status = ParticipantStatus.REQUEST;

      const chatList = await this.fetchChatList(userId, status);

      return response(HttpStatus.OK, 'Request list fetched successfully.', chatList);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException('NOT_ABLE_TO_PROCESS_REQUEST');
    }
  }

  /**
   * Fetches the chat list by user ID and status.
   *
   * This function retrieves the chat list for a user based on their user ID and status.
   * It fetches chat rooms and messages in parallel, maps messages to their respective rooms,
   * and transforms the data into the desired format.
   *
   * @param userId - The ID of the user.
   * @param status - The status of the chat rooms to fetch.
   * @returns A promise that resolves to an array of chat list responses.
   * @throws BadRequestException - If the request cannot be processed.
   */
  async fetchChatList(userId: string, status: string): Promise<ChatListResponse[]> {
    try {
      // Fetch chat rooms and messages in parallel
      const [rooms, messages] = await Promise.all([
        this.chatRoomModel.find({ participants: { $elemMatch: { userId: userId, status: status } } }).exec(),
        this.messageModel.find({ 'participants.userId': userId }).exec(),
      ]);

      // Create a map of roomId to messages
      const messagesMap = messages.reduce((acc, message) => {
        const roomId = message.room_id.toString();
        if (!acc[roomId]) {
          acc[roomId] = [];
        }
        acc[roomId].push(message);
        return acc;
      }, {});

      // Transform data to the desired format
      const chatList = rooms.map((room) => {
        const roomMessages = messagesMap[room._id.toString()] || [];
        const latestMessage = roomMessages.sort(
          (a: { createdAt: string | number | Date }, b: { createdAt: string | number | Date }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];

        // Calculate not_seen_count
        const notSeenCount = roomMessages.reduce((count: number, message: { receivers: any[] }) => {
          const receiver = message.receivers.find(
            (receiver: { userId: string; status: string }) => receiver.userId === userId && receiver.status !== 'SEEN',
          );
          return receiver ? count + 1 : count;
        }, 0);

        return {
          _id: room._id.toString(),
          name: room.name,
          image: room.image,
          type: room.type,
          status: room.status.toString(),
          participants: room.participants,
          user_status: room.participants.find((participant: { userId: string }) => participant.userId === userId)
            .status,
          message: latestMessage ? latestMessage.message : null,
          sender_id: latestMessage ? latestMessage.sender_id : null,
          createdAt: latestMessage ? latestMessage.createdAt : null,
          not_seen_count: notSeenCount,
        };
      });

      return chatList;
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException('NOT_ABLE_TO_PROCESS_REQUEST');
    }
  }
}
