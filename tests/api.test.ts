import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { TriageInput, TriageService } from "../src/services/triage.service";
import { MemoryReportRepository } from "./helpers/memory-report.repository";
import type { AdminRepository } from "../src/repositories/admin.repository";

const env: Env = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "postgresql://unused",
  GEMINI_MODEL: "test-model",
  AI_REQUIRED: false,
  JWT_SECRET: "test-secret-that-is-longer-than-thirty-two-characters",
  JWT_EXPIRES_IN: "8h",
  CORS_ORIGIN: "*",
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 10_000,
  DUPLICATE_THRESHOLD: 0.62,
};

const adminEmail = "admin@example.com";
const adminPassword = "secure-password";

const adminRepository: AdminRepository = {
  async findByEmail(email) {
    if (email !== adminEmail) return null;
    return {
      id: "test-admin",
      email: adminEmail,
      passwordHash: bcrypt.hashSync(adminPassword, 4),
      role: "admin",
      active: true,
    };
  },
};

class StubTriage implements TriageService {
  async classify(input: TriageInput) {
    const isFire = /fire|আগুন/u.test(input.description.toLowerCase());
    return {
      category: isFire ? ("fire" as const) : ("public_service" as const),
      urgency: isFire ? ("critical" as const) : ("low" as const),
      summary: input.description,
      suggestedAction: isFire ? "Dispatch fire service." : "Assign municipal team.",
      confidence: 0.94,
      provider: "test",
    };
  }
}

describe("CrisisDesk API", () => {
  let repository: MemoryReportRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new MemoryReportRepository();
    app = createApp({ env, repository, adminRepository, triage: new StubTriage() });
  });

  async function createReport(overrides: Record<string, unknown> = {}) {
    return request(app)
      .post("/api/reports")
      .send({
        name: " Rahim  ",
        contact: "01700000000",
        location: "Sylhet Bondor Bazar",
        description: "There is a fire near a shop and people are trapped.",
        language: "en",
        ...overrides,
      });
  }

  async function adminToken() {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    return response.body.token as string;
  }

  it("creates, sanitizes, classifies, and stores a report", async () => {
    const response = await createReport();
    expect(response.status).toBe(201);
    expect(response.headers.location).toMatch(/^\/api\/reports\//);
    expect(response.body.data).toMatchObject({
      name: "Rahim",
      category: "fire",
      urgency: "critical",
      confidence: 0.94,
      possibleDuplicate: false,
      status: "pending",
    });
  });

  it("returns structured validation errors", async () => {
    const response = await createReport({ location: " ", description: "" });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    expect(response.body.errors.map((error: { field: string }) => error.field)).toEqual(
      expect.arrayContaining(["location", "description"]),
    );
  });

  it("detects a likely duplicate and returns the matched report id", async () => {
    const first = await createReport();
    const second = await createReport({ name: "Karim", contact: "01800000000" });
    expect(second.status).toBe(201);
    expect(second.body.data.possibleDuplicate).toBe(true);
    expect(second.body.data.matchedReportId).toBe(first.body.data.id);
    expect(second.body.data.duplicateScore).toBeGreaterThanOrEqual(0.62);
  });

  it("supports category, urgency, status, and search filters", async () => {
    await createReport();
    await createReport({
      location: "Ward 8",
      description: "Garbage has not been collected for days.",
    });
    const response = await request(app).get(
      "/api/reports?category=fire&urgency=critical&status=pending&search=shop",
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination.total).toBe(1);
  });

  it("gets a report and returns a structured 404", async () => {
    const created = await createReport();
    expect((await request(app).get(`/api/reports/${created.body.data.id}`)).status).toBe(200);
    const missing = await request(app).get("/api/reports/missing");
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ success: false, code: "NOT_FOUND" });
  });

  it("protects status updates and accepts a valid admin JWT", async () => {
    const created = await createReport();
    const url = `/api/reports/${created.body.data.id}/status`;
    expect((await request(app).patch(url).send({ status: "assigned" })).status).toBe(401);
    const response = await request(app)
      .patch(url)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ status: "assigned" });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("assigned");
  });

  it("returns analytics from the static stats route", async () => {
    await createReport();
    const response = await request(app).get("/api/reports/stats/summary");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      totalReports: 1,
      criticalReports: 1,
      pendingReports: 1,
    });
  });

  it("requires auth to delete and returns 204 when deleted", async () => {
    const created = await createReport();
    const url = `/api/reports/${created.body.data.id}`;
    expect((await request(app).delete(url)).status).toBe(401);
    const deleted = await request(app)
      .delete(url)
      .set("Authorization", `Bearer ${await adminToken()}`);
    expect(deleted.status).toBe(204);
    expect((await request(app).get(url)).status).toBe(404);
  });

  it("exposes Swagger and the OpenAPI JSON document", async () => {
    expect((await request(app).get("/docs/")).status).toBe(200);
    const spec = await request(app).get("/openapi.json");
    expect(spec.status).toBe(200);
    expect(spec.headers["content-disposition"]).toBe(
      'attachment; filename="crisisdesk-openapi.json"',
    );
    expect(spec.headers["content-type"]).toMatch(/^application\/json/);
    expect(spec.body.paths["/api/reports"]).toBeDefined();
  });
});
