// src/users/users.controller.ts
import {
    Controller,
    Get,
    Param,
    Patch,
    Body,
    UseGuards,
    Query,
    Request,
  } from '@nestjs/common';
  import { UsersService } from './users.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('users')
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Get()
    findAll() {
      return this.usersService.findAll();
    }
  
    @Get('search')
    search(@Query('q') query: string) {
      return this.usersService.search(query);
    }
  
    @Get('me')
    findMe(@Request() req) {
      return this.usersService.findOne(req.user.id);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.usersService.findOne(id);
    }
  
    @Patch('status')
    updateStatus(@Request() req, @Body() body: { status: string }) {
      return this.usersService.updateStatus(req.user.id, body.status);
    }
  
    @Patch('preferences')
    updatePreferences(@Request() req, @Body() preferences: any) {
      return this.usersService.updatePreferences(req.user.id, preferences);
    }
  }