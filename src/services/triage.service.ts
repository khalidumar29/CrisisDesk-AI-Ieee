import type { Category, Language, Urgency } from "../domain/report";

export interface TriageInput {
  location: string;
  description: string;
  language: Language;
}

export interface TriageResult {
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
  provider: string;
}

export interface TriageService {
  classify(input: TriageInput): Promise<TriageResult>;
}
