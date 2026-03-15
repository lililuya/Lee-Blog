"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { syncRagKnowledge } from "@/lib/rag-admin";

export async function syncRagKnowledgeAction() {
  await requireAdmin();

  try {
    const result = await syncRagKnowledge();
    revalidatePath("/admin/rag");
    revalidatePath("/");
    redirect(`/admin/rag?status=synced&chunks=${result.chunkCount}&sources=${result.sourceCount}`);
  } catch (error) {
    console.error("[rag sync]", error);

    const message =
      error instanceof Error && error.message.toLowerCase().includes("embedding")
        ? "embedding"
        : "sync";

    redirect(`/admin/rag?error=${message}`);
  }
}
