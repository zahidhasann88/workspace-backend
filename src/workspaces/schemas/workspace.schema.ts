// src/workspaces/schemas/workspace.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type WorkspaceDocument = Workspace & Document;

@Schema({ timestamps: true })
export class Workspace {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: User;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  members: User[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }] })
  rooms: any[];
  
  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);