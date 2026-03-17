"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { updateSortPreference, updateTheme } from "../actions/settings";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Upload,
  Loader2,
  FileText,
  Link2,
  Unlink,
  CheckCircle2,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "ai-recommended", label: "AI Recommended" },
  { value: "due-soonest", label: "Due Soonest" },
  { value: "most-important", label: "Most Important" },
  { value: "easiest-first", label: "Easiest First" },
  { value: "hardest-first", label: "Hardest First" },
  { value: "shortest-first", label: "Shortest First" },
];

const ALLOWED_EXT = [".pdf", ".txt", ".docx", ".png", ".jpg", ".jpeg", ".webp"];

interface SettingsClientProps {
  user: { email: string; username: string; displayName: string; createdAt: string };
  preferences: {
    defaultSortMode: string;
    theme: string;
  };
}

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  sourceType: string;
};

export function SettingsClient({ user, preferences }: SettingsClientProps) {
  const [theme, setTheme] = useState(preferences.theme);
  const [sortMode, setSortMode] = useState(preferences.defaultSortMode);
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName || user.username);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const addToast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash === "connections" || hash === "uploads") setActiveTab(hash);
  }, []);

  useEffect(() => {
    const connected = searchParams.get("google_connected");
    const error = searchParams.get("google_error");
    if (connected) {
      addToast("Google connected successfully");
      router.replace("/settings", { scroll: false });
    } else if (error) {
      addToast(
        error === "denied" ? "Google connection was cancelled" : `Google connection failed: ${error}`,
        "destructive"
      );
      router.replace("/settings", { scroll: false });
    }
  }, [searchParams, addToast, router]);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/status");
      const data = await res.json();
      setGoogleConnected(data.connected ?? false);
      setGoogleEmail(data.googleEmail ?? null);
    } catch {
      setGoogleConnected(false);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

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

  const handleSaveAccount = async () => {
    setAccountSaving(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() !== user.email ? email.trim() : undefined,
          username: username.trim() !== user.username ? username.trim() : undefined,
          displayName: displayName.trim() !== (user.displayName || user.username) ? displayName.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast("Account updated");
        if (data.user) {
          setEmail(data.user.email);
          setUsername(data.user.username);
          setDisplayName(data.user.displayName ?? data.user.username);
        }
      } else {
        addToast(data.error ?? "Failed to update", "destructive");
      }
    } catch {
      addToast("Failed to update account", "destructive");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordCurrent || !passwordNew || !passwordConfirm) {
      addToast("Please fill all password fields", "destructive");
      return;
    }
    if (passwordNew.length < 8) {
      addToast("New password must be at least 8 characters", "destructive");
      return;
    }
    if (passwordNew !== passwordConfirm) {
      addToast("Passwords do not match", "destructive");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordCurrent,
          newPassword: passwordNew,
          confirmPassword: passwordConfirm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast("Password updated");
        setPasswordCurrent("");
        setPasswordNew("");
        setPasswordConfirm("");
      } else {
        addToast(data.error ?? "Failed to update password", "destructive");
      }
    } catch {
      addToast("Failed to update password", "destructive");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = "/api/google/connect";
  };

  const handleDisconnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (res.ok) {
        setGoogleConnected(false);
        setGoogleEmail(null);
        addToast("Google disconnected");
      } else {
        addToast("Failed to disconnect", "destructive");
      }
    } catch {
      addToast("Failed to disconnect", "destructive");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList?.length || uploading) return;
    const file = fileList[0];
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      addToast("File type not allowed. Use PDF, TXT, DOCX, PNG, JPEG, WebP", "destructive");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.file) {
        setFiles((p) => [
          {
            id: data.file.id,
            originalName: data.file.originalName,
            mimeType: data.file.mimeType,
            size: data.file.size,
            uploadedAt: data.file.uploadedAt,
            sourceType: data.file.sourceType,
          },
          ...p,
        ]);
        addToast("File uploaded");
      } else {
        addToast(data.error ?? "Upload failed", "destructive");
      }
    } catch {
      addToast("Upload failed", "destructive");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 font-sans">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="uploads">File Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your email, username, and display name
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="letters, numbers, _ and -"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveAccount} disabled={accountSaving} className="gap-2">
                {accountSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {accountSaving ? "Saving…" : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your current password and choose a new one
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordCurrent}
                  onChange={(e) => setPasswordCurrent(e.target.value)}
                  className="mt-1"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={passwordSaving} className="gap-2">
                {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {passwordSaving ? "Updating…" : "Update password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="connections" className="space-y-4" id="connections">
          <Card>
            <CardHeader>
              <CardTitle>Google Connection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect Google Classroom, Drive, Docs, and Slides to sync assignments, materials, and deadlines.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Google (Classroom · Drive · Docs · Slides)</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={googleConnected ? "default" : "secondary"}>
                        {googleConnected ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Connected
                          </>
                        ) : (
                          "Not Connected"
                        )}
                      </Badge>
                      {googleEmail && (
                        <span className="text-sm text-muted-foreground">{googleEmail}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {googleConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectGoogle}
                        disabled={googleLoading}
                      >
                        {googleLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Unlink className="h-4 w-4" />
                            Disconnect
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleConnectGoogle}
                        disabled={googleLoading}
                      >
                        <Link2 className="h-4 w-4" />
                        Connect Google
                      </Button>
                    )}
                  </div>
                </div>
                {googleConnected && (
                  <p className="text-xs text-muted-foreground">
                    Run Sync from the dashboard to pull your latest assignments and materials.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-4" id="uploads">
          <Card>
            <CardHeader>
              <CardTitle>File Uploads</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload PDF, TXT, DOCX, or images. Files are used during sync for AI help.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  dragOver ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25",
                  uploading && "opacity-60 pointer-events-none"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={uploading}
                />
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </span>
                  ) : (
                    <>
                      Drag and drop or{" "}
                      <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                        browse
                      </label>{" "}
                      to upload
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, TXT, DOCX, PNG, JPEG, WebP — max 20MB
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Your files</h4>
                {filesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : files.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No files uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{f.originalName}</p>
                            <p className="text-xs text-muted-foreground">
                              {f.mimeType} · {formatSize(f.size)} · {f.sourceType}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {new Date(f.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
