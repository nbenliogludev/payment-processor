import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import HttpError from '../errors/http-error';

function formatIssues(issues: Array<{ path: PropertyKey[]; message: string }>): Array<{
  path: string;
  message: string;
}> {
  return issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new HttpError(400, 'Invalid request body', formatIssues(result.error.issues)));
      return;
    }

    req.validatedBody = result.data;
    next();
  };
}
