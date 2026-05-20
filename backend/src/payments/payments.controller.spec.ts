import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UsersService } from '../users/users.service';
import type { AuthUser } from 'src/auth/types/auth-user.type';
import { LogPaymentDto } from './dto/log-payment.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const mockPaymentsService = { logPayment: jest.fn() };
  const mockUsersService = { findOrCreateUser: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should find or create the authenticated user and log the payment', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'authUser-id',
      email: 'test@example.com',
    };

    const dto: LogPaymentDto = {
      occurrenceId: 'occurrence-1',
      paidDate: '2026-05-19',
      amountPaid: 751.83,
      notes: 'Paid rent',
    };

    const user = {
      id: 'app-user-1',
      authUserId: 'supabase-user-1',
      email: 'test@example.com',
    };

    const serviceResult = {
      message: 'Payment logged successfully',
      payment: {
        id: 'payment-record-1',
        occurrenceId: dto.occurrenceId,
        amountPaid: dto.amountPaid,
        paymentStatus: 'ON_TIME',
      },
    };

    mockUsersService.findOrCreateUser.mockResolvedValue(user);
    mockPaymentsService.logPayment.mockResolvedValue(serviceResult);

    const result = await controller.logPayment(authUser, dto);
    expect(mockUsersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(mockPaymentsService.logPayment).toHaveBeenCalledWith(dto, user.id);
    expect(result).toEqual(serviceResult);
  });
});
