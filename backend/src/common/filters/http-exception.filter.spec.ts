import { ConflictException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('returns safe fictional balances for insufficient simulation funds only', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/api/v1/simulations/session/obligations/id/pay',
        }),
        getResponse: () => response,
      }),
    };

    new HttpExceptionFilter().catch(
      new ConflictException({
        message: 'INSUFFICIENT_SIMULATION_FUNDS',
        currentBalance: '500.00',
        savingsBalance: '200.00',
        remainingAmount: '500.00',
      }),
      host as unknown as ArgumentsHost,
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'INSUFFICIENT_SIMULATION_FUNDS',
        currentBalance: '500.00',
        savingsBalance: '200.00',
        remainingAmount: '500.00',
      }),
    );
  });
});
