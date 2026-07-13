import type { Request, Response } from "express";
import type { ReportFilters, ReportStatus } from "../domain/report";
import type { ReportService } from "../services/report.service";
import type { CreateReportInput } from "../validation/report.schemas";

export class ReportController {
  constructor(private readonly reports: ReportService) {}

  create = async (request: Request, response: Response) => {
    const report = await this.reports.create(request.body as CreateReportInput);
    response.status(201).location(`/api/reports/${report.id}`).json({ success: true, data: report });
  };

  list = async (request: Request, response: Response) => {
    const filters = request.query as unknown as ReportFilters;
    const result = await this.reports.list(filters);
    response.json({
      success: true,
      data: result.reports,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit),
      },
    });
  };

  get = async (request: Request, response: Response) => {
    response.json({ success: true, data: await this.reports.get(request.params.id as string) });
  };

  updateStatus = async (request: Request, response: Response) => {
    const report = await this.reports.updateStatus(
      request.params.id as string,
      request.body.status as ReportStatus,
    );
    response.json({ success: true, data: report });
  };

  delete = async (request: Request, response: Response) => {
    await this.reports.delete(request.params.id as string);
    response.status(204).send();
  };

  stats = async (_request: Request, response: Response) => {
    response.json({ success: true, ...(await this.reports.stats()) });
  };
}
