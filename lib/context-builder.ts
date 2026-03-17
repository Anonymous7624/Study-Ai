import type { Assignment, Course, Post, CourseContext } from "@/lib/types";

export function buildCourseContextFromData(
  course: Course,
  assignments: Assignment[],
  posts: Post[]
): Partial<CourseContext> {
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

  return {
    activeUnit: inferActiveUnit(recentTopics, assignments),
    recentTopics,
    importantTerms,
    likelyTeacherRules,
    aiClassSummary: course.currentUnitSummary || undefined,
  };
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
