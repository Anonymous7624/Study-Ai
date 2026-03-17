export type SortMode =
  | "ai-recommended"
  | "due-soonest"
  | "most-important"
  | "easiest-first"
  | "hardest-first"
  | "shortest-first";

export type DeadlineConfidence = "high" | "medium" | "low";

export interface ExtractedDeadline {
  date: Date;
  confidence: DeadlineConfidence;
  source: string;
  rawText?: string;
}

export interface TeacherPattern {
  pattern: string;
  frequency?: number;
  examples?: string[];
}
