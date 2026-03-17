"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { sendChatMessageAction } from "@/app/actions/chat";

interface WorkspaceChatProps {
  assignmentId: string;
  assignmentTitle: string;
  courseName: string;
  teacherIntent?: string | null;
  requirements?: string[];
  firstStep?: string | null;
  classContext?: string | null;
  description?: string | null;
  aiDescription?: string | null;
  evidenceUsed?: string[] | null;
  dueDateStatus?: string | null;
  officialDueDate?: string | Date | null;
  inferredDueDate?: string | Date | null;
  dueDateConflictReason?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatDateForContext(d: string | Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function WorkspaceChat({
  assignmentId,
  assignmentTitle,
  courseName,
  teacherIntent,
  requirements,
  firstStep,
  classContext,
  description,
  aiDescription,
  evidenceUsed,
  dueDateStatus,
  officialDueDate,
  inferredDueDate,
  dueDateConflictReason,
}: WorkspaceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const reply = await sendChatMessageAction({
        assignmentId,
        message: text,
        context: {
          assignmentTitle,
          courseName,
          teacherIntent: teacherIntent ?? undefined,
          requirements: requirements ?? [],
          firstStep: firstStep ?? undefined,
          classContext: classContext ?? undefined,
          description: description ?? undefined,
          aiDescription: aiDescription ?? undefined,
          evidenceUsed: evidenceUsed ?? undefined,
          dueDateStatus: dueDateStatus ?? undefined,
          officialDueDate: formatDateForContext(officialDueDate),
          inferredDueDate: formatDateForContext(inferredDueDate),
          wrongDateConclusion: dueDateConflictReason ?? undefined,
        },
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply ?? "I couldn't generate a response. Make sure Ollama is running with deepseek-r1:7b." },
      ]);
    } catch (err) {
      addToast("Failed to get AI response", "destructive");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I had trouble connecting to the AI. Check that Ollama is running at http://localhost:11434.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about due dates, what to do first, or anything else. Answers use synced evidence from your assignments—no generic fallbacks when evidence exists.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-4 bg-primary text-primary-foreground"
                : "mr-4 bg-muted text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for help..."
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
