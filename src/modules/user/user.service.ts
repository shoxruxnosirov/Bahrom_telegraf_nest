import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from 'src/comman/types';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) { }

  async findByChatId(chatId: number) {
    return this.repo.findOne({ where: { chatId } });
  }

  // async createIfNotExists(data: { chatId: number, username: string | null, name: string, phone: string | null }) {
  //   let user = await this.findByChatId(data.chatId);
  //   if (!user) {
  //     user = this.repo.create(data);
  //     await this.repo.save(user);
  //   }
  //   return user;
  // }

  async createOrUpdate(data: { chatId: number; username: string | null; name: string; phone: string | null }) {
    let user = await this.findByChatId(data.chatId);

    if (!user) {
      user = this.repo.create(data);
    } else {
      // Agar mavjud bo‘lsa, yangilash
      user.username = data.username;
      user.name = data.name;
      user.phone = data.phone;
    }
    return this.repo.save(user); // yangi bo‘lsa insert, mavjud bo‘lsa update qiladi
  }

  async setRole(chatId: number, role: Role) {
    const user = await this.findByChatId(chatId);
    if (user) {
      user.role = role;
      return this.repo.save(user);
    }
    return null;
  }

  async allUsers(roles: Role[]) {
  return this.repo.find({
    where: {
      role: In(roles), // <- bu yerga e'tibor bering
    },
  });
}

}
