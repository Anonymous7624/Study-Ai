import type { Assignment, AssignmentDoc } from "@/lib/types";
import type { SortMode } from "@/models/UserPreference";

const SORT_WEIGHTS: Record<
  SortMode,
  Partial<{
    urgencyScore: number;
    officialDueDate: number;
    inferredDueDate: number;
    dueDateConflictRisk: number;
    estimatedDifficulty: number;
    estimatedEffort: number;
    importanceScore: number;
    easyScore: number;
    teacherEmphasis: number;
  }>
> = {
  "ai-recommended": {
    urgencyScore: 0.2,
    officialDueDate: 0.15,
    inferredDueDate: 0.1,
    dueDateConflictRisk: 0.15,
    importanceScore: 0.15,
    easyScore: 0.05,
    estimatedDifficulty: 0.1,
    estimatedEffort: 0.05,
    teacherEmphasis: 0.05,
  },
  "due-soonest": {
    urgencyScore: 0.4,
    officialDueDate: 0.35,
    inferredDueDate: 0.2,
  },
  "most-important": {
    importanceScore: 0.4,
    urgencyScore: 0.2,
    dueDateConflictRisk: 0.15,
  },
  "easiest-first": {
    easyScore: 0.5,
    urgencyScore: 0.2,
  },
  "hardest-first": {
    estimatedDifficulty: 0.4,
    importanceScore: 0.2,
  },
  "shortest-first": {
    estimatedEffort: 0.5,
    urgencyScore: 0.2,
  },
};

export function computePriorityScore(
  assignment: Assignment | AssignmentDoc,
  sortMode: SortMode = "ai-recommended"
): number {
  const weights = SORT_WEIGHTS[sortMode];
  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (weight === undefined) continue;
    const value = assignment[key as keyof Assignment];
    if (typeof value === "number" && value >= 0) {
      score += value * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return assignment.finalPriorityScore ?? assignment.urgencyScore ?? 0;
  }
  return score / totalWeight;
}

export function rankAssignments(
  assignments: (Assignment | AssignmentDoc)[],
  sortMode: SortMode
): (Assignment | AssignmentDoc)[] {
  const withScores = assignments.map((a) => ({
    ...a,
    _computedScore: computePriorityScore(a, sortMode),
  }));

  return withScores
    .sort((a, b) => {
      const diff = (b._computedScore ?? 0) - (a._computedScore ?? 0);
      if (diff !== 0) return diff;
      const aDate = a.officialDueDate || a.inferredDueDate;
      const bDate = b.officialDueDate || b.inferredDueDate;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    })
    .map(({ _computedScore, ...a }) => a);
}

export function getPriorityBadge(
  assignment: Assignment | AssignmentDoc
): "high" | "medium" | "low" {
  const score = assignment.finalPriorityScore ?? assignment.urgencyScore ?? 0;
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}
