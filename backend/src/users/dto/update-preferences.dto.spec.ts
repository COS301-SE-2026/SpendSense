import { UpdatePreferencesDto } from './update-preferences.dto';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

describe('UpdatePreferencesDto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validate(body: Record<string, unknown>): Promise<unknown> {
    return validationPipe.transform(body, {
      type: 'body',
      metatype: UpdatePreferencesDto,
    }) as Promise<unknown>;
  }

  it('will accept valid preference fields', async () => {
    await expect(
      validate({
        theme: 'LIGHT',
        language: 'en',
        currency: 'ZAR',
        reducedMotion: true,
      }),
    ).resolves.toEqual({
      theme: 'LIGHT',
      language: 'en',
      currency: 'ZAR',
      reducedMotion: true,
    });
  });

  it('will accept a partial update to preferences', async () => {
    await expect(validate({ theme: 'LIGHT' })).resolves.toEqual({
      theme: 'LIGHT',
    });
  });

  it.each([
    ['invalid theme', { theme: 'MONOCHROME' }],
    ['language not supported', { language: 'af' }],
    ['language is too long', { language: 'british-english' }],
    ['invalid currency', { currency: 'BOB' }],
    ['invalid reducedMotion type', { reducedMotion: 'no' }],
  ])('rejects %s', async (_name, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['id', 'userId', 'createdAt', 'unknownField'])(
    'will reject unknown or forbidden field %s',

    async (field) => {
      await expect(validate({ [field]: 'not allowed' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});
