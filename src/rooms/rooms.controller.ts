// src/rooms/rooms.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body(ValidationPipe) createRoomDto: CreateRoomDto, @Request() req) {
    return this.roomsService.create(createRoomDto, req.user.id);
  }

  @Get('workspace/:workspaceId')
  findAll(@Param('workspaceId') workspaceId: string, @Request() req) {
    return this.roomsService.findAll(workspaceId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.roomsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body(ValidationPipe) updateRoomDto: UpdateRoomDto, 
    @Request() req
  ) {
    return this.roomsService.update(id, updateRoomDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.roomsService.remove(id, req.user.id);
  }

  @Post(':id/participants/:userId')
  addParticipant(
    @Param('id') id: string,
    @Param('userId') participantId: string,
    @Request() req,
  ) {
    return this.roomsService.addParticipant(id, participantId, req.user.id);
  }

  @Post(':id/tags')
  addTags(
    @Param('id') id: string,
    @Body() body: { tags: string[] },
    @Request() req,
  ) {
    return this.roomsService.addTags(id, body.tags, req.user.id);
  }

  @Delete(':id/tags/:tag')
  removeTag(
    @Param('id') id: string,
    @Param('tag') tag: string,
    @Request() req,
  ) {
    return this.roomsService.removeTag(id, tag, req.user.id);
  }
}