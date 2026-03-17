/**
 * Assignment Intelligence: generates student-facing study notes from raw assignment data.
 * Runs during sync (Step 3) - notes are precomputed before user clicks assignment.
 * Separates internal AI context from user-facing output.
 */

import type { ItemType } from "@/models/Assignment";
import type { ExtractedDeadline } from "@/lib/types";

export interface AssignmentStudyNotes {
  // User-facing (shown on assignment pages)
  aiDescription: string;
  whatYouNeedToDo: string[];
  officialDueDate?: Date;
  inferredDueDate?: Date;
  dueDateStatus: "confirmed" | "inferred" | "conflict" | "unknown" | "hidden";
  dueDateConflictReason?: string;
  wrongDateConclusion?: string;
  helpfulTips: string[];
  talkingPoints: string[];
  firstStep: string;
  aiNotes: string;
  evidenceUsed: string[];
  itemType: ItemType;
  finalPriorityScore?: number;
  priorityReason?: string;
}

export interface AssignmentInput {
  title: string;
  description?: string;
  materialsText?: string;
  officialDueDate?: Date;
  inferredDueDate?: Date;
  dueDateConflict?: boolean;
  dueDateConflictReason?: string;
  extractedDeadlines?: Array<{ date: Date; source: string; confidence: string }>;
  itemType?: ItemType;
  courseContext?: {
    activeUnit?: string;
    recentTopics?: string[];
    importantTerms?: string[];
  };
}

/**
 * Generate student-facing study notes from assignment data.
 * Uses rule-based extraction when AI is unavailable; can be enhanced with LLM later.
 */
export function generateAssignmentStudyNotes(input: AssignmentInput): AssignmentStudyNotes {
  const evidenceUsed: string[] = [];
  const { title, description, materialsText, officialDueDate, inferredDueDate, dueDateConflict, dueDateConflictReason, extractedDeadlines, itemType, courseContext } = input;

  const fullText = [title, description ?? "", materialsText ?? ""].join("\n");
  const evidenceText = [description, materialsText].filter(Boolean).join(" ");

  // --- Due date logic ---
  let dueDateStatus: AssignmentStudyNotes["dueDateStatus"] = "unknown";
  let wrongDateConclusion: string | undefined;

  if (officialDueDate && !inferredDueDate) {
    dueDateStatus = "confirmed";
    evidenceUsed.push(`Official due date from Classroom: ${formatDate(officialDueDate)}`);
  } else if (!officialDueDate && inferredDueDate) {
    dueDateStatus = "hidden";
    const source = extractedDeadlines?.[0]?.source ?? "assignment text";
    evidenceUsed.push(`Inferred from ${source}: ${formatDate(inferredDueDate)}`);
  } else if (officialDueDate && inferredDueDate && dueDateConflict) {
    dueDateStatus = "conflict";
    wrongDateConclusion = dueDateConflictReason ?? `Classroom shows ${formatDate(officialDueDate)} but text/attachments suggest ${formatDate(inferredDueDate)}. Verify with teacher.`;
    evidenceUsed.push(`Date conflict: ${wrongDateConclusion}`);
  } else if (inferredDueDate) {
    dueDateStatus = "inferred";
    evidenceUsed.push(`Inferred due date: ${formatDate(inferredDueDate)}`);
  }

  // --- What you need to do ---
  const whatYouNeedToDo = extractChecklistItems(fullText);

  // --- AI description ---
  const aiDescription = buildAiDescription(title, description, materialsText, itemType);

  // --- First step ---
  const firstStep = inferFirstStep(title, itemType, whatYouNeedToDo);

  // --- Helpful tips ---
  const helpfulTips = inferTips(itemType, courseContext);

  // --- Talking points ---
  const talkingPoints = inferTalkingPoints(title, itemType, dueDateStatus);

  // --- AI notes ---
  const aiNotes = buildAiNotes(itemType, dueDateStatus, courseContext);

  return {
    aiDescription,
    whatYouNeedToDo,
    officialDueDate,
    inferredDueDate,
    dueDateStatus,
    dueDateConflictReason,
    wrongDateConclusion,
    helpfulTips,
    talkingPoints,
    firstStep,
    aiNotes,
    evidenceUsed,
    itemType: itemType ?? "assignment",
  };
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function extractChecklistItems(text: string): string[] {
  const items: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Numbered: 1. 2. 3. or 1) 2)
    const numbered = trimmed.match(/^\d+[\.\)]\s*(.+)$/);
    if (numbered) {
      items.push(numbered[1].trim());
      continue;
    }
    // Bullet: - * •
    const bullet = trimmed.match(/^[-*•]\s*(.+)$/);
    if (bullet) {
      items.push(bullet[1].trim());
      continue;
    }
    // "Submit", "Complete", "Read", "Write"
    if (/^(submit|complete|read|write|answer|prepare|study|review)\b/i.test(trimmed) && trimmed.length < 120) {
      items.push(trimmed);
    }
  }
  if (items.length === 0) {
    items.push("Review the assignment requirements and materials");
    if (text.length > 50) items.push("Check attached documents for detailed instructions");
  }
  return items.slice(0, 8);
}

