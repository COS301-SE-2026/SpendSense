import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';
import { SimulationTransitionService } from './simulation-transition.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [SimulationsController],
  providers: [SimulationsService, SimulationTransitionService],
})
export class SimulationsModule {}
