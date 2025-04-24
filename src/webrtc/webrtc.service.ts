// src/webrtc/webrtc.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class WebRtcService {
  private activeRooms: Map<
    string,
    {
      activeUsers: Map<string, { userId: string; mediaSettings: any }>;
      metadata: any;
    }
  > = new Map();

  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async joinRoom(roomId: string, userId: string, mediaSettings?: any) {
    // Validate that room exists
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Validate that user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Initialize room if not already active
    if (!this.activeRooms.has(roomId)) {
      this.activeRooms.set(roomId, {
        activeUsers: new Map(),
        metadata: {
          name: room.name,
          description: room.description,
          workspaceId: room.workspace,
        },
      });
    }

    // Add user to active room - with null check
    const activeRoom = this.activeRooms.get(roomId);
    if (activeRoom) {
      activeRoom.activeUsers.set(userId, {
        userId,
        mediaSettings: mediaSettings || {
          audioEnabled: true,
          videoEnabled: true,
          screenShareEnabled: false,
        },
      });
    }

    // Update room document with active participant
    await this.roomModel.findByIdAndUpdate(roomId, {
      $addToSet: { activeParticipants: userId },
    });

    return {
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        workspaceId: room.workspace,
      },
      activeUsers: activeRoom
        ? Array.from(activeRoom.activeUsers.values())
        : [],
    };
  }

  async leaveRoom(roomId: string, userId: string) {
    const activeRoom = this.activeRooms.get(roomId);
    if (!activeRoom) {
      return true; // Room not active, nothing to do
    }

    // Remove user from active room
    activeRoom.activeUsers.delete(userId);

    // If room is empty, remove it from active rooms
    if (activeRoom.activeUsers.size === 0) {
      this.activeRooms.delete(roomId);
    }

    // Update room document to remove active participant
    await this.roomModel.findByIdAndUpdate(roomId, {
      $pull: { activeParticipants: userId },
    });

    return true;
  }

  async updateMediaSettings(
    roomId: string,
    userId: string,
    mediaSettings: any,
  ) {
    const activeRoom = this.activeRooms.get(roomId);
    if (!activeRoom) {
      throw new Error('Room not active');
    }

    const userInfo = activeRoom.activeUsers.get(userId);
    if (!userInfo) {
      throw new Error('User not in room');
    }

    // Update media settings
    userInfo.mediaSettings = {
      ...userInfo.mediaSettings,
      ...mediaSettings,
    };

    activeRoom.activeUsers.set(userId, userInfo);

    return userInfo;
  }

  getActiveUsers(roomId: string) {
    const activeRoom = this.activeRooms.get(roomId);
    if (!activeRoom) {
      return [];
    }

    return Array.from(activeRoom.activeUsers.values());
  }
}
