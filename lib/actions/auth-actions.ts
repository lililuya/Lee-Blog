"use server";

import { redirect } from "next/navigation";
import { isAuthFlowError } from "@/lib/auth-errors";
import { loginWithCredentials, logoutSession, registerWithCredentials } from "@/lib/auth-service";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function loginAction(formData: FormData) {
  const next = getString(formData, "next") || "/admin";
  try {
    const result = await loginWithCredentials({
      email: getString(formData, "email"),
      password: getString(formData, "password"),
    });

    if (result.requiresTwoFactor) {
      redirect("/login?error=two-factor-required");
    }

    redirect(result.user.role === "ADMIN" ? next : next === "/admin" ? "/" : next);
  } catch (error) {
    if (isAuthFlowError(error) && error.code === "EMAIL_NOT_VERIFIED") {
      redirect("/login?error=verify-email");
    }

    throw error;
  }
}

export async function registerAction(formData: FormData) {
  await registerWithCredentials({
    name: getString(formData, "name"),
    email: getString(formData, "email"),
    password: getString(formData, "password"),
  });

  redirect("/register?notice=verify-email");
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

