/**
 * File parsing utilities.
 * Extracts text from PDF, TXT, and DOCX for deadline/assignment detection.
 */

import { extractTextFromPdf } from "./pdf";
import { readFile } from "fs/promises";
import path from "path";

export async function extractTextFromFile(
  storagePath: string,
  mimeType: string,
  originalName?: string
): Promise<string> {
  const absolutePath = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(process.cwd(), storagePath);
  const buffer = await readFile(absolutePath);

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer);
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch {
      return "";
    }
  }

  return "";
}

export type InferredItemType =
  | "quiz"
  | "test"
  | "reading"
  | "project"
  | "study_task"
  | "assignment";

export function inferItemTypeFromTitle(title: string): InferredItemType | null {
  const lower = title.toLowerCase();
  if (/\bquiz\b|\bquizzes\b|quiz\s+\d|chapter\s+\d+\s*quiz/i.test(lower)) return "quiz";
  if (
    /\btest\b|\bexam\b|\bmidterm\b|\bfinal\b|\bunit\s+test\b|\bassessment\b|pop\s+quiz/i.test(lower)
  )
    return "test";
  if (/\bstudy\b|\bstudy\s+guide\b|\breview\b|\bprepare\s+for\b/i.test(lower)) return "study_task";
  if (/\breading\b|\bread\b|\bch\s*\d|chapter\s*\d|\bpages?\s+\d/i.test(lower)) return "reading";
  if (/\bproject\b|\bpresentation\b|\bessay\b|\bresearch\b/i.test(lower)) return "project";
  return "assignment";
}

/** Infer item type from combined title + description + attachment content */
export function inferItemTypeFromContent(
  title: string,
  description?: string,
  attachmentText?: string
): InferredItemType {
  const combined = [title, description ?? "", attachmentText ?? ""].join(" ").toLowerCase();
  if (/\bquiz\b|\bquizzes\b|multiple\s+choice|short\s+answer\s+question/i.test(combined))
    return "quiz";
  if (
    /\btest\b|\bexam\b|\bmidterm\b|\bfinal\b|\bunit\s+test\b|\bassessment\b|pop\s+quiz/i.test(combined)
  )
    return "test";
  if (/\bstudy\b|\bstudy\s+guide\b|\breview\b|\bprepare\s+for\b/i.test(combined)) return "study_task";
  if (/\breading\b|\bread\b|\bch\s*\d|chapter\s*\d/i.test(combined)) return "reading";
  if (/\bproject\b|\bpresentation\b|\bessay\b|\bresearch\b/i.test(combined)) return "project";
  return inferItemTypeFromTitle(title) ?? "assignment";
}
