import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SchedulerSecretGuard } from './scheduler-secret.guard';

function createExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('SchedulerSecretGuard', () => {
  const originalSecret = process.env.SCHEDULER_SECRET;

  beforeEach(() => {
    process.env.SCHEDULER_SECRET = 'tester-secret';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SCHEDULER_SECRET;

      return;
    }
    process.env.SCHEDULER_SECRET = originalSecret;
  });

  it('will reject requests that have the wrong secret header', () => {
    const guard = new SchedulerSecretGuard();
    const context = createExecutionContext({
      headers: {
        'x-scheduler-secret': 'incorrect-value',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Invalid or missing scheduler secret'),
    );
  });

  it('will reject requests that have no secret header', () => {
    const guard = new SchedulerSecretGuard();
    const context = createExecutionContext({
      headers: {},
    });

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Invalid or missing scheduler secret'),
    );
  });

  it('throws if the SCHEDULER_SECRET is not configured', () => {
    delete process.env.SCHEDULER_SECRET;
    const guard = new SchedulerSecretGuard();
    const context = createExecutionContext({
      headers: {
        'x-scheduler-secret': 'something',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Scheduler secret was not configured'),
    );
  });

  it('will accept requests with a correct secret header', () => {
    const guard = new SchedulerSecretGuard();
    const context = createExecutionContext({
      headers: {
        'x-scheduler-secret': 'tester-secret',
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
