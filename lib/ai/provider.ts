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

export async function generateChatResponse(params: {
  message: string;
  context: {
    assignmentTitle: string;
    courseName: string;
    teacherIntent?: string;
    requirements?: string[];
    firstStep?: string;
    classContext?: string;
    description?: string;
  };
  modelName?: string;
  baseUrl?: string;
}): Promise<string> {
  const { PROMPTS } = await import("./prompts");
  const assignmentContext = [
    `Assignment: ${params.context.assignmentTitle}`,
    `Course: ${params.context.courseName}`,
    params.context.teacherIntent && `Teacher intent: ${params.context.teacherIntent}`,
    params.context.requirements?.length &&
      `Requirements: ${params.context.requirements.join("; ")}`,
    params.context.firstStep && `Suggested first step: ${params.context.firstStep}`,
    params.context.description && `Full description: ${params.context.description}`,
  ]
    .filter(Boolean)
    .join("\n");

  const classContext = params.context.classContext ?? "No additional class context.";

  const systemPrompt = `You are ClassPilot, an AI tutor helping a student with their homework. You have context about their current assignment and class. Answer their questions using this context. Be specific, encouraging, and practical. Help them get started, understand what the teacher wants, organize their work, and answer follow-up questions.`;

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${PROMPTS.tutoringContext(assignmentContext, classContext, params.message)}`,
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
