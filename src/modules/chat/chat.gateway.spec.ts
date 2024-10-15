import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let service: ChatService;
  let server: Server;
  let socket: Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: {
            joinRoom: jest.fn(),
            leaveRoom: jest.fn(),
            handleMessage: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    service = module.get<ChatService>(ChatService);

    server = gateway.server;
    // socket = new Socket(server, '1');
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  // Add more tests here
});
