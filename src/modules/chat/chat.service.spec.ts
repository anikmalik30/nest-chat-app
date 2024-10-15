// import { Test, TestingModule } from '@nestjs/testing';
// import { ChatService } from './chat.service';
// import { ChatRoom } from './schemas/chat-room.schema';
// import { Model } from 'mongoose';
// import { getModelToken } from '@nestjs/mongoose';

// describe('ChatService', () => {
//   let service: ChatService;
//   let chatRoomModel: Model<ChatRoom>;
//   let chatMessageModel: Model<ChatMessage>;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         ChatService,
//         {
//           provide: getModelToken(ChatRoom.name),
//           useValue: {
//             find: jest.fn(),
//             exec: jest.fn(),
//           },
//         },
//         {
//           provide: getModelToken(ChatMessage.name),
//           useValue: {
//             save: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get<ChatService>(ChatService);
//     chatRoomModel = module.get(getModelToken(ChatRoom.name));
//     chatMessageModel = module.get(getModelToken(ChatMessage.name));
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   //Add more test here
// });
