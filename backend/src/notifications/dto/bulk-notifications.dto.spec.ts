import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from '@jest/globals';
import { BulkNotificationIdsDto } from './bulk-notifications.dto';

describe('BulkNotificationIdsDto', () => {
  it('accepts a non-empty array of UUID v4 values', async () => {
    const dto = plainToInstance(BulkNotificationIdsDto, {
      ids: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.ids).toHaveLength(2);
  });

  it('rejects an empty array', async () => {
    const dto = plainToInstance(BulkNotificationIdsDto, {
      ids: [],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'ids')).toBe(true);
  });

  it('rejects a value that is not an array', async () => {
    const dto = plainToInstance(BulkNotificationIdsDto, {
      ids: '11111111-1111-4111-8111-111111111111',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'ids')).toBe(true);
  });

  it('rejects an array containing a non-UUID value', async () => {
    const dto = plainToInstance(BulkNotificationIdsDto, {
      ids: ['11111111-1111-4111-8111-111111111111', 'not-a-uuid'],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'ids')).toBe(true);
  });

  it('rejects a UUID that is not version 4', async () => {
    const dto = plainToInstance(BulkNotificationIdsDto, {
      ids: ['6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'ids')).toBe(true);
  });
});
