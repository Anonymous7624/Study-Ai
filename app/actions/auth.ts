"use server";

import { redirect } from "next/navigation";
import { signOut as authSignOut } from "@/lib/auth";

export async function signOutAction() {
  await authSignOut();
  redirect("/");
}

export async function signOut() {
  await authSignOut();
  redirect("/");
}
