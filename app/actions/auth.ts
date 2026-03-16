"use server";

import { redirect } from "next/navigation";
import { signIn as authSignIn, signOut as authSignOut } from "@/lib/auth";

export async function signInAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username?.trim()) {
    return { error: "Username is required" };
  }
  if (!password) {
    return { error: "Password is required" };
  }

  const result = await authSignIn(username.trim(), password);
  if (!result.success) {
    return { error: result.error };
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  await authSignOut();
  redirect("/");
}

export async function signOut() {
  await authSignOut();
  redirect("/");
}
