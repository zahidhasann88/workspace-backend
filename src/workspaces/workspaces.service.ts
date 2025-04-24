// src/workspaces/workspaces.service.ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async create(createWorkspaceDto: CreateWorkspaceDto, userId: string) {
    const newWorkspace = new this.workspaceModel({
      ...createWorkspaceDto,
      owner: userId,
      members: [userId],
    });
   
    return await newWorkspace.save();
  }

  async findAll(userId: string) {
    return await this.workspaceModel
      .find({ members: userId })
      .populate('owner', 'name email')
      .exec();
  }

  async findOne(id: string, userId: string) {
    const workspaceCheck = await this.workspaceModel.findById(id).exec();
 
    if (!workspaceCheck) {
      throw new NotFoundException('Workspace not found');
    }
 
    if (!workspaceCheck.members.includes(userId as any)) {
      throw new UnauthorizedException('You do not have access to this workspace');
    }
 
    const workspace = await this.workspaceModel
      .findById(id)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .populate({
        path: 'rooms',
        populate: [
          { path: 'activeParticipants', select: 'name email' }
        ],
        select: 'name description type isPrivate activeParticipants mediaSettings tags metadata createdAt updatedAt'
      })
      .exec();
 
    return workspace;
  }

  async update(id: string, updateWorkspaceDto: UpdateWorkspaceDto, userId: string) {
    const workspace = await this.workspaceModel.findById(id).exec();
   
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
   
    if (workspace.owner.toString() !== userId) {
      throw new UnauthorizedException('Only the owner can update the workspace');
    }
   
    return await this.workspaceModel
      .findByIdAndUpdate(id, updateWorkspaceDto, { new: true })
      .exec();
  }

  async remove(id: string, userId: string) {
    const workspace = await this.workspaceModel.findById(id).exec();
   
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
   
    if (workspace.owner.toString() !== userId) {
      throw new UnauthorizedException('Only the owner can delete the workspace');
    }
   
    return await this.workspaceModel.findByIdAndDelete(id).exec();
  }

  async addMember(id: string, memberId: string, userId: string) {
    const workspace = await this.workspaceModel.findById(id).exec();
 
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
 
    if (workspace.owner.toString() !== userId) {
      throw new UnauthorizedException('Only the owner can add members');
    }
 
    const memberExists = workspace.members.some(member =>
      member.toString() === memberId
    );
   
    if (!memberExists) {
      workspace.members.push(memberId as any);
      await workspace.save();
    }
 
    return workspace;
  }

  async removeMember(id: string, memberId: string, userId: string) {
    const workspace = await this.workspaceModel.findById(id).exec();
   
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
   
    if (workspace.owner.toString() !== userId) {
      throw new UnauthorizedException('Only the owner can remove members');
    }
   
    if (memberId === workspace.owner.toString()) {
      throw new UnauthorizedException('Cannot remove the owner from the workspace');
    }
   
    workspace.members = workspace.members.filter(
      member => member.toString() !== memberId
    );
   
    await workspace.save();
    return workspace;
  }
}