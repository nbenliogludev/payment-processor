import http from 'node:http';
import type { Socket } from 'node:net';
import { Duplex } from 'node:stream';

import type { Express } from 'express';

class MockSocket extends Duplex {
  _read(): void {}

  _write(_chunk: unknown, _encoding: BufferEncoding, callback: () => void): void {
    callback();
  }
}

interface InvokeAppInput {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface InvokeAppResponse {
  status: number;
  headers: http.OutgoingHttpHeaders;
  text: string;
  body: unknown;
}

function normalizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function serializeBody(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === 'string') {
    return Buffer.from(body);
  }

  return Buffer.from(JSON.stringify(body));
}

function parseBody(text: string, contentType: unknown): unknown {
  if (typeof contentType === 'string' && contentType.includes('application/json')) {
    return JSON.parse(text);
  }

  return text;
}

export function invokeApp(app: Express, input: InvokeAppInput): Promise<InvokeAppResponse> {
  return new Promise((resolve) => {
    const socket = new MockSocket();
    const req = new http.IncomingMessage(socket as unknown as Socket);
    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];
    const headers = normalizeHeaders(input.headers);

    req.method = input.method;
    req.url = input.path;

    if (input.body !== undefined) {
      const rawBody = serializeBody(input.body);
      headers['content-length'] = String(rawBody.length);
      headers['content-type'] ??= 'application/json';
      req.push(rawBody);
    }

    req.headers = headers;
    req.push(null);

    res.assignSocket(new MockSocket() as unknown as Socket);
    res.write = ((chunk: unknown) => {
      if (chunk !== undefined) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }

      return true;
    }) as typeof res.write;
    res.end = ((chunk?: unknown) => {
      if (chunk !== undefined) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }

      const text = Buffer.concat(chunks).toString('utf8');
      const contentType = res.getHeader('content-type');
      const body = text ? parseBody(text, contentType) : undefined;

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        text,
        body,
      });

      return res;
    }) as typeof res.end;

    (app as unknown as (req: http.IncomingMessage, res: http.ServerResponse) => void)(req, res);
  });
}
