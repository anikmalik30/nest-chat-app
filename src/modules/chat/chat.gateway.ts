import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Inject, Logger, UseGuards } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { ClientToServerEvents, JoinRoom, ServerToClientEvents } from 'src/shared/interfaces/chat.interface';
import { ZodValidationPipe } from 'src/pipes/zod.pipe';
import { JoinRoomSchema, SendMessageSchema } from 'src/shared/schemas/chat.schema';
import { ChatAuthGuard } from 'src/shared/guard/chat-auth.guard';
import { MessageStatus } from './enums/message-status.enum';
import { CHAT_EVENTS } from './events/chat.events';
import { Redis } from 'ioredis';

@WebSocketGateway(3002, { cors: true })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger(ChatGateway.name);
  // private readonly redisClient: Redis;
  constructor(
    private readonly chatService: ChatService,
    private readonly chatAuthGuard: ChatAuthGuard,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {
    this.redisClient.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  @WebSocketServer() server: Server = new Server<ServerToClientEvents, ClientToServerEvents>();

  /**
   * @function afterInit
   * @hook
   * @description
   *  - Default hook provide by websocket gateway in nest js
   *  - This hook call after init component
   * @param server
   */
  afterInit(server: Server) {
    this.server = server;
    this.logger.log('Chat Gateway Initialized');
  }

  /**
   * Handles a new client connection to the WebSocket gateway.
   *
   * This method is called when a client connects to the WebSocket server. It:
   * 1. Verifies the client's token.
   * 2. Attaches the user ID to the client object.
   * 3. Stores the client ID in Redis.
   * 4. Emits unread messages to the client.
   * 5. Logs the connection event.
   *
   * If an error occurs, the client is disconnected and an error is logged.
   *
   * @param client - The client socket that has connected.
   * @returns Resolves when connection handling is complete.
   * @throws If token verification or any other step fails.
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const user = await this.chatAuthGuard.verifyToken(client);

      const userId = user.sub;
      client['userId'] = userId;
      client['user'] = user;

      await this.redisClient.set(`user:${userId}`, client.id);

      const unreadMessages = await this.handleUnreadMessages(client);

      client.emit(CHAT_EVENTS.UNREAD_MESSAGES, unreadMessages);

      this.logger.log(`User ${userId} connected with socket ID: ${client.id}`);
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handles client disconnection from the WebSocket gateway.
   *
   * This method is called when a client disconnects from the WebSocket server. It:
   * 1. Logs the disconnection event.
   * 2. Removes the client ID from Redis.
   * 3. Logs the user disconnection event.
   *
   * @param client - The client socket that has disconnected.
   * @returns void
   */
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
    const userId = client['userId'];
    if (userId) {
      await this.redisClient.del(`user:${userId}`);
      this.logger.log(`User disconnected: ${userId}`);
    }
  }

  /**
   * Handles the join room event.
   *
   * This method is called when a client requests to join a room. It:
   * 1. Verifies the client's authorization to join the room.
   * 2. Joins the client to the room.
   * 3. Loads and emits messages to the client.
   * 4. Logs the join room event.
   *
   * @param joinRoom - The data containing roomId.
   * @param client - The client socket that is joining the room.
   * @returns An object indicating the success or failure of the operation.
   */
  @SubscribeMessage(CHAT_EVENTS.JOIN_ROOM)
  @UseGuards(ChatAuthGuard)
  async handleJoinRoom(
    @MessageBody(new ZodValidationPipe(JoinRoomSchema)) joinRoom: JoinRoom,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { roomId } = joinRoom;
      const user = client['user'];
      const userId = user.sub;

      client['roomId'] = roomId;
      client['userId'] = userId;

      const room = await this.chatService.getRoom(roomId);
      if (!room) {
        throw new WsException('Room not found');
      }

      const isAuthorized = await this.chatService.isUserInRoom(roomId, userId);

      if (!isAuthorized) {
        throw new WsException('You are not authorized to join this room');
      }

      client.join(roomId);

      this.logger.log(`User ${userId} joined room ${roomId}`);

      this.redisClient.del(`messageStatus:${userId}:${roomId}:*`);

      const loadMessagesResponse = await this.handleLoadMessages(client);
      client.emit(CHAT_EVENTS.LOAD_MESSAGES, loadMessagesResponse);

      return { success: true, message: 'Room joined successfully.', roomId };
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`);
      if (error instanceof WsException) {
        return { success: false, message: error.message };
      }

      return { success: false, message: 'An error occurred while joining the room' };
    }
  }

  /**
   * Handles the leave room event.
   *
   * This method is called when a client requests to leave a room. It:
   * 1. Verifies the client's authorization to leave the room.
   * 2. Removes the client from the room.
   * 3. Deletes message status from Redis.
   * 4. Emits unread messages to the client.
   * 5. Logs the leave room event.
   *
   * @param client - The client socket that is leaving the room.
   * @returns An object indicating the success or failure of the operation.
   */
  @UseGuards(ChatAuthGuard)
  @SubscribeMessage(CHAT_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const user = client['user'];
    const roomId = client['roomId'];
    const userId = user.sub;
    try {
      const room = await this.chatService.getRoom(roomId);
      if (!room) {
        return { success: false, message: 'Room not found' };
      }

      const isAuthorized = await this.chatService.isUserInRoom(roomId, userId);

      if (!isAuthorized) {
        return { success: false, message: 'You are not authorized to leave this room' };
      }

      client.leave(roomId);
      await this.redisClient.del(`messageStatus:${userId}:${roomId}:*`);
      const unreadMessages = await this.handleUnreadMessages(client);
      client.emit(CHAT_EVENTS.UNREAD_MESSAGES, unreadMessages);

      this.logger.log(`User ${userId} left room ${roomId}`);

      return { success: true, message: 'Room left successfully.' };
    } catch (error) {
      this.logger.error(`Failed to leave room: ${error.message}`);
      return { success: false, message: 'An error occurred while leaving the room' };
    }
  }

  /**
   * Handles the send message event.
   *
   * This method is called when a client sends a message. It:
   * 1. Verifies the client's authorization to send the message.
   * 2. Saves the message and emits the event to the client.
   * 3. Updates message status based on the recipient's connection status.
   * 4. Logs the send message event.
   *
   * @param sendMessageDto - The data transfer object containing the message details.
   * @param client - The client socket that is sending the message.
   * @returns An object indicating the success or failure of the operation.
   */
  @SubscribeMessage(CHAT_EVENTS.MESSAGE)
  @UseGuards(ChatAuthGuard)
  async handleSendMessage(
    @MessageBody(new ZodValidationPipe(SendMessageSchema)) sendMessageDto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { message } = sendMessageDto;

      const roomId = client['roomId'];

      if (!roomId) {
        return { success: false, message: 'You are not in a room' };
      }

      const user = client['user'];
      const senderId = user.sub;

      const room = await this.chatService.getRoom(roomId);
      if (!room) {
        return { success: false, message: 'Room not found' };
      }
      const isAuthorized = await this.chatService.isUserInRoom(roomId, senderId);
      if (!isAuthorized) {
        return { success: false, message: 'You are not a participant of this room' };
      }

      const participants = room.participants
        .map((participant) => participant.userId)
        .filter((userId) => userId !== senderId);

      const savedMessage = await this.chatService.saveMessage(roomId, senderId, message, participants);

      const roomClients = this.server.sockets.adapter.rooms.get(roomId);
      const connectedSockets = this.server.sockets.sockets;

      for (const participantId of participants) {
        let status = MessageStatus.SENT;

        // Check if the participant is connected using Redis
        const clientId = await this.redisClient.get(`user:${participantId}`);

        if (clientId) {
          const socket = connectedSockets.get(clientId);
          if (socket) {
            if (roomClients && roomClients.has(clientId)) {
              // User is in the room
              status = MessageStatus.SEEN;
              await this.redisClient.set(
                `messageStatus:${participantId}:${roomId}:${savedMessage._id.toString()}`,
                status,
              );
              await this.chatService.updateMessageStatus(savedMessage._id.toString(), participantId, status);
            } else {
              // User is connected but not in the room
              status = MessageStatus.DELIVERED;
              socket.emit(CHAT_EVENTS.NEW_MESSAGE, { roomId });

              await this.redisClient.set(
                `messageStatus:${participantId}:${roomId}:${savedMessage._id.toString()}`,
                status,
              );
              await this.chatService.updateMessageStatus(savedMessage._id.toString(), participantId, status);

              const unreadMessages = await this.handleUnreadMessages(socket);
              socket.emit(CHAT_EVENTS.UNREAD_MESSAGES, unreadMessages);
            }
          }
        } else {
          await this.redisClient.set(`messageStatus:${participantId}:${roomId}:${savedMessage._id.toString()}`, status);
        }
      }

      client.to(roomId).emit(CHAT_EVENTS.MESSAGE, { status: 'received', senderId, message, roomId });

      return { status: 'sent', message: 'Success' };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      return { success: false, message: 'An error occurred while sending the message' };
    }
  }

  /**
   * Handles the load messages event.
   *
   * This method is called when a client requests to load messages for a room. It:
   * 1. Verifies the client's authorization to load messages.
   * 2. Fetches messages for the room.
   * 3. Updates message status to 'seen' for unread messages.
   * 4. Emits the messages to the client.
   * 5. Logs the load messages event.
   *
   * @param client - The client socket that is requesting to load messages.
   * @returns An object indicating the success or failure of the operation.
   */
  @SubscribeMessage(CHAT_EVENTS.LOAD_MESSAGES)
  @UseGuards(ChatAuthGuard)
  async handleLoadMessages(@ConnectedSocket() client: Socket) {
    try {
      const userId = client['userId'];
      const roomId = client['roomId'];
      if (!roomId) {
        return { success: false, message: 'You are not in a room' };
      }

      // Fetch messages for the room
      const messages = await this.chatService.getMessagesForRoom(roomId);

      if (!messages) {
        return { success: false, message: 'Failed to load messages' };
      }

      // Update message status to 'seen' for unread messages for this user
      const unreadMessages = messages.filter((message) => {
        const receiver = message.receivers.find((r) => r.userId === userId);
        return receiver && receiver.status !== MessageStatus.SEEN;
      });

      if (!unreadMessages.length) {
        return { success: true, messages };
      }
      for (const message of unreadMessages) {
        await this.chatService.updateMessageStatus(message._id.toString(), userId, MessageStatus.SEEN);
        this.redisClient.del(`messageStatus:${userId}:${roomId}:${message._id.toString()}`);
        client.emit(CHAT_EVENTS.MESSAGE, { status: 'SEEN', message });
      }

      return { success: true, messages };
    } catch (error) {
      this.logger.error(`Failed to load messages: ${error.message}`);
      return { success: false, message: 'An error occurred while loading messages' };
    }
  }

  /**
   * Handles the unread messages event.
   *
   * @description
   * This method is called when a client requests to fetch unread messages. It:
   * 1. Fetches unread messages from Redis.
   * 2. Updates message status to 'delivered' in Redis and the database.
   * 3. Emits the unread messages count to the client.
   * 4. Logs the unread messages event.
   *
   * @param client - The client socket that is requesting unread messages.
   * @returns An object indicating the success or failure of the operation, along with unread message counts.
   */
  @SubscribeMessage(CHAT_EVENTS.UNREAD_MESSAGES)
  @UseGuards(ChatAuthGuard)
  async handleUnreadMessages(@ConnectedSocket() client: Socket) {
    try {
      const userId = client['userId'];

      let totalUnreadCount = 0;
      const roomUnreadCounts: Record<string, number> = {};

      // Fetch all message status keys for the user
      const unreadKeys = await this.redisClient.keys(`messageStatus:${userId}:*`);

      for (const key of unreadKeys) {
        const messageStatus = await this.redisClient.get(key);

        if (messageStatus === MessageStatus.SENT || messageStatus === MessageStatus.DELIVERED) {
          // Extract roomId from the key if included, e.g., `messageStatus:${userId}:${roomId}:${messageId}`
          const [, , roomId] = key.split(':');

          // Update total unread count
          totalUnreadCount += 1;

          // Update unread count per room
          if (roomId) {
            roomUnreadCounts[roomId] = (roomUnreadCounts[roomId] || 0) + 1;
          }

          // update message status to DELIVERED in Redis
          await this.redisClient.set(key, MessageStatus.DELIVERED);

          // update in the database as well
          const messageId = key.split(':').pop();
          await this.chatService.updateMessageStatus(messageId, userId, MessageStatus.DELIVERED);
        }
      }

      return { success: true, totalUnreadCount, roomUnreadCounts };
    } catch (error) {
      this.logger.error(`Failed to fetch unread message counts: ${error.message}`);
      return { success: false, message: 'Failed to fetch unread message counts' };
    }
  }
}
