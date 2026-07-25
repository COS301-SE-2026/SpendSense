import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validate(body: Record<string, unknown>): Promise<unknown> {
    return validationPipe.transform(body, {
      type: 'body',
      metatype: UpdateProfileDto,
    }) as Promise<unknown>;
  }

  it('accepts valid profile fields', async () => {
    await expect(
      validate({
        displayName: 'Kyle',
        avatarUrl: 'https://example.com/avatar.png',
        monthlyBudget: 2500.5,
        onboardingCompleted: true,
      }),
    ).resolves.toEqual({
      displayName: 'Kyle',
      avatarUrl: 'https://example.com/avatar.png',
      monthlyBudget: 2500.5,
      onboardingCompleted: true,
    });
  });

  it.each([
    ['empty display name', { displayName: '' }],
    ['display name too long', { displayName: 'a'.repeat(81) }],
    ['invalid avatar URL', { avatarUrl: 'not-a-url' }],
    ['negative monthly budget', { monthlyBudget: -1 }],
    ['monthly budget with too many decimals', { monthlyBudget: 10.999 }],
    ['invalid onboarding flag', { onboardingCompleted: 'true' }],
  ])('rejects %s', async (_name, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    'email',
    'id',
    'supabaseAuthId',
    'deletedAt',
    'currentScore',
    'xp',
    'unknownField',
  ])('rejects forbidden or unknown field %s', async (field) => {
    await expect(validate({ [field]: 'not allowed' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
