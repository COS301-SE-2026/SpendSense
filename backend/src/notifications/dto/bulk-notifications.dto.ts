import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BulkNotificationIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];
}
