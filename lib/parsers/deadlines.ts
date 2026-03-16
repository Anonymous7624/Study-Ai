import type { ExtractedDeadline, DeadlineConfidence } from "@/lib/types";

const DAY_NAMES =
  /(?:next\s+)?(?:this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
const RELATIVE_PHRASES = [
  /(?:due|by|before)\s+(?:next\s+)?(?:this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  /\b(?:due|by|before)\s+tomorrow\b/gi,
  /\b(?:due|by|before)\s+(?:next\s+)?week\b/gi,
  /\b(?:due|by|before)\s+(?:next\s+)?(?:this\s+)?monday\b/gi,
  /\b(?:due|by|before)\s+midnight\b/gi,
  /\b(?:due|by|before)\s+(?:the\s+)?end\s+of\s+(?:the\s+)?(week|day)\b/gi,
];

const EXPLICIT_DATE = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
const EXPLICIT_DATE_ISO = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g;
const MONTH_DAY = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/gi;
const DAY_MONTH = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:,?\s*(\d{4}))?/gi;

const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const DAY_OFFSET: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseMonthDay(
  month: string,
  day: number,
  year?: number
): Date | null {
  const m = MONTH_MAP[month.toLowerCase()];
  if (m === undefined) return null;
  const y = year ?? new Date().getFullYear();
  const d = new Date(y, m, day);
  if (d.getMonth() !== m || d.getDate() !== day) return null;
  return d;
}

function getNextWeekday(dayName: string, from: Date = new Date()): Date {
  const target = DAY_OFFSET[dayName.toLowerCase()];
  if (target === undefined) return from;
  const current = from.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  const result = new Date(from);
  result.setDate(from.getDate() + diff);
  return result;
}

function getTomorrow(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return d;
}

export function extractDeadlines(text: string): ExtractedDeadline[] {
  const results: ExtractedDeadline[] = [];
  const seen = new Set<string>();

  function add(deadline: ExtractedDeadline) {
    const key = deadline.date.toISOString().split("T")[0];
    if (seen.has(key)) return;
    seen.add(key);
    results.push(deadline);
  }

  if (!text || typeof text !== "string") return results;

  // Explicit dates: MM/DD/YYYY or DD-MM-YYYY
  let match;
  const re1 = new RegExp(EXPLICIT_DATE.source, "gi");
  while ((match = re1.exec(text)) !== null) {
    const [, a, b, c] = match;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    const numC = parseInt(c, 10);
    const year = numC < 100 ? 2000 + numC : numC;
    let month: number, day: number;
    if (numA <= 12 && numB <= 31) {
      month = numA - 1;
      day = numB;
    } else if (numB <= 12 && numA <= 31) {
      month = numB - 1;
      day = numA;
    } else continue;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) add({ date: d, confidence: "high", source: "explicit_date", rawText: match[0] });
  }

  // ISO: YYYY-MM-DD
  const re2 = new RegExp(EXPLICIT_DATE_ISO.source, "gi");
  while ((match = re2.exec(text)) !== null) {
    const [, y, m, d] = match;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(date.getTime())) add({ date, confidence: "high", source: "explicit_date", rawText: match[0] });
  }

  // "January 15" or "January 15, 2025"
  const re3 = new RegExp(MONTH_DAY.source, "gi");
  while ((match = re3.exec(text)) !== null) {
    const [, month, day, year] = match;
    const d = parseMonthDay(month, parseInt(day, 10), year ? parseInt(year, 10) : undefined);
    if (d) add({ date: d, confidence: "high", source: "month_day", rawText: match[0] });
  }

  // "15th January"
  const re4 = new RegExp(DAY_MONTH.source, "gi");
  while ((match = re4.exec(text)) !== null) {
    const [, day, month, year] = match;
    const d = parseMonthDay(month, parseInt(day, 10), year ? parseInt(year, 10) : undefined);
    if (d) add({ date: d, confidence: "high", source: "day_month", rawText: match[0] });
  }

  // "by next Monday", "due Friday"
  const re5 = new RegExp(DAY_NAMES.source, "gi");
  while ((match = re5.exec(text)) !== null) {
    const dayName = match[1].toLowerCase();
    const d = getNextWeekday(dayName);
    add({ date: d, confidence: "medium", source: "weekday", rawText: match[0] });
  }

  // "due tomorrow"
  if (/\b(?:due|by|before)\s+tomorrow\b/i.test(text)) {
    add({ date: getTomorrow(), confidence: "medium", source: "tomorrow", rawText: "tomorrow" });
  }

  return results;
}
