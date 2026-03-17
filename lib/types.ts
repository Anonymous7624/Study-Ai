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

// Assignment, Course, Post, CourseContext - used by context-builder and priority-engine
export interface Assignment {
  topic?: string;
  description?: string;
  aiSummary?: string;
  materials?: Array<{ title?: string }>;
  officialDueDate?: Date;
  inferredDueDate?: Date;
  dueDateConflict?: boolean;
  urgencyScore?: number;
  importanceScore?: number;
  estimatedDifficulty?: number;
  estimatedEffort?: number;
  easyScore?: number;
  finalPriorityScore?: number;
}

export type AssignmentDoc = Assignment;

export interface Course {
  currentUnitSummary?: string;
  name?: string;
}

export interface Post {
  type?: string;
  text?: string;
  extractedTopics?: string[];
  extractedDates?: Array<{ date: Date; confidence: string }>;
}

export interface CourseContext {
  activeUnit?: string;
  recentTopics?: string[];
  importantTerms?: string[];
  likelyTeacherRules?: string[];
  aiClassSummary?: string;
}
