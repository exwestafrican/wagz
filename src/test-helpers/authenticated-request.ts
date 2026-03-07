import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import getHttpServer from './get-http-server';
import { Test } from 'supertest';

export default function authenticatedRequest(
  app: INestApplication,
  token: string = 'test-token',
): {
  post: (url: string) => Test;
  get: (url: string) => Test;
  put: (url: string) => Test;
  patch: (url: string) => Test;
  delete: (url: string) => Test;
  head: (url: string) => Test;
  options: (url: string) => Test;
} {
  const req = request(getHttpServer(app));

  const addHeaders = (test: Test): Test => {
    return test
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${token}`);
  };

  return {
    post: (url: string) => addHeaders(req.post(url)),
    get: (url: string) => addHeaders(req.get(url)),
    put: (url: string) => addHeaders(req.put(url)),
    patch: (url: string) => addHeaders(req.patch(url)),
    delete: (url: string) => addHeaders(req.delete(url)),
    head: (url: string) => addHeaders(req.head(url)),
    options: (url: string) => addHeaders(req.options(url)),
  };
}
