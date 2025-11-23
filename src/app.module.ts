import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import * as dotenv from 'dotenv';
import { typeOrmConfig } from './database/data-source';
import { BotModule } from './modules/bot/bot.module';
dotenv.config();

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN!,
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    BotModule
  ],
})
export class AppModule {}
