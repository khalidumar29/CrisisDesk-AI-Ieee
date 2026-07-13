CREATE TYPE "Language" AS ENUM ('bn', 'en', 'unknown');
CREATE TYPE "Category" AS ENUM ('medical', 'fire', 'accident', 'crime', 'flood', 'utility', 'public_service', 'infrastructure', 'other');
CREATE TYPE "Urgency" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'in_review', 'assigned', 'resolved', 'rejected');

CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "contact" TEXT,
  "location" TEXT NOT NULL,
  "normalizedLocation" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "language" "Language" NOT NULL DEFAULT 'unknown',
  "category" "Category" NOT NULL,
  "urgency" "Urgency" NOT NULL,
  "summary" TEXT NOT NULL,
  "suggestedAction" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
  "matchedReportId" TEXT,
  "duplicateScore" DOUBLE PRECISION,
  "status" "ReportStatus" NOT NULL DEFAULT 'pending',
  "aiProvider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_category_idx" ON "Report"("category");
CREATE INDEX "Report_urgency_idx" ON "Report"("urgency");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_normalizedLocation_idx" ON "Report"("normalizedLocation");
ALTER TABLE "Report" ADD CONSTRAINT "Report_matchedReportId_fkey" FOREIGN KEY ("matchedReportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
