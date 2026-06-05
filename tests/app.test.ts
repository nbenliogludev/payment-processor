import request from 'supertest';

import app from '../src/app';

describe('app', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
    });
  });

  it('serves Swagger UI and OpenAPI JSON', async () => {
    const [docsResponse, specResponse] = await Promise.all([
      request(app).get('/api-docs/'),
      request(app).get('/openapi.json'),
    ]);

    expect(docsResponse.status).toBe(200);
    expect(docsResponse.text).toContain('Swagger UI');
    expect(specResponse.status).toBe(200);
    expect(specResponse.body.paths['/invoice'].post.summary).toBe('Create an invoice');
  });

  it('returns not found for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Route GET /unknown-route not found');
  });
});
