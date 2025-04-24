// src/rooms/dto/create-room.dto.ts
import { IsString, IsBoolean, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(['video', 'chat', 'general'], { 
    message: 'Type must be one of: video, chat, general'
  })
  type: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}