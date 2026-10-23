"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/errors";
import { MAX_CSV_BYTES } from "@/lib/constants";
import { importCsv, type ImportTarget } from "@/lib/services/csv-import";

export async function importCsvAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const target = formData.get("target");
  if (target !== "companies" && target !== "contacts") {
    return { error: "Choose whether you are importing companies or contacts." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: "Unsupported file type. Upload a .csv file." };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { error: "The file is larger than 5 MB." };
  }

  let mapping: Record<string, string> = {};
  try {
    mapping = JSON.parse(String(formData.get("mapping") ?? "{}")) as Record<string, string>;
  } catch {
    return { error: "The column mapping is invalid." };
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
    return { error: errorMessage(error) };
  }
}
