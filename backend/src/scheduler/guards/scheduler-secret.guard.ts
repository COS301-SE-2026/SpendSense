import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SchedulerSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedSecret = process.env.SCHEDULER_SECRET;
    const providedSecret = request.headers['x-scheduler-secret'];

    if (!expectedSecret) {
      throw new UnauthorizedException('Scheduler secret was not configured');
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing scheduler secret');
    }

    return true;
  }
}
