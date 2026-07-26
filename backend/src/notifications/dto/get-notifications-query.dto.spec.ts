import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationType } from '@prisma/client/edge';
import { GetNotificationsQueryDto } from './get-notifications-query.dto';
import { describe, expect, it } from '@jest/globals';

describe('GetNotificationsQueryDto', () => {
  it('uses the default page and perPage values', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.perPage).toBe(20);
  });
  it('transforms unreadOnly true into a boolean', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      unreadOnly: 'true',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.unreadOnly).toBe(true);
  });
  it('transforms unreadOnly false into a boolean', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      unreadOnly: 'false',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.unreadOnly).toBe(false);
  });
  it('rejects an invalid unreadOnly value', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      unreadOnly: 'yes',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'unreadOnly')).toBe(true);
  });
  it('accepts a valid notification type', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      type: NotificationType.REMINDER,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.type).toBe(NotificationType.REMINDER);
  });
  it('rejects an invalid notification type', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      type: 'INVALID_NOTIFICATION_TYPE',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });
  it('transforms page and perPage into numbers', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      page: '2',
      perPage: '10',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.perPage).toBe(10);
  });
  it('rejects a page below one', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      page: '0',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });
  it('rejects perPage values above one hundred', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      perPage: '101',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'perPage')).toBe(true);
  });
  it('rejects non-integer pagination values', async () => {
    const dto = plainToInstance(GetNotificationsQueryDto, {
      page: '1.5',
      perPage: '20.5',
    });
    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['page', 'perPage']));
  });
});
