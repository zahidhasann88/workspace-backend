// src/rooms/schemas/room.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Workspace } from '../../workspaces/schemas/workspace.schema';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true })
  workspace: Workspace;

  @Prop({ 
    type: String, 
    required: true,
    enum: ['video', 'chat', 'general'],
    default: 'video'
  })
  type: string;

  @Prop({ type: Boolean, default: false })
  isPrivate: boolean;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  activeParticipants: User[];

  @Prop({ type: Object, default: {} })
  mediaSettings: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenShareEnabled: boolean;
    recordingEnabled: boolean;
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const RoomSchema = SchemaFactory.createForClass(Room);