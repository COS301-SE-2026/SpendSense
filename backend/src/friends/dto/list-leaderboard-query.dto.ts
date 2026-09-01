import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const leaderboardMetrics = ['xp', 'coins', 'streak'] as const;
export type LeaderboardMetric = (typeof leaderboardMetrics)[number];

export class ListLeaderboardQueryDto {
  @IsOptional()
  @IsIn(leaderboardMetrics)
  metric?: LeaderboardMetric;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  page?: number;
}
