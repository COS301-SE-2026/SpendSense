import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DisplayNameAvailabilityDto } from './display-name-availability.dto';

describe('DisplayNameAvailabilityDto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validate(query: Record<string, unknown>): Promise<unknown> {
    return validationPipe.transform(query, {
      type: 'query',
      metatype: DisplayNameAvailabilityDto,
    }) as Promise<unknown>;
  }

  it('trims a valid display name', async () => {
    await expect(validate({ displayName: '  New User  ' })).resolves.toEqual({
      displayName: 'New User',
    });
  });

  it.each([
    ['missing display name', {}],
    ['empty display name', { displayName: '   ' }],
    ['display name too long', { displayName: 'a'.repeat(81) }],
  ])('rejects %s', async (_name, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
