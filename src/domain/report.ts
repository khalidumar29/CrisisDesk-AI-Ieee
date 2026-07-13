export const categories = [
  "medical",
  "fire",
  "accident",
  "crime",
  "flood",
  "utility",
  "public_service",
  "infrastructure",
  "other",
] as const;

export const urgencies = ["low", "medium", "high", "critical"] as const;
export const languages = ["bn", "en", "unknown"] as const;
export const reportStatuses = [
  "pending",
  "in_review",
  "assigned",
  "resolved",
  "rejected",
] as const;

export type Category = (typeof categories)[number];
export type Urgency = (typeof urgencies)[number];
export type Language = (typeof languages)[number];
export type ReportStatus = (typeof reportStatuses)[number];

export interface Report {
  id: string;
  name: string | null;
  contact: string | null;
  location: string;
  normalizedLocation: string;
  description: string;
  language: Language;
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
  possibleDuplicate: boolean;
  matchedReportId: string | null;
  duplicateScore: number | null;
  status: ReportStatus;
  aiProvider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewReport {
  name?: string;
  contact?: string;
  location: string;
  normalizedLocation: string;
  description: string;
  language: Language;
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
  possibleDuplicate: boolean;
  matchedReportId: string | null;
  duplicateScore: number | null;
  aiProvider: string;
}

export interface ReportFilters {
  category?: Category;
  urgency?: Urgency;
  status?: ReportStatus;
  search?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedReports {
  reports: Report[];
  total: number;
}

export interface ReportStats {
  totalReports: number;
  criticalReports: number;
  pendingReports: number;
  resolvedReports: number;
  categoryBreakdown: Record<string, number>;
  urgencyBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}
