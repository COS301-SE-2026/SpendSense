import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // all routes under /api/v1
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SpendSense Backend API')
    .setDescription('API documentation for the SpendSense NestJS backend.')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Local backend')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/v1/docs-json',
  });

  app.useGlobalInterceptors(new ResponseInterceptor());

  // cors: allow frontend origins from environment
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:5173',
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // global validation: reject invalid dto's, strip unknown fields, auto-transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // global exception filter: consistent error shape across routes
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Backend API running at http://localhost:${port}/api/v1`);
  console.log(`Swagger docs running at http://localhost:${port}/api/v1/docs`);
}
void bootstrap();
