"use server";

import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import UserPreference from "@/models/UserPreference";
import { revalidatePath } from "next/cache";

export async function updateSortPreference(sortMode: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await connectDB();
  await UserPreference.findOneAndUpdate(
    { userId: session.id },
    { $set: { defaultSortMode: sortMode } },
    { upsert: true, new: true }
  );
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTheme(theme: "light" | "dark" | "system") {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await connectDB();
  await UserPreference.findOneAndUpdate(
    { userId: session.id },
    { $set: { theme } },
    { upsert: true, new: true }
  );
  revalidatePath("/settings");
  return { success: true };
}

