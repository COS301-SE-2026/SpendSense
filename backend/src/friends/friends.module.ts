import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [AuthModule, PrismaModule, UsersModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
