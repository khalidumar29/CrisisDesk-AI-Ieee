import { Router } from "express";
import type { ReportController } from "../controllers/report.controller";
import { asyncHandler } from "../lib/async-handler";
import type { AuthService } from "../services/auth.service";
import { requireAdmin } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../validation/validate";
import {
  createReportSchema,
  listReportsSchema,
  reportIdSchema,
  updateStatusSchema,
} from "../validation/report.schemas";

export function createReportRouter(controller: ReportController, auth: AuthService): Router {
  const router = Router();

  router.post("/", validateBody(createReportSchema), asyncHandler(controller.create));
  router.get("/", validateQuery(listReportsSchema), asyncHandler(controller.list));
  // This static route must precede /:id.
  router.get("/stats/summary", asyncHandler(controller.stats));
  router.get("/:id", validateParams(reportIdSchema), asyncHandler(controller.get));
  router.patch(
    "/:id/status",
    requireAdmin(auth),
    validateParams(reportIdSchema),
    validateBody(updateStatusSchema),
    asyncHandler(controller.updateStatus),
  );
  router.delete(
    "/:id",
    requireAdmin(auth),
    validateParams(reportIdSchema),
    asyncHandler(controller.delete),
  );

  return router;
}
