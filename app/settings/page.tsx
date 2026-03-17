import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import UserPreference from "@/models/UserPreference";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  await connectDB();
  const user = await User.findById(session.id)
    .select("email username displayName createdAt")
    .lean();
  const prefs = await UserPreference.findOne({ userId: session.id }).lean();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your profile, preferences, and connections
          </p>
        </div>

        <SettingsClient
          user={{
            email: user?.email ?? session.email,
            username: user?.username ?? session.username,
            displayName: user?.displayName ?? session.displayName,
            createdAt: user?.createdAt ? String(user.createdAt) : "",
          }}
          preferences={{
            defaultSortMode: prefs?.defaultSortMode ?? "ai-recommended",
            theme: prefs?.theme ?? "system",
            modelName: prefs?.modelName ?? "deepseek-r1:7b",
            localModelBaseUrl: prefs?.localModelBaseUrl ?? "http://localhost:11434",
          }}
        />
      </div>
    </div>
  );
}
