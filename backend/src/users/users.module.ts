import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { DisplayNameAvailabilityController } from './display-name-availability.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, DisplayNameAvailabilityController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
