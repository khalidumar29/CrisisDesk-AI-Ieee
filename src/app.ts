import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import type { Env } from "./config/env";
import type { SignOptions } from "jsonwebtoken";
import { AuthController } from "./controllers/auth.controller";
import { ReportController } from "./controllers/report.controller";
import { openapiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import type { ReportRepository } from "./repositories/report.repository";
import type { AdminRepository } from "./repositories/admin.repository";
import { createAuthRouter } from "./routes/auth.routes";
import { createReportRouter } from "./routes/report.routes";
import { AuthService } from "./services/auth.service";
import { DuplicateService } from "./services/duplicate.service";
import { ReportService } from "./services/report.service";
import type { TriageService } from "./services/triage.service";

export interface AppDependencies {
  env: Env;
  repository: ReportRepository;
  adminRepository: AdminRepository;
  triage: TriageService;
}

export function createApp({ env, repository, adminRepository, triage }: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: parseOrigins(env.CORS_ORIGIN) }));
  app.use(compression());
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  if (env.NODE_ENV !== "test") app.use(morgan("combined"));

  app.use(
    "/api",
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_request, response) => {
        response.status(429).json({
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        });
      },
    }),
  );

  const authService = new AuthService(
    adminRepository,
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
  );
  const reportService = new ReportService(
    repository,
    triage,
    new DuplicateService(env.DUPLICATE_THRESHOLD),
  );

  app.get("/", (_request, response) => {
    response.json({
      success: true,
      name: "CrisisDesk AI API",
      version: "1.0.0",
      documentation: "/docs",
    });
  });
  app.get("/health", (_request, response) => {
    response.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
  });
  app.get("/openapi.json", (_request, response) => {
    response
      .attachment("crisisdesk-openapi.json")
      .type("application/json")
      .send(JSON.stringify(openapiDocument, null, 2));
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument, { explorer: true }));
  app.use("/api/auth", createAuthRouter(new AuthController(authService)));
  app.use("/api/reports", createReportRouter(new ReportController(reportService), authService));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function parseOrigins(value: string): true | string[] {
  if (value === "*") return true;
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
}
