"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";
import { errorDescriptor } from "@/lib/errors";
import { MAX_CSV_BYTES } from "@/lib/constants";
import { importCsv, type ImportTarget } from "@/lib/services/csv-import";

export async function importCsvAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const target = formData.get("target");
  if (target !== "companies" && target !== "contacts") {
    return { error: { key: "directory.importTarget" } };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: { key: "directory.importFile" } };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: { key: "directory.importFileType" } };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { error: { key: "directory.importFileSize" } };
  }

  let mapping: Record<string, string> = {};
  try {
    mapping = JSON.parse(String(formData.get("mapping") ?? "{}")) as Record<string, string>;
  } catch {
    return { error: { key: "directory.importMapping" } };
  }

  try {
    const report = await importCsv({
      text: await file.text(),
      target: target as ImportTarget,
      mapping,
      actorId: user.id,
    });
    revalidatePath("/companies");
    revalidatePath("/contacts");
    revalidatePath("/dashboard");
    return { report };
  } catch (error) {
    return { error: errorDescriptor(error) };
  }
}
