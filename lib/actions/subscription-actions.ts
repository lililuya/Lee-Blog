"use server";

import { redirect } from "next/navigation";
import { requestEmailSubscription } from "@/lib/email-subscriptions";
import { isDatabaseConfigured } from "@/lib/utils";
import { emailSubscriptionSchema } from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getBoolean(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return false;
  }

  return value === "on" || value === "true" || value === "1";
}

function getSafeRedirectPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/subscribe";
  }

  return value;
}

function buildRedirectUrl(input: {
  redirectPath: string;
  status: string;
  email?: string;
  preview?: string | null;
  postNotificationsEnabled?: boolean;
  digestNotificationsEnabled?: boolean;
  categories?: string[];
  tags?: string[];
  source?: string;
}) {
  const url = new URL(input.redirectPath, "http://localhost");

  for (const key of ["status", "email", "preview", "posts", "digests", "category", "tag", "source"]) {
    url.searchParams.delete(key);
  }

  url.searchParams.set("status", input.status);

  if (input.email) {
    url.searchParams.set("email", input.email);
  }

  if (input.preview) {
    url.searchParams.set("preview", input.preview);
  }

  url.searchParams.set("posts", input.postNotificationsEnabled === false ? "0" : "1");
  url.searchParams.set("digests", input.digestNotificationsEnabled ? "1" : "0");

  for (const category of input.categories ?? []) {
    url.searchParams.append("category", category);
  }

  for (const tag of input.tags ?? []) {
    url.searchParams.append("tag", tag);
  }

  if (input.source) {
    url.searchParams.set("source", input.source);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export async function subscribeToEmailUpdatesAction(formData: FormData) {
  const redirectPath = getSafeRedirectPath(getString(formData, "redirectTo"));
  const source = getString(formData, "source") || undefined;
  const postNotificationsEnabled = getBoolean(formData, "postNotificationsEnabled");
  const digestNotificationsEnabled = getBoolean(formData, "digestNotificationsEnabled");
  const categories = formData
    .getAll("categories")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const tags = formData
    .getAll("tags")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const email = getString(formData, "email");

  if (!isDatabaseConfigured()) {
    redirect(
      buildRedirectUrl({
        redirectPath,
        status: "database",
        email,
        postNotificationsEnabled,
        digestNotificationsEnabled,
        categories: postNotificationsEnabled ? categories : [],
        tags: postNotificationsEnabled ? tags : [],
        source,
      }),
    );
  }

  const parsed = emailSubscriptionSchema.safeParse({
    email,
    name: getString(formData, "name") || undefined,
    postNotificationsEnabled,
    digestNotificationsEnabled,
    categories: postNotificationsEnabled ? categories : [],
    tags: postNotificationsEnabled ? tags : [],
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl({
        redirectPath,
        status: "invalid",
        email,
        postNotificationsEnabled,
        digestNotificationsEnabled,
        categories: postNotificationsEnabled ? categories : [],
        tags: postNotificationsEnabled ? tags : [],
        source,
      }),
    );
  }

  const result = await requestEmailSubscription(parsed.data);

  if (result.status === "updated") {
    redirect(
      buildRedirectUrl({
        redirectPath,
        status: "updated",
        email: result.email,
        postNotificationsEnabled: parsed.data.postNotificationsEnabled,
        digestNotificationsEnabled: parsed.data.digestNotificationsEnabled,
        categories: parsed.data.categories,
        tags: parsed.data.tags,
        source,
      }),
    );
  }

  if (result.previewUrl) {
    redirect(
      buildRedirectUrl({
        redirectPath,
        status: "preview",
        email: result.email,
        preview: result.previewUrl,
        postNotificationsEnabled: parsed.data.postNotificationsEnabled,
        digestNotificationsEnabled: parsed.data.digestNotificationsEnabled,
        categories: parsed.data.categories,
        tags: parsed.data.tags,
        source,
      }),
    );
  }

  redirect(
    buildRedirectUrl({
      redirectPath,
      status: "requested",
      email: result.email,
      postNotificationsEnabled: parsed.data.postNotificationsEnabled,
      digestNotificationsEnabled: parsed.data.digestNotificationsEnabled,
      categories: parsed.data.categories,
      tags: parsed.data.tags,
      source,
    }),
  );
}
