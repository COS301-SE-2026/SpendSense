import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // all routes under /api/v1
  app.setGlobalPrefix('api/v1')

  // cors: allow frontend origins from environment
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split('.')?? ['http://localhost:5173',]

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  // global validation: reject invalid dto's, strip unknown fields, auto-transform
  app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }),
  )

  // global exception filter: consistent error shape across routes
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap();
