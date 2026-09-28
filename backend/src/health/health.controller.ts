import { Controller, Get, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
type ServiceStatus = 'up' | 'down';

class HealthServicesDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database!: ServiceStatus;

  @ApiProperty({ enum: ['up', 'down'], example: 'down' })
  ai!: ServiceStatus;
}

class HealthResponseDto {
  @ApiProperty({
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'degraded',
  })
  status!: HealthStatus;

  @ApiProperty({ example: '2026-05-20T10:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '0.0.1' })
  version!: string;

  @ApiProperty({ type: HealthServicesDto })
  services!: HealthServicesDto;
}

class LivenessResponseDto {
  @ApiProperty({ example: 'alive' })
  status!: 'alive';

  @ApiProperty({ example: '2026-08-30T10:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 'a1b2c3d4' })
  version!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Check backend liveness' })
  @ApiOkResponse({
    description: 'Reports whether the backend process can answer requests.',
    type: LivenessResponseDto,
  })
  @Get('live')
  live(): LivenessResponseDto {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      version: this.version(),
    };
  }

  @ApiOperation({
    summary: 'Check backend readiness',
    description:
      'Requires the application database. The AI service is optional and produces degraded readiness when unavailable.',
  })
  @ApiOkResponse({
    description: 'Backend can accept traffic.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Database is unavailable, so the backend cannot accept traffic.',
    type: HealthResponseDto,
  })
  @Get('ready')
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponseDto> {
    return this.applyReadinessStatus(response, await this.healthResponse());
  }

  @ApiOperation({
    summary: 'Check backend health details',
    description:
      'Reports high-level dependency availability without exposing connection details or secrets. It uses the same status semantics as readiness.',
  })
  @ApiOkResponse({
    description: 'Backend health summary. The AI service may be down while the backend is still degraded.',
    schema: {
      example: {
        data: {
          status: 'degraded',
          timestamp: '2026-05-20T10:00:00.000Z',
          version: '0.0.1',
          services: {
            database: 'up',
            ai: 'down',
          },
        },
      },
    },
  })
  @Get()
  async health(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponseDto> {
    return this.applyReadinessStatus(response, await this.healthResponse());
  }

  private async healthResponse(): Promise<HealthResponseDto> {
    const dbHealthy = await this.checkDatabase();
    const aiHealthy = await this.checkAiService();

    return {
      status: this.getOverallStatus(dbHealthy, aiHealthy),
      timestamp: new Date().toISOString(),
      version: this.version(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        ai: aiHealthy ? 'up' : 'down',
      },
    };
  }

  private applyReadinessStatus(
    response: Response,
    health: HealthResponseDto,
  ): HealthResponseDto {
    if (health.services.database === 'down') {
      response.status(503);
    }

    return health;
  }

  private version(): string {
    return process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.0.1';
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkAiService(): Promise<boolean> {
    const aiUrl = process.env.AI_SERVICE_URL;
    if (!aiUrl) {
      return false;
    }
    try {
      const healthUrl = new URL('/health', aiUrl);
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private getOverallStatus(
    dbHealthy: boolean,
    aiHealthy: boolean,
  ): HealthStatus {
    if (!dbHealthy) {
      return 'unhealthy';
    }

    return aiHealthy ? 'healthy' : 'degraded';
  }
}
