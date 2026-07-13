import type {
  NewReport,
  PaginatedReports,
  Report,
  ReportFilters,
  ReportStats,
  ReportStatus,
} from "../domain/report";

export interface ReportRepository {
  create(input: NewReport): Promise<Report>;
  list(filters: ReportFilters): Promise<PaginatedReports>;
  findById(id: string): Promise<Report | null>;
  updateStatus(id: string, status: ReportStatus): Promise<Report | null>;
  delete(id: string): Promise<boolean>;
  findDuplicateCandidates(category: string, createdAfter: Date): Promise<Report[]>;
  stats(): Promise<ReportStats>;
}
