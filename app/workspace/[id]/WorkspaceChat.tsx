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
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
            "I had trouble connecting to the AI. Check that Ollama is running (http://localhost:11434) with the deepseek-r1:7b model, or update your settings.",
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
            Ask me anything about this assignment. I’ll use the assignment details and class context
            to help you get started, understand requirements, or plan your work.
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
