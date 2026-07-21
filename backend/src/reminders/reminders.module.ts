import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [UsersModule, AuthModule, PrismaModule],
    controllers: [RemindersController],
    providers: [RemindersService],
    exports: [RemindersService],
})
export class RemindersModule {}
