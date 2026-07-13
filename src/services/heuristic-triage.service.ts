import type { Category, Urgency } from "../domain/report";
import { normalizeForComparison } from "../lib/sanitize";
import type { TriageInput, TriageResult, TriageService } from "./triage.service";

const categoryRules: Array<[Category, RegExp]> = [
  ["fire", /\b(fire|burning|smoke|blaze)\b|আগুন|অগ্নি/u],
  ["medical", /\b(medical|injured|unconscious|ambulance|heart|bleeding)\b|আহত|অসুস্থ|রক্ত|অ্যাম্বুলেন্স/u],
  ["accident", /\b(accident|collision|crash|hit)\b|দুর্ঘটনা|সংঘর্ষ/u],
  ["crime", /\b(crime|robbery|theft|attack|weapon|violence)\b|চুরি|ডাকাতি|হামলা|অপরাধ/u],
  ["flood", /\b(flood|waterlogged|overflow|inundated)\b|বন্যা|জলাবদ্ধ|প্লাবিত/u],
  ["utility", /\b(electric|electricity|gas|water supply|power outage|sewer)\b|বিদ্যুৎ|গ্যাস|পানি/u],
  ["infrastructure", /\b(road|bridge|building|pothole|drain)\b|রাস্তা|সেতু|ভবন|ড্রেন/u],
  ["public_service", /\b(garbage|waste|streetlight|service|municipal)\b|ময়লা|আবর্জনা|সেবা/u],
];

const criticalWords = /\b(trapped|dying|dead|explosion|collapsed|weapon|multiple victims)\b|আটকা|মৃত|বিস্ফোরণ|ধসে/u;
const highWords = /\b(urgent|danger|injured|spreading|severe|ambulance)\b|জরুরি|বিপদ|আহত|গুরুতর/u;

const actions: Record<Category, string> = {
  fire: "Immediately notify fire service and emergency responders; keep civilians away from danger.",
  medical: "Dispatch medical responders and request essential patient condition details.",
  accident: "Notify traffic police and emergency medical responders; secure the incident area.",
  crime: "Notify law enforcement and advise the reporter not to confront suspects.",
  flood: "Alert disaster response teams and assess evacuation and safe-route requirements.",
  utility: "Route to the responsible utility team and isolate any immediate electrical or gas hazard.",
  public_service: "Assign the request to the relevant municipal service team for assessment.",
  infrastructure: "Notify public works and restrict access if structural safety may be affected.",
  other: "Send the report for manual triage and request clarification if needed.",
};

export class HeuristicTriageService implements TriageService {
  async classify(input: TriageInput): Promise<TriageResult> {
    const text = normalizeForComparison(`${input.description} ${input.location}`);
    const matched = categoryRules.find(([, pattern]) => pattern.test(text));
    const category = matched?.[0] ?? "other";
    const urgency: Urgency = criticalWords.test(text)
      ? "critical"
      : highWords.test(text)
        ? "high"
        : category === "other" || category === "public_service"
          ? "low"
          : "medium";

    const description = input.description.replace(/\s+/g, " ").trim();
    const summary = description.length <= 180 ? description : `${description.slice(0, 177)}...`;

    return {
      category,
      urgency,
      summary,
      suggestedAction: actions[category],
      confidence: matched ? 0.72 : 0.45,
      provider: "local-fallback-v1",
    };
  }
}
