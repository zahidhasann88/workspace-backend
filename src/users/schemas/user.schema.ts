// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // Add the _id field explicitly for TypeScript
  _id?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;
  
  @Prop({ required: true, unique: true })
  email: string;
  
  @Prop({ required: true })
  password: string;
  
  @Prop({ default: 'user' })
  role: string;
  
  @Prop({ default: 'online' })
  status: string;
  
  @Prop({ type: Object, default: {} })
  preferences: Record<string, any>;
}

export const UserSchema = SchemaFactory.createForClass(User);