function buildAiDescription(title: string, description?: string, materialsText?: string, itemType?: ItemType): string {
  const typeHint = itemType === "quiz" || itemType === "test" ? "This is an assessment. " : "";
  if (description && description.length > 20) {
    const summary = description.length > 200 ? description.slice(0, 200) + "…" : description;
    return `${typeHint}${title}: ${summary}`;
  }
  if (materialsText && materialsText.length > 20) {
    const summary = materialsText.length > 150 ? materialsText.slice(0, 150) + "…" : materialsText;
    return `${typeHint}${title}. Key content: ${summary}`;
  }
  return `${typeHint}${title}. Review the assignment and attachments for full details.`;
}

function inferFirstStep(title: string, itemType?: ItemType, checklist?: string[]): string {
  if (itemType === "quiz" || itemType === "test") {
    return "Review your notes and any study materials before starting the assessment.";
  }
  if (itemType === "reading") {
    return "Open the reading material and skim the headings to get an overview.";
  }
  if (checklist && checklist.length > 0) {
    return checklist[0];
  }
  return "Open the assignment and read through all requirements and attachments.";
}

function inferTips(itemType?: ItemType, courseContext?: { importantTerms?: string[] }): string[] {
  const tips: string[] = [];
  if (itemType === "quiz" || itemType === "test") {
    tips.push("Set aside uninterrupted time for the assessment.");
    tips.push("Double-check your answers before submitting.");
  }
  if (itemType === "project") {
    tips.push("Break the project into smaller tasks and tackle them one at a time.");
    tips.push("Start early to leave time for revisions.");
  }
  if (courseContext?.importantTerms && courseContext.importantTerms.length > 0) {
    tips.push(`Key terms to know: ${courseContext.importantTerms.slice(0, 5).join(", ")}`);
  }
  if (tips.length === 0) {
    tips.push("Read all instructions before starting.");
    tips.push("Use the materials and links provided.");
  }
  return tips;
}

function inferTalkingPoints(title: string, itemType?: ItemType, dueDateStatus?: string): string[] {
  const points: string[] = [];
  if (dueDateStatus === "conflict" || dueDateStatus === "hidden") {
    points.push("Ask your teacher to confirm the actual due date.");
  }
  if (itemType === "quiz" || itemType === "test") {
    points.push("Clarify what topics are covered if unsure.");
  }
  points.push(`Questions about "${title}"`);
  return points;
}

function buildAiNotes(itemType?: ItemType, dueDateStatus?: string, courseContext?: { activeUnit?: string }): string {
  const parts: string[] = [];
  if (courseContext?.activeUnit) {
    parts.push(`Current unit: ${courseContext.activeUnit}`);
  }
  if (dueDateStatus === "conflict") {
    parts.push("There may be a date conflict—verify the deadline with your teacher.");
  }
  if (itemType === "study_task") {
    parts.push("This is a study task—schedule it before any related quiz or test.");
  }
  return parts.length > 0 ? parts.join(" ") : "Use the checklist and tips above to stay on track.";
}
