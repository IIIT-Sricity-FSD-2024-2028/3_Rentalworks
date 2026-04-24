import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
  app.enableCors({
    origin: '*', // For development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('PG Rental Management API')
    .setDescription('The PG Rental Management System using in-memory structures')
    .setVersion('1.0')
    .addGlobalParameters({
      name: 'x-role',
      in: 'header',
      required: false,
      description: 'The role of the requesting user (admin, warden, owner, tenant)',
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
  fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));

  // Note: user specifically asked to use port 3000
  await app.listen(3000);
}
bootstrap();
