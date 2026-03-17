export const PROMPTS = {
  summarizeAssignment: (
    title: string,
    description: string,
    materialsText: string
  ) =>
    `Summarize this assignment in 1-2 sentences. Be concise.

Title: ${title}
Description: ${description || "(none)"}
Materials/Attachments: ${materialsText || "(none)"}`,

  extractTeacherIntent: (title: string, description: string, materialsText: string) =>
    `What does the teacher likely want students to do? What is the main deliverable? Answer in 2-3 sentences.

Title: ${title}
Description: ${description || "(none)"}
Materials: ${materialsText || "(none)"}`,

  recommendFirstStep: (summary: string, requirements: string) =>
    `Given this assignment summary and requirements, what is the single best first step the student should take? One concrete action.

Summary: ${summary}
Requirements: ${requirements || "(none)"}`,

  rankReason: (
    assignment: string,
    score: number,
    factors: string
  ) =>
    `In one short sentence, explain why this assignment has this priority (score: ${score}). Mention the main factor.

Assignment: ${assignment}
Factors: ${factors}`,

  tutoringContext: (
    assignmentContext: string,
    classContext: string,
    question: string
  ) =>
    `You are a helpful tutor for a student. Use the assignment and class context to answer their question. Be specific, clear, and encouraging. If you don't have enough context, say so and give general guidance.

Assignment context:
${assignmentContext}

Class context:
${classContext}

Student question: ${question}`,
};
