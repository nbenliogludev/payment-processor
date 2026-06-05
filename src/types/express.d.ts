declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      validatedBody?: unknown;
    }
  }
}

export {};
