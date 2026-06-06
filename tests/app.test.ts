import app from '../src/app';
import { invokeApp } from './helpers/invoke-app';

describe('app', () => {
  it('returns health status', async () => {
    const response = await invokeApp(app, { method: 'GET', path: '/health' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
    });
  });

  it('serves Swagger UI and OpenAPI JSON', async () => {
    const [docsResponse, specResponse] = await Promise.all([
      invokeApp(app, { method: 'GET', path: '/api-docs/' }),
      invokeApp(app, { method: 'GET', path: '/openapi.json' }),
    ]);

    expect(docsResponse.status).toBe(200);
    expect(docsResponse.text).toContain('Swagger UI');
    expect(specResponse.status).toBe(200);
    expect((specResponse.body as { paths: Record<string, { post: { summary: string } }> }).paths[
      '/invoice'
    ].post.summary).toBe('Create an invoice');
  });

  it('returns not found for unknown routes', async () => {
    const response = await invokeApp(app, { method: 'GET', path: '/unknown-route' });

    expect(response.status).toBe(404);
    expect((response.body as { error: { message: string } }).error.message).toBe(
      'Route GET /unknown-route not found',
    );
  });
});
