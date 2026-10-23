"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireAdminForAction } from "@/lib/auth/guards";
import { errorCode } from "@/lib/errors";
import { pipelineSchema, stageSchema } from "@/lib/validation/deal";
import {
  archivePipeline,
  createPipeline,
  createStage,
  deleteStage,
  getPipeline,
  renamePipeline,
  reorderStages,
  setDefaultPipeline,
  updateStage,
} from "@/lib/services/pipelines";

const settingsPath = "/settings/pipelines";

function fail(error: unknown): never {
  redirect(`${settingsPath}?error=${encodeURIComponent(errorCode(error))}`);
}

export async function createPipelineFormAction(formData: FormData) {
  await requireAdminForAction();
  const parsed = pipelineSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) fail("Enter a pipeline name.");
  try {
    await createPipeline(parsed.data.name);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function renamePipelineFormAction(pipelineId: string, formData: FormData) {
  await requireAdminForAction();
  const parsed = pipelineSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) fail("Enter a pipeline name.");
  try {
    await renamePipeline(pipelineId, parsed.data.name);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function setDefaultPipelineFormAction(pipelineId: string) {
  await requireAdminForAction();
  try {
    await setDefaultPipeline(pipelineId);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function archivePipelineFormAction(pipelineId: string) {
  await requireAdminForAction();
  try {
    await archivePipeline(pipelineId);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function createStageFormAction(pipelineId: string, formData: FormData) {
  await requireAdminForAction();
  const parsed = stageSchema.safeParse({
    name: formData.get("name"),
    probability: formData.get("probability"),
    outcome: formData.get("outcome"),
    position: formData.get("position") ?? 0,
  });
  if (!parsed.success) fail("Check the stage fields.");
  try {
    await createStage(pipelineId, parsed.data);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function updateStageFormAction(stageId: string, formData: FormData) {
  await requireAdminForAction();
  const parsed = stageSchema.safeParse({
    name: formData.get("name"),
    probability: formData.get("probability"),
    outcome: formData.get("outcome"),
    position: formData.get("position"),
  });
  if (!parsed.success) fail("Check the stage fields.");
  try {
    await updateStage(stageId, parsed.data);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function deleteStageFormAction(stageId: string) {
  await requireAdminForAction();
  try {
    await deleteStage(stageId);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}

export async function reorderStageFormAction(
  pipelineId: string,
  stageId: string,
  direction: "up" | "down",
) {
  await requireAdminForAction();
  const pipeline = await getPipeline(pipelineId);
  if (!pipeline) fail("Pipeline not found.");
  const ordered = pipeline.stages.map((stage) => stage.id);
  const index = ordered.indexOf(stageId);
  if (index === -1) fail("Stage not found.");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) redirect(settingsPath);
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  try {
    await reorderStages(pipelineId, ordered);
  } catch (error) {
    fail(error);
  }
  revalidatePath(settingsPath);
  revalidatePath("/deals");
  redirect(settingsPath);
}
