"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSortPreference, updateTheme, updateModelConfig } from "../actions/settings";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const SORT_OPTIONS = [
  { value: "ai-recommended", label: "AI Recommended" },
  { value: "due-soonest", label: "Due Soonest" },
  { value: "most-important", label: "Most Important" },
  { value: "easiest-first", label: "Easiest First" },
  { value: "hardest-first", label: "Hardest First" },
  { value: "shortest-first", label: "Shortest First" },
];

interface SettingsClientProps {
  user: { username: string; displayName: string; createdAt: string };
  preferences: {
    defaultSortMode: string;
    theme: string;
    modelName: string;
    localModelBaseUrl: string;
  };
}

export function SettingsClient({ user, preferences }: SettingsClientProps) {
  const [theme, setTheme] = useState(preferences.theme);
  const [sortMode, setSortMode] = useState(preferences.defaultSortMode);
  const [modelName, setModelName] = useState(preferences.modelName);
  const [baseUrl, setBaseUrl] = useState(preferences.localModelBaseUrl);
  const addToast = useToast();
  const router = useRouter();

  const handleThemeChange = async (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    setTheme(newTheme);
    const res = await updateTheme(newTheme);
    if (res.success) {
      addToast("Theme updated");
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  const handleSortChange = async (value: string) => {
    setSortMode(value);
    const res = await updateSortPreference(value);
    if (res.success) addToast("Sort preference saved");
  };

  const handleSaveModel = async () => {
    const res = await updateModelConfig({ modelName, localModelBaseUrl: baseUrl });
    if (res.success) addToast("Model settings saved");
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Local profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your local ClassPilot account
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input value={user.username} disabled className="mt-1" />
          </div>
          <div>
            <Label>Display name</Label>
            <Input value={user.displayName} disabled className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard preferences</CardTitle>
          <p className="text-sm text-muted-foreground">
            Default sort order for assignments
          </p>
        </CardHeader>
        <CardContent>
          <Select value={sortMode} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Local AI endpoint (Ollama-compatible)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Model name</Label>
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="deepseek-r1:7b"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="mt-1"
            />
          </div>
          <Button onClick={handleSaveModel}>Save model settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google connection</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sync Classroom, Drive, and Docs
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                Not connected (local dev)
              </p>
            </div>
            <Button variant="outline" disabled>
              Connect (coming soon)
            </Button>
          </div>
          <Button variant="outline" disabled className="w-full">
            Re-run full sync
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <p className="text-sm text-muted-foreground">Toggle dark mode</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Dark mode</Label>
            <Switch
              id="theme"
              checked={theme === "dark"}
              onCheckedChange={handleThemeChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
