import { randomUUID } from "node:crypto";
import { categories, reportStatuses, urgencies } from "../../src/domain/report";
import type {
  NewReport,
  PaginatedReports,
  Report,
  ReportFilters,
  ReportStats,
  ReportStatus,
} from "../../src/domain/report";
import type { ReportRepository } from "../../src/repositories/report.repository";

export class MemoryReportRepository implements ReportRepository {
  readonly records: Report[] = [];

  async create(input: NewReport): Promise<Report> {
    const now = new Date();
    const report: Report = {
      id: randomUUID(),
      name: input.name ?? null,
      contact: input.contact ?? null,
      ...input,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(report);
    return report;
  }

  async list(filters: ReportFilters): Promise<PaginatedReports> {
    const search = filters.search?.toLowerCase();
    const filtered = this.records.filter((report) => {
      if (filters.category && report.category !== filters.category) return false;
      if (filters.urgency && report.urgency !== filters.urgency) return false;
      if (filters.status && report.status !== filters.status) return false;
      if (filters.from && report.createdAt < filters.from) return false;
      if (filters.to && report.createdAt > filters.to) return false;
      if (search && !`${report.description} ${report.location} ${report.summary}`.toLowerCase().includes(search)) return false;
      return true;
    });
    const start = (filters.page - 1) * filters.limit;
    return { reports: filtered.slice(start, start + filters.limit), total: filtered.length };
  }

  async findById(id: string): Promise<Report | null> {
    return this.records.find((report) => report.id === id) ?? null;
  }

  async updateStatus(id: string, status: ReportStatus): Promise<Report | null> {
    const report = await this.findById(id);
    if (!report) return null;
    report.status = status;
    report.updatedAt = new Date();
    return report;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.records.findIndex((report) => report.id === id);
    if (index < 0) return false;
    this.records.splice(index, 1);
    return true;
  }

  async findDuplicateCandidates(category: string, createdAfter: Date): Promise<Report[]> {
    return this.records.filter(
      (report) =>
        report.category === category &&
        report.createdAt >= createdAfter &&
        !["resolved", "rejected"].includes(report.status),
    );
  }

  async stats(): Promise<ReportStats> {
    const countBy = <T extends string>(values: readonly T[], select: (report: Report) => T) =>
      Object.fromEntries(values.map((value) => [value, this.records.filter((report) => select(report) === value).length]));
    return {
      totalReports: this.records.length,
      criticalReports: this.records.filter((report) => report.urgency === "critical").length,
      pendingReports: this.records.filter((report) => report.status === "pending").length,
      resolvedReports: this.records.filter((report) => report.status === "resolved").length,
      categoryBreakdown: countBy(categories, (report) => report.category),
      urgencyBreakdown: countBy(urgencies, (report) => report.urgency),
      statusBreakdown: countBy(reportStatuses, (report) => report.status),
    };
  }
}
