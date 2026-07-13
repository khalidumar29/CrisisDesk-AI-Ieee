import { Router } from "express";
import { z } from "zod";
import type { AuthController } from "../controllers/auth.controller";
import { asyncHandler } from "../lib/async-handler";
import { validateBody } from "../validation/validate";

const loginSchema = z
  .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(200) })
  .strict();

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.post("/login", validateBody(loginSchema), asyncHandler(controller.login));
  return router;
}
