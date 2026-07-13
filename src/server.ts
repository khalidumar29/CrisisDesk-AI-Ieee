import { createServer } from "node:http";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { prisma } from "./db/prisma";
import { PrismaReportRepository } from "./repositories/prisma-report.repository";
import { PrismaAdminRepository } from "./repositories/prisma-admin.repository";
import { GeminiTriageService } from "./services/gemini-triage.service";
import { HeuristicTriageService } from "./services/heuristic-triage.service";
import { ResilientTriageService } from "./services/resilient-triage.service";

const env = loadEnv();
const primary = env.GEMINI_API_KEY
  ? new GeminiTriageService(env.GEMINI_API_KEY, env.GEMINI_MODEL)
  : null;

if (env.AI_REQUIRED && !primary) {
  throw new Error("AI_REQUIRED=true but GEMINI_API_KEY is not configured.");
}

const app = createApp({
  env,
  repository: new PrismaReportRepository(prisma),
  adminRepository: new PrismaAdminRepository(prisma),
  triage: new ResilientTriageService(primary, new HeuristicTriageService(), env.AI_REQUIRED),
});
const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`CrisisDesk AI listening on http://localhost:${env.PORT}`);
  console.log(`Swagger UI available at http://localhost:${env.PORT}/docs`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
