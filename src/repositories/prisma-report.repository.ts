import { Prisma, PrismaClient } from "@prisma/client";
import type {
  NewReport,
  PaginatedReports,
  Report,
  ReportFilters,
  ReportStats,
  ReportStatus,
} from "../domain/report";
import type { ReportRepository } from "./report.repository";

function asReport(value: unknown): Report {
  return value as Report;
}

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: NewReport): Promise<Report> {
    return asReport(await this.prisma.report.create({ data: input }));
  }

  async list(filters: ReportFilters): Promise<PaginatedReports> {
    const where: Prisma.ReportWhereInput = {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.urgency ? { urgency: filters.urgency } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { description: { contains: filters.search, mode: "insensitive" as const } },
              { location: { contains: filters.search, mode: "insensitive" as const } },
              { summary: { contains: filters.search, mode: "insensitive" as const } },
              { name: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports: records.map(asReport), total };
  }

  async findById(id: string): Promise<Report | null> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    return report ? asReport(report) : null;
  }

  async updateStatus(id: string, status: ReportStatus): Promise<Report | null> {
    const result = await this.prisma.report.updateMany({ where: { id }, data: { status } });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.report.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async findDuplicateCandidates(category: string, createdAfter: Date): Promise<Report[]> {
    const records = await this.prisma.report.findMany({
      where: {
        category: category as never,
        createdAt: { gte: createdAfter },
        status: { notIn: ["resolved", "rejected"] },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });
    return records.map(asReport);
  }

  async stats(): Promise<ReportStats> {
    const [totalReports, criticalReports, pendingReports, resolvedReports] =
      await this.prisma.$transaction([
        this.prisma.report.count(),
        this.prisma.report.count({ where: { urgency: "critical" } }),
        this.prisma.report.count({ where: { status: "pending" } }),
        this.prisma.report.count({ where: { status: "resolved" } }),
      ]);
    const [categories, urgencies, statuses] = await Promise.all([
      this.prisma.report.groupBy({ by: ["category"], orderBy: { category: "asc" }, _count: { category: true } }),
      this.prisma.report.groupBy({ by: ["urgency"], orderBy: { urgency: "asc" }, _count: { urgency: true } }),
      this.prisma.report.groupBy({ by: ["status"], orderBy: { status: "asc" }, _count: { status: true } }),
    ]);

    return {
      totalReports,
      criticalReports,
      pendingReports,
      resolvedReports,
      categoryBreakdown: Object.fromEntries(categories.map((row) => [row.category, row._count.category])),
      urgencyBreakdown: Object.fromEntries(urgencies.map((row) => [row.urgency, row._count.urgency])),
      statusBreakdown: Object.fromEntries(statuses.map((row) => [row.status, row._count.status])),
    };
  }
}
