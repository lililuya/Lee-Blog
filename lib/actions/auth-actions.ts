"use server";

import { redirect } from "next/navigation";
import { loginWithCredentials, logoutSession, registerWithCredentials } from "@/lib/auth-service";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function loginAction(formData: FormData) {
  const next = getString(formData, "next") || "/admin";

  await loginWithCredentials({
    email: getString(formData, "email"),
    password: getString(formData, "password"),
  });

  redirect(next);
}

export async function registerAction(formData: FormData) {
  await registerWithCredentials({
    name: getString(formData, "name"),
    email: getString(formData, "email"),
    password: getString(formData, "password"),
  });

  redirect("/");
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

