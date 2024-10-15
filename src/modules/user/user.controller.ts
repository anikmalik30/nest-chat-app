// import { Controller, Get, Param } from '@nestjs/common';
// import { UserService } from './user.service';
// import { Room } from 'src/shared/interfaces/chat.interface';

// @Controller()
// export class UserController {
//   constructor(private userService: UserService) {}

//   @Get('api/rooms')
//   async getAllRooms(): Promise<Room[]> {
//     return await this.userService.getRooms();
//   }

//   @Get('api/rooms/:room')
//   async getRoom(@Param() params): Promise<Room> {
//     const rooms = await this.userService.getRooms();
//     const room = await this.userService.getRoomByName(params.room);
//     return rooms[room];
//   }
// }
