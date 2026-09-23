import { Module } from '@nestjs/common';
import { GuidanceController } from './guidance.controller';
import { GuidanceService } from './guidance.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, PrismaModule, UsersModule],
  controllers: [GuidanceController],
  providers: [GuidanceService],
  exports: [GuidanceService],
})
export class GuidanceModule {}
