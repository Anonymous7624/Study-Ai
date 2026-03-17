"use server";

import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import UserPreference from "@/models/UserPreference";
import { generateChatResponse, type ChatContext } from "@/lib/ai/provider";

export async function sendChatMessageAction(params: {
  assignmentId: string;
  message: string;
  context: ChatContext;
}): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  await connectDB();
  const prefs = await UserPreference.findOne({ userId: session.id }).lean();

  const baseUrl = prefs?.localModelBaseUrl ?? "http://localhost:11434";
  const modelName = prefs?.modelName ?? "deepseek-r1:7b";

  return generateChatResponse({
    message: params.message,
    context: params.context,
    modelName,
    baseUrl,
  });
}
