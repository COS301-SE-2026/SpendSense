import {Controller, Get} from '@nestjs/common'
import {PrismaService} from '../prisma/prisma.service'

// HealthController: infratructure status endpoint
// GET /api/v1/health

// used by docker health checks as well as the cd pipeline to confirm the backend
//process is running and can then reach downstream services

@Controller('health')
export class HealthController{
    constructor(private readonly prisma: PrismaService){}

    @Get()
    async health(){
        const dbHealthy = await this.checkDatabase()

        return{
            status: dbHealthy? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services:{
                database: dbHealthy? 'up' : 'down',
            // ai service check can be added here when integration is wired
            },
        }
    }

    private async checkDatabase(): Promise<boolean>{
        try{
            await this.prisma.$queryRaw`SELECT 1`
            return true
        } 

        catch{
            return false
        }
    }
}