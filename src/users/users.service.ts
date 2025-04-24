// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll() {
    return await this.userModel
      .find()
      .select('-password') // Exclude password
      .exec();
  }

  async findOne(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password') // Exclude password
      .exec();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.userModel
      .findOne({ email })
      .select('-password') // Exclude password
      .exec();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async search(query: string) {
    const searchRegex = new RegExp(query, 'i');
    
    return await this.userModel
      .find({
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
        ],
      })
      .select('-password') // Exclude password
      .exec();
  }

  async updateStatus(id: string, status: string) {
    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.status = status;
    return await user.save();
  }

  async updatePreferences(id: string, preferences: any) {
    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.preferences = {
      ...user.preferences,
      ...preferences,
    };
    
    return await user.save();
  }
}