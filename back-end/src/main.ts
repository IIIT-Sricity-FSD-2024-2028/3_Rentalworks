import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import helmet from 'helmet';
import { HttpErrorFilter } from './middleware/http-error.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Apply Helmet for security headers
  // Images are loaded by the frontend from another port, so allow cross-origin reads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Property / room photos uploaded through /properties/:id/upload-image.
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // Apply Global Exception Filter for error handling and logging
  app.useGlobalFilters(new HttpErrorFilter());

  // Enable CORS for frontend integration
  // Only our own frontend may call the API from a browser. Set CORS_ORIGINS
  // (comma-separated) for other hosts, e.g. the deployed site's URL.
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('PG Rental Management API')
    .setDescription(
      'The PG Rental Management System using in-memory structures',
    )
    .setVersion('1.0')
    .addGlobalParameters({
      name: 'x-role',
      in: 'header',
      required: false,
      description:
        'The role of the requesting user (admin, warden, owner, tenant)',
    })
    .addGlobalParameters({
      name: 'x-user-id',
      in: 'header',
      required: false,
      description: 'The ID of the requesting user',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Write swagger.json to docs folder
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }
  fs.writeFileSync(
    path.join(docsDir, 'swagger.json'),
    JSON.stringify(document, null, 2),
  );

  // Note: user specifically asked to use port 3000
  await app.listen(Number(process.env.PORT) || 3000);
}
bootstrap();
