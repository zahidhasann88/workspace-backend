// src/rooms/dto/update-room.dto.ts
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['video', 'chat', 'general'], {
    message: 'Type must be one of: video, chat, general'
  })
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsOptional()
  mediaSettings?: {
    audioEnabled?: boolean;
    videoEnabled?: boolean;
    screenShareEnabled?: boolean;
    recordingEnabled?: boolean;
  };
}