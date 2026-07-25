import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SchedulerSecretGuard } from './guards/scheduler-secret.guard';
import { SchedulerService } from './scheduler.service';

@ApiTags('scheduler')
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @ApiOperation({
    description:
      'runs due reminder occurrence and processing immediately. Protected by a shared secret header.',
    summary: 'Manually triggers the scheduler job',
  })
  @ApiOkResponse({
    description: 'Processing the counts for this run.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid secret header.',
  })
  @Post('run')
  @UseGuards(SchedulerSecretGuard)
  async runManually() {
    return this.schedulerService.runAll();
  }
}
