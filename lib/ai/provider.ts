export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIConfig {
  baseUrl: string;
  model: string;
  secondaryModel?: string;
}

const DEFAULT_CONFIG: AIConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: "deepseek-r1:7b",
  secondaryModel: "qwen2.5-coder:7b",
};

let config: AIConfig = { ...DEFAULT_CONFIG };

export function getAIConfig(): AIConfig {
  return { ...config };
}

export function setAIConfig(newConfig: Partial<AIConfig>) {
  config = { ...config, ...newConfig };
}

export async function callOllama(
  messages: AIMessage[],
  options?: { model?: string; baseUrl?: string; temperature?: number }
): Promise<string> {
  const baseUrl = options?.baseUrl ?? config.baseUrl;
  const model = options?.model ?? config.model;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: options?.temperature ?? 0.7 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

export async function generateWithFallback(
  messages: AIMessage[],
  primaryModel?: string,
  secondaryModel?: string
): Promise<string> {
  const models = [
    primaryModel ?? config.model,
    secondaryModel ?? config.secondaryModel ?? "llama3.2:3b",
  ];

  for (const model of models) {
    try {
      return await callOllama(messages, { model });
    } catch (e) {
      console.warn(`Model ${model} failed:`, e);
    }
  }
  throw new Error("All AI models failed");
}

export interface ChatContext {
  assignmentTitle: string;
  courseName: string;
  teacherIntent?: string;
  requirements?: string[];
  firstStep?: string;
  classContext?: string;
  description?: string;
  /** Evidence-driven fields (from sync pipeline) */
  aiDescription?: string;
  whatYouNeedToDo?: string[];
  helpfulTips?: string[];
  talkingPoints?: string[];
  aiNotes?: string;
  evidenceUsed?: string[];
  officialDueDate?: string;
  inferredDueDate?: string;
  dueDateStatus?: string;
  wrongDateConclusion?: string;
}

export async function generateChatResponse(params: {
  message: string;
  context: ChatContext;
  modelName?: string;
  baseUrl?: string;
}): Promise<string> {
  const { PROMPTS } = await import("./prompts");
  const ctx = params.context;

  // Build evidence context for evidence-driven answers
  const evidenceParts: string[] = [
    `Assignment: ${ctx.assignmentTitle}`,
    `Course: ${ctx.courseName}`,
    ctx.aiDescription && `AI breakdown: ${ctx.aiDescription}`,
    ctx.whatYouNeedToDo?.length && `What to do: ${ctx.whatYouNeedToDo.join("; ")}`,
    ctx.firstStep && `First step: ${ctx.firstStep}`,
    ctx.teacherIntent && `Teacher intent: ${ctx.teacherIntent}`,
    ctx.requirements?.length && `Requirements: ${ctx.requirements.join("; ")}`,
    ctx.helpfulTips?.length && `Tips: ${ctx.helpfulTips.join("; ")}`,
    ctx.officialDueDate && `Official due: ${ctx.officialDueDate}`,
    ctx.inferredDueDate && `Inferred due: ${ctx.inferredDueDate}`,
    ctx.dueDateStatus && `Due date status: ${ctx.dueDateStatus}`,
    ctx.wrongDateConclusion && `Date note: ${ctx.wrongDateConclusion}`,
    ctx.evidenceUsed?.length && `Evidence: ${ctx.evidenceUsed.join(" | ")}`,
    ctx.classContext && `Class context: ${ctx.classContext}`,
    ctx.description && `Description: ${ctx.description}`,
  ].filter(Boolean) as string[];

  const evidenceContext = evidenceParts.join("\n");

  const systemPrompt = `You are ClassPilot, an advanced AI academic copilot. Answer using the synced evidence provided. NEVER say "check with your teacher" when the evidence clearly answers the question. Prioritize: stored notes → due-date conclusions → class context → evidence snippets. Only fall back to "verify with your teacher" when evidence is genuinely missing or conflicting.`;

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: evidenceContext.length > 50
        ? PROMPTS.evidenceDrivenTutoring(evidenceContext, params.message)
        : PROMPTS.tutoringContext(evidenceContext, ctx.classContext ?? "No additional class context.", params.message),
    },
  ];

  try {
    return await callOllama(messages, {
      model: params.modelName ?? config.model,
      baseUrl: params.baseUrl ?? config.baseUrl,
    });
  } catch (e) {
    return await generateWithFallback(messages, params.modelName, config.secondaryModel);
  }
}
