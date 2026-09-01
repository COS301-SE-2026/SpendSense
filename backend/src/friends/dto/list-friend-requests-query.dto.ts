import { IsIn, IsOptional } from 'class-validator';

export const friendRequestDirections = ['incoming', 'outgoing'] as const;
export type FriendRequestDirection = (typeof friendRequestDirections)[number];

export class ListFriendRequestsQueryDto {
  @IsOptional()
  @IsIn(friendRequestDirections)
  direction?: FriendRequestDirection;
}
