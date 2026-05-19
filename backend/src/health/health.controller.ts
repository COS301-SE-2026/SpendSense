import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// HealthController: infratructure status endpoint
// GET /api/v1/health

// used by docker health checks as well as the cd pipeline to confirm the backend
//process is running and can then reach downstream services

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    const dbHealthy = await this.checkDatabase();
    const aiHealthy = await this.checkAiService();

    return {
      status: !dbHealthy ? 'unhealthy' : aiHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        ai: aiHealthy ? 'up' : 'down',
      },
    };
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
      const response = await fetch(`${aiUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
