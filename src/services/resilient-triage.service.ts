import type { TriageInput, TriageResult, TriageService } from "./triage.service";

export class ResilientTriageService implements TriageService {
  constructor(
    private readonly primary: TriageService | null,
    private readonly fallback: TriageService,
    private readonly requirePrimary: boolean,
  ) {}

  async classify(input: TriageInput): Promise<TriageResult> {
    if (!this.primary) return this.fallback.classify(input);
    try {
      return await this.primary.classify(input);
    } catch (error) {
      if (this.requirePrimary) throw error;
      return this.fallback.classify(input);
    }
  }
}
