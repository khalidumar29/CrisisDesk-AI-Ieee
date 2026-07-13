import type { ReportFilters, ReportStatus } from "../domain/report";
import { NotFoundError } from "../lib/errors";
import { normalizeForComparison } from "../lib/sanitize";
import type { ReportRepository } from "../repositories/report.repository";
import type { CreateReportInput } from "../validation/report.schemas";
import { DuplicateService } from "./duplicate.service";
import type { TriageService } from "./triage.service";

export class ReportService {
  constructor(
    private readonly repository: ReportRepository,
    private readonly triage: TriageService,
    private readonly duplicates: DuplicateService,
  ) {}

  async create(input: CreateReportInput) {
    const classification = await this.triage.classify(input);
    const candidates = await this.repository.findDuplicateCandidates(
      classification.category,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    const duplicate = this.duplicates.find(
      {
        location: input.location,
        description: input.description,
        category: classification.category,
      },
      candidates,
    );

    return this.repository.create({
      ...(input.name ? { name: input.name } : {}),
      ...(input.contact ? { contact: input.contact } : {}),
      location: input.location,
      normalizedLocation: normalizeForComparison(input.location),
      description: input.description,
      language: input.language,
      category: classification.category,
      urgency: classification.urgency,
      summary: classification.summary,
      suggestedAction: classification.suggestedAction,
      confidence: classification.confidence,
      possibleDuplicate: duplicate.possibleDuplicate,
      matchedReportId: duplicate.matchedReportId,
      duplicateScore: duplicate.score,
      aiProvider: classification.provider,
    });
  }

  list(filters: ReportFilters) {
    return this.repository.list(filters);
  }

  async get(id: string) {
    const report = await this.repository.findById(id);
    if (!report) throw new NotFoundError();
    return report;
  }

  async updateStatus(id: string, status: ReportStatus) {
    const report = await this.repository.updateStatus(id, status);
    if (!report) throw new NotFoundError();
    return report;
  }

  async delete(id: string) {
    if (!(await this.repository.delete(id))) throw new NotFoundError();
  }

  stats() {
    return this.repository.stats();
  }
}
