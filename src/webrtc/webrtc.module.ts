// src/webrtc/webrtc.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebRtcGateway } from './webrtc.gateway';
import { WebRtcService } from './webrtc.service';
import { MediasoupService } from './mediasoup/mediasoup.service';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [WebRtcGateway, WebRtcService, MediasoupService],
  exports: [WebRtcService, MediasoupService],
})
export class WebRtcModule {}