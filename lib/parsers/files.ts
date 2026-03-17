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

export function inferItemTypeFromTitle(title: string): "quiz" | "test" | "reading" | "project" | "assignment" | null {
  const lower = title.toLowerCase();
  if (/\bquiz\b|\bquizzes\b/.test(lower)) return "quiz";
  if (/\btest\b|\bexam\b|\bmidterm\b|\bfinal\b/.test(lower)) return "test";
  if (/\breading\b|\bread\b|\bch\s*\d|chapter\s*\d/.test(lower)) return "reading";
  if (/\bproject\b|\bpresentation\b/.test(lower)) return "project";
  return "assignment";
}
