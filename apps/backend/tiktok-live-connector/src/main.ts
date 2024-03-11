/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 4444;
  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('Playrooms Backend')
    .setDescription('The Playrooms Backend API')
    .setVersion('1.0')
    .setDefaultContentType('application/json')
    .addServer('TikTok Live Connector', {
      url: `ws://localhost:${port}`,
      protocol: 'socket.io',
    })
    .build();

  const asyncApiDocument = AsyncApiModule.createDocument(app, asyncApiOptions);
  await AsyncApiModule.setup(globalPrefix, app, asyncApiDocument);

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
