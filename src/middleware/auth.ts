import type { RequestHandler } from "express";
import { UnauthorizedError } from "../lib/errors";
import type { AuthService } from "../services/auth.service";

export function requireAdmin(auth: AuthService): RequestHandler {
  return (request, _response, next) => {
    const [scheme, token] = request.header("authorization")?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) return next(new UnauthorizedError());
    try {
      auth.verify(token);
      return next();
    } catch {
      return next(new UnauthorizedError("The access token is invalid or expired."));
    }
  };
}
