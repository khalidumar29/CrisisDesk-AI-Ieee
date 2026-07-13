import { z } from "zod";
import { categories, languages, reportStatuses, urgencies } from "../domain/report";
import { sanitizeText } from "../lib/sanitize";

const clean = (maximum: number) =>
  z.string().transform(sanitizeText).pipe(z.string().min(1).max(maximum));

const optionalClean = (maximum: number) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(maximum))
    .optional()
    .transform((value) => (value ? value : undefined));

export const createReportSchema = z
  .object({
    name: optionalClean(120),
    contact: optionalClean(160),
    location: clean(300),
    description: clean(5000),
    language: z.enum(languages).default("unknown"),
  })
  .strict();

export const updateStatusSchema = z
  .object({ status: z.enum(reportStatuses) })
  .strict();

const dateString = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const listReportsSchema = z
  .object({
    category: z.enum(categories).optional(),
    urgency: z.enum(urgencies).optional(),
    status: z.enum(reportStatuses).optional(),
    search: optionalClean(200),
    from: dateString.optional(),
    to: dateString.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "from must be earlier than or equal to to",
    path: ["from"],
  });

export const reportIdSchema = z.object({ id: z.string().min(1).max(64) });

export type CreateReportInput = z.infer<typeof createReportSchema>;
