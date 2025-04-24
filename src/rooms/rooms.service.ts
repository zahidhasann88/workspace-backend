// src/rooms/rooms.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import {
  Workspace,
  WorkspaceDocument,
} from '../workspaces/schemas/workspace.schema';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async create(createRoomDto: any, userId: string | any) {
    const workspaceId = createRoomDto.workspaceId;
    delete createRoomDto.workspaceId;
    
    createRoomDto.workspace = workspaceId;
    
    const workspace = await this.workspaceModel
      .findById(workspaceId)
      .exec();
  
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
  
    const userIdStr = typeof userId === 'object' ? userId.toString() : userId;
  
    const isAuthorized = workspace.members.some((member) => {
      const memberStr = member.toString();
      return memberStr === userIdStr;
    });
  
    if (!isAuthorized) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }
  
    const newRoom = new this.roomModel(createRoomDto);
    const savedRoom = await newRoom.save();
  
    workspace.rooms.push(savedRoom._id);
    await workspace.save();
  
    return savedRoom;
  }

  async findAll(workspaceId: string, userId: any) {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const userIdStr = userId.toString();

    const isAuthorized = workspace.members.some(
      (member) => member.toString() === userIdStr,
    );

    if (!isAuthorized) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }

    // Find all rooms in workspace
    return await this.roomModel
      .find({ workspace: workspaceId })
      .populate('activeParticipants', 'name email')
      .exec();
  }

  async findOne(id: string, userId: any) {
    const room = await this.roomModel
      .findById(id)
      .populate('workspace')
      .populate('activeParticipants', 'name email')
      .exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user has access to workspace
    const workspace = await this.workspaceModel.findById(room.workspace).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is a member of this workspace
    const isAuthorized = workspace.members.some(
      (member) => member.toString() === userIdStr,
    );

    if (!isAuthorized) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }

    return room;
  }

  async update(id: string, updateRoomDto: any, userId: any) {
    const room = await this.roomModel.findById(id).populate('workspace').exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user has access to workspace
    const workspace = await this.workspaceModel.findById(room.workspace).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is the workspace owner
    if (workspace.owner.toString() !== userIdStr) {
      throw new UnauthorizedException(
        'Only the workspace owner can update rooms',
      );
    }

    return await this.roomModel
      .findByIdAndUpdate(id, updateRoomDto, { new: true })
      .exec();
  }

  async remove(id: string, userId: any) {
    const room = await this.roomModel.findById(id).populate('workspace').exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user has access to workspace
    const workspace = await this.workspaceModel.findById(room.workspace).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is the workspace owner
    if (workspace.owner.toString() !== userIdStr) {
      throw new UnauthorizedException(
        'Only the workspace owner can delete rooms',
      );
    }

    // Remove room from workspace
    workspace.rooms = workspace.rooms.filter(
      (roomId) => roomId.toString() !== id,
    );
    await workspace.save();

    // Delete room
    return await this.roomModel.findByIdAndDelete(id).exec();
  }

  async addParticipant(roomId: string, participantId: string, userId: any) {
    const room = await this.roomModel
      .findById(roomId)
      .populate('workspace')
      .exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user has access to workspace
    const workspace = await this.workspaceModel.findById(room.workspace).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is a member of this workspace
    const isAuthorized = workspace.members.some(
      (member) => member.toString() === userIdStr,
    );

    if (!isAuthorized) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }

    // Check if participant is a member of the workspace
    const participantIsMember = workspace.members.some(
      (member) => member.toString() === participantId,
    );

    if (!participantIsMember) {
      throw new UnauthorizedException(
        'Participant is not a member of this workspace',
      );
    }

    // Add participant if not already in the room
    if (!room.activeParticipants.some((p) => p.toString() === participantId)) {
      room.activeParticipants.push(
        new Types.ObjectId(participantId) as unknown as User,
      );
      await room.save();
    }

    return room;
  }

  async addTags(roomId: string, tags: string[], userId: any) {
    const room = await this.roomModel
      .findById(roomId)
      .populate('workspace')
      .exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user has access to workspace
    const workspace = await this.workspaceModel.findById(room.workspace).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is a member of this workspace
    const isAuthorized = workspace.members.some(
      (member) => member.toString() === userIdStr,
    );

    if (!isAuthorized) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }

    // Add tags that don't already exist
    const uniqueTags = [...new Set([...room.tags, ...tags])];
    room.tags = uniqueTags;
    await room.save();

    return room;
  }

  async removeTag(roomId: string, tag: string, userId: any) {
    const room = await this.roomModel
      .findById(roomId)
      .populate('workspace')
      .exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user has access to workspace
    const workspace = await this.workspaceModel.findById(room.workspace).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is a member of this workspace
    const isAuthorized = workspace.members.some(
      (member) => member.toString() === userIdStr,
    );

    if (!isAuthorized) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }

    // Remove the tag
    room.tags = room.tags.filter((t) => t !== tag);
    await room.save();

    return room;
  }
}
