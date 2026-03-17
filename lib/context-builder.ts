import type { Assignment, Course, Post } from "@/lib/types";
import type { ICourseContext } from "@/models/CourseContext";

/** User-facing context (shown on assignment pages) */
export interface UserFacingCourseContext {
  activeUnit?: string;
  recentTopics?: string[];
  importantTerms?: string[];
  likelyTeacherRules?: string[];
  aiClassSummary?: string;
}

/** Internal AI-only context (NOT shown to user) */
export interface InternalCourseContext {
  internalUnitSummary?: string;
  teacherPatterns?: string[];
  hiddenDeadlineEvidence?: string[];
  internalReasoningNotes?: string;
  gradeLevelHint?: string;
}

export function buildCourseContextFromData(
  course: Course,
  assignments: Assignment[],
  posts: Post[]
): Partial<ICourseContext> {
  const recentTopics = Array.from(
    new Set([
      ...(assignments.map((a) => a.topic).filter(Boolean) as string[]),
      ...(posts.flatMap((p) => p.extractedTopics || [])),
    ])
  ).slice(0, 10);

  const importantTerms = extractRepeatedTerms([
    ...assignments.map((a) => a.description || ""),
    ...assignments.map((a) => a.aiSummary || "").filter(Boolean),
    ...posts.map((p) => p.text || ""),
  ]);

  const likelyTeacherRules = inferTeacherRules(assignments, posts);
  const teacherPatterns = inferTeacherPatterns(assignments, posts);
  const hiddenDeadlineEvidence = collectHiddenDeadlineEvidence(assignments, posts);
  const internalUnitSummary = buildInternalUnitSummary(recentTopics, assignments);
  const gradeLevelHint = inferGradeLevel(assignments, posts);

  const activeUnit = inferActiveUnit(recentTopics, assignments);
  const aiClassSummary = course.currentUnitSummary ?? (activeUnit ? `Currently on: ${activeUnit}` : undefined);

  return {
    // User-facing
    activeUnit,
    recentTopics,
    importantTerms,
    likelyTeacherRules,
    aiClassSummary,
    // Internal AI-only (NOT shown to user)
    internalUnitSummary,
    teacherPatterns,
    hiddenDeadlineEvidence,
    internalReasoningNotes: buildInternalReasoningNotes(teacherPatterns, hiddenDeadlineEvidence),
    gradeLevelHint,
  };
}

function inferTeacherPatterns(assignments: Assignment[], posts: Post[]): string[] {
  const patterns: string[] = [];
  const rubricCount = assignments.filter(
    (a) =>
      (a.description ?? "").toLowerCase().includes("rubric") ||
      (a as { materials?: Array<{ title?: string }> }).materials?.some((m) =>
        (m.title ?? "").toLowerCase().includes("rubric")
      )
  ).length;
  if (rubricCount >= 2) patterns.push("Frequently includes rubrics");

  const announcementDates = posts.filter(
    (p) => p.type === "announcement" && p.extractedDates && p.extractedDates.length > 0
  ).length;
  if (announcementDates >= 2) patterns.push("Uses announcements for deadline updates");

  const handwrit = assignments.filter((a) =>
    ((a.description ?? "") + (a.aiSummary ?? "")).toLowerCase().includes("handwritten")
  ).length;
  if (handwrit >= 1) patterns.push("Sometimes requires handwritten work");

  return patterns;
}

function collectHiddenDeadlineEvidence(assignments: Assignment[], posts: Post[]): string[] {
  const evidence: string[] = [];
  for (const p of posts) {
    const text = p.text ?? "";
    if (!text) continue;
    const dates = p.extractedDates ?? [];
    for (const d of dates) {
      const dateStr = d.date instanceof Date ? d.date.toLocaleDateString() : String(d.date);
      evidence.push(`Announcement: "${text.slice(0, 80)}..." -> ${dateStr}`);
    }
  }
  for (const a of assignments) {
    const extracted = (a as { extractedDeadlines?: Array<{ date: Date; source: string }> }).extractedDeadlines ?? [];
    const official = (a as { officialDueDate?: Date }).officialDueDate;
    for (const e of extracted) {
      const d = e.date instanceof Date ? e.date.toLocaleDateString() : String(e.date);
      if (!official || Math.abs(new Date(e.date).getTime() - new Date(official).getTime()) > 86400000) {
        evidence.push(`Assignment "${(a as { title?: string }).title ?? ""}": ${e.source} -> ${d}`);
      }
    }
  }
  return evidence.slice(0, 15);
}

function buildInternalUnitSummary(recentTopics: string[], assignments: Assignment[]): string {
  const topics = recentTopics.slice(0, 5).join(", ") || "General";
  const count = assignments.length;
  return `Current focus: ${topics}. ${count} assignments in context.`;
}

function buildInternalReasoningNotes(teacherPatterns: string[], hiddenEvidence: string[]): string {
  const parts: string[] = [];
  if (teacherPatterns.length > 0) {
    parts.push(`Teacher patterns: ${teacherPatterns.join("; ")}`);
  }
  if (hiddenEvidence.length > 0) {
    parts.push(`Hidden deadline evidence: ${hiddenEvidence.length} items.`);
  }
  return parts.join(" ");
}

function inferGradeLevel(_assignments: Assignment[], _posts: Post[]): string {
  return "General academic level";
}

function extractRepeatedTerms(texts: string[]): string[] {
  const wordCount: Record<string, number> = {};
  const stopWords = new Set(
    "the a an and or but in on at to for of with by from as is was are were be been being have has had do does did will would could should may might must shall can need dare ought used".split(
      " "
    )
  );

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  }

  return Object.entries(wordCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
}

function inferTeacherRules(
  assignments: Assignment[],
  posts: Post[]
): string[] {
  const rules: string[] = [];
  const descWithRubric = assignments.filter(
    (a) =>
      a.description?.toLowerCase().includes("rubric") ||
      a.materials?.some((m) =>
        (m.title || "").toLowerCase().includes("rubric")
      )
  );
  if (descWithRubric.length >= 2) {
    rules.push("Often includes rubric in assignment or attachments");
  }

  const handwritten = assignments.filter((a) =>
    (a.description || a.aiSummary || "").toLowerCase().includes("handwritten")
  );
  if (handwritten.length >= 1) {
    rules.push("May require handwritten work for some assignments");
  }

  const announcementDates = posts.filter(
    (p) =>
      p.type === "announcement" &&
      p.extractedDates &&
      p.extractedDates.length > 0
  );
  if (announcementDates.length >= 2) {
    rules.push("Uses announcements to clarify or update deadlines");
  }

  return rules;
}

function inferActiveUnit(
  recentTopics: string[],
  assignments: Assignment[]
): string {
  if (recentTopics.length > 0) {
    return recentTopics[0];
  }
  const recentAssignments = assignments
    .filter((a) => a.topic)
    .slice(-5)
    .map((a) => a.topic as string);
  const mode = (arr: string[]) => {
    const counts: Record<string, number> = {};
    for (const v of arr) {
      counts[v] = (counts[v] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };
  return mode(recentAssignments) || "General";
}
