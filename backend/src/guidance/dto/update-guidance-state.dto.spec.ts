import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuidanceWalkthroughStatus } from '@prisma/client';
import { UpdateGuidanceStateDto } from './update-guidance-state.dto';

describe('UpdateGuidanceStateDto', () => {
  it('will accept a valid guidance update', async () => {
    const dto = plainToInstance(UpdateGuidanceStateDto, {
      tipsEnabled: false,
      walkthrough: {
        status: GuidanceWalkthroughStatus.IN_PROGRESS,
        currentStep: 3,
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('will reject a walkthrough step below zero', async () => {
    const dto = plainToInstance(UpdateGuidanceStateDto, {
      walkthrough: {
        currentStep: -3,
      },
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('will reject a walkthrough step above four', async () => {
    const dto = plainToInstance(UpdateGuidanceStateDto, {
      walkthrough: {
        currentStep: 6,
      },
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('will reject an invalid walkthrough status', async () => {
    const dto = plainToInstance(UpdateGuidanceStateDto, {
      walkthrough: {
        status: 'INVALID',
      },
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('will reject non boolean guidance preferences', async () => {
    const dto = plainToInstance(UpdateGuidanceStateDto, {
      tipsEnabled: 'yes',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
