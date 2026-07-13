import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) return next(result.error);
    request.body = result.data;
    return next();
  };
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) return next(result.error);
    Object.defineProperty(request, "query", { value: result.data, writable: true });
    return next();
  };
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) return next(result.error);
    request.params = result.data;
    return next();
  };
}
