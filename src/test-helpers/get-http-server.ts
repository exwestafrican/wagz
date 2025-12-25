import { INestApplication } from '@nestjs/common';
import { Server } from 'http';

export default function getHttpServer(app: INestApplication): Server {
  return app.getHttpServer() as unknown as Server;
}
