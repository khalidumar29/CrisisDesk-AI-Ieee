import type { Category, Report } from "../domain/report";
import { normalizeForComparison } from "../lib/sanitize";

export interface DuplicateInput {
  location: string;
  description: string;
  category: Category;
}

export interface DuplicateResult {
  possibleDuplicate: boolean;
  matchedReportId: string | null;
  score: number | null;
}

function tokens(value: string): Set<string> {
  return new Set(normalizeForComparison(value).split(" ").filter((part) => part.length > 1));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function bigrams(value: string): Set<string> {
  const normalized = normalizeForComparison(value).replace(/\s+/g, " ");
  const result = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.add(normalized.slice(index, index + 2));
  }
  return result;
}

function textSimilarity(left: string, right: string): number {
  return 0.65 * jaccard(tokens(left), tokens(right)) + 0.35 * jaccard(bigrams(left), bigrams(right));
}

export class DuplicateService {
  constructor(private readonly threshold: number) {}

  find(input: DuplicateInput, candidates: Report[]): DuplicateResult {
    let best: { id: string; score: number } | null = null;

    for (const candidate of candidates) {
      const locationScore = textSimilarity(input.location, candidate.location);
      const descriptionScore = textSimilarity(input.description, candidate.description);
      const categoryScore = input.category === candidate.category ? 1 : 0;
      const score = 0.45 * descriptionScore + 0.35 * locationScore + 0.2 * categoryScore;

      if (!best || score > best.score) best = { id: candidate.id, score };
    }

    if (!best || best.score < this.threshold) {
      return { possibleDuplicate: false, matchedReportId: null, score: best ? round(best.score) : null };
    }

    return { possibleDuplicate: true, matchedReportId: best.id, score: round(best.score) };
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
