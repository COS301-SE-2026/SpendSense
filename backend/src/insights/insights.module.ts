import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
