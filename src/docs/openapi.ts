import type { OpenAPIV3 } from "openapi-types";
import { categories, languages, reportStatuses, urgencies } from "../domain/report";

const success = {
  "200": { description: "Successful response" },
  "400": { $ref: "#/components/responses/ValidationError" },
  "500": { $ref: "#/components/responses/InternalError" },
};

export const openapiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "CrisisDesk AI API",
    version: "1.0.0",
    description:
      "Backend API for multilingual emergency and service-request intake, AI triage, duplicate detection, workflow management, and analytics.",
    license: { name: "MIT" },
  },
  servers: [{ url: "http://localhost:4000", description: "Local development" }],
  tags: [
    { name: "System" },
    { name: "Authentication" },
    { name: "Reports" },
    { name: "Analytics" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Liveness check",
        responses: { "200": { description: "API is running" } },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Obtain an admin access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              example: { email: "admin@crisisdesk.app", password: "your-seeded-password" },
            },
          },
        },
        responses: {
          "200": {
            description: "Admin access token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/reports": {
      post: {
        tags: ["Reports"],
        summary: "Submit and triage a citizen report",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateReport" },
              example: {
                name: "Rahim",
                contact: "017xxxxxxxx",
                location: "Sylhet Bondor Bazar",
                description: "There is a fire near a shop and people are trapped.",
                language: "en",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Report classified and stored",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ReportResponse" } } },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { description: "Rate limit exceeded" },
          "503": { description: "AI provider unavailable when strict AI mode is enabled" },
        },
      },
      get: {
        tags: ["Reports"],
        summary: "List reports with filtering and pagination",
        parameters: [
          { name: "category", in: "query", schema: { type: "string", enum: [...categories] } },
          { name: "urgency", in: "query", schema: { type: "string", enum: [...urgencies] } },
          { name: "status", in: "query", schema: { type: "string", enum: [...reportStatuses] } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated reports",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ReportListResponse" } } },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/reports/stats/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Get report counts and breakdowns",
        responses: {
          "200": {
            description: "Report analytics",
            content: { "application/json": { schema: { $ref: "#/components/schemas/StatsResponse" } } },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/reports/{id}": {
      parameters: [{ $ref: "#/components/parameters/ReportId" }],
      get: {
        tags: ["Reports"],
        summary: "Get one report",
        responses: {
          "200": {
            description: "Report details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ReportResponse" } } },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["Reports"],
        summary: "Delete a report (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "Deleted" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/reports/{id}/status": {
      parameters: [{ $ref: "#/components/parameters/ReportId" }],
      patch: {
        tags: ["Reports"],
        summary: "Update workflow status (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/StatusUpdate" } },
          },
        },
        responses: {
          "200": {
            description: "Updated report",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ReportResponse" } } },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters: {
      ReportId: { name: "id", in: "path", required: true, schema: { type: "string" } },
    },
    schemas: {
      CreateReport: {
        type: "object",
        additionalProperties: false,
        required: ["location", "description"],
        properties: {
          name: { type: "string", maxLength: 120 },
          contact: { type: "string", maxLength: 160 },
          location: { type: "string", minLength: 1, maxLength: 300 },
          description: { type: "string", minLength: 1, maxLength: 5000 },
          language: { type: "string", enum: [...languages], default: "unknown" },
        },
      },
      StatusUpdate: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: { status: { type: "string", enum: [...reportStatuses] } },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string", format: "email" }, password: { type: "string", format: "password" } },
      },
      LoginResponse: {
        type: "object",
        required: ["success", "token", "tokenType", "expiresIn"],
        properties: {
          success: { type: "boolean", example: true },
          token: { type: "string" },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { oneOf: [{ type: "string" }, { type: "number" }], example: "8h" },
        },
      },
      Report: {
        type: "object",
        required: [
          "id", "location", "description", "language", "category", "urgency", "summary",
          "suggestedAction", "confidence", "possibleDuplicate", "status", "aiProvider",
          "createdAt", "updatedAt",
        ],
        properties: {
          id: { type: "string", example: "cm123report" },
          name: { type: "string", nullable: true },
          contact: { type: "string", nullable: true },
          location: { type: "string" },
          normalizedLocation: { type: "string" },
          description: { type: "string" },
          language: { type: "string", enum: [...languages] },
          category: { type: "string", enum: [...categories] },
          urgency: { type: "string", enum: [...urgencies] },
          summary: { type: "string" },
          suggestedAction: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          possibleDuplicate: { type: "boolean" },
          matchedReportId: { type: "string", nullable: true },
          duplicateScore: { type: "number", minimum: 0, maximum: 1, nullable: true },
          status: { type: "string", enum: [...reportStatuses] },
          aiProvider: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ReportResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: "#/components/schemas/Report" },
        },
      },
      ReportListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "array", items: { $ref: "#/components/schemas/Report" } },
          pagination: {
            type: "object",
            required: ["page", "limit", "total", "totalPages"],
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      StatsResponse: {
        type: "object",
        required: [
          "success", "totalReports", "criticalReports", "pendingReports", "resolvedReports",
          "categoryBreakdown", "urgencyBreakdown", "statusBreakdown",
        ],
        properties: {
          success: { type: "boolean", example: true },
          totalReports: { type: "integer" },
          criticalReports: { type: "integer" },
          pendingReports: { type: "integer" },
          resolvedReports: { type: "integer" },
          categoryBreakdown: { type: "object", additionalProperties: { type: "integer" } },
          urgencyBreakdown: { type: "object", additionalProperties: { type: "integer" } },
          statusBreakdown: { type: "object", additionalProperties: { type: "integer" } },
        },
      },
      Error: {
        type: "object",
        required: ["success", "code", "message"],
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string" },
        },
      },
    },
    responses: {
      ValidationError: { description: "Request validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Unauthorized: { description: "Missing or invalid admin token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      InternalError: { description: "Unexpected server error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
};
