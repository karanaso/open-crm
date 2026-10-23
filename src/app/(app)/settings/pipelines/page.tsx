import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { listPipelines } from "@/lib/services/pipelines";
import {
  archivePipelineFormAction,
  createPipelineFormAction,
  createStageFormAction,
  deleteStageFormAction,
  renamePipelineFormAction,
  reorderStageFormAction,
  setDefaultPipelineFormAction,
  updateStageFormAction,
} from "@/actions/pipelines";
import { cn, formatNumber } from "@/lib/utils";

export default async function PipelineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const error = getParam(raw, "error");
  const pipelines = await listPipelines(false);
  const t = await getTranslations("settings");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
  const locale = await getLocale();

  return (
    <div className="space-y-6">
      <PageHeader title={t("pipelines")} description={t("pipelineSettingsDescription")} />

      <PageError code={error} />

      <Card>
        <CardHeader>
          <CardTitle>{t("newPipeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPipelineFormAction} className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1 space-y-1">
              <label htmlFor="new-pipeline-name" className="text-sm font-medium">
                {t("pipelineName")}
              </label>
              <Input
                id="new-pipeline-name"
                name="name"
                placeholder={t("pipelineNamePlaceholder")}
                required
              />
            </div>
            <Button type="submit">
              <Plus className="size-4" /> {t("createPipeline")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t("newPipelineHint")}</p>
        </CardContent>
      </Card>

      {pipelines.map((pipeline) => (
        <Card key={pipeline.id}>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {pipeline.name}
                {pipeline.isDefault ? <Badge>{t("defaultBadge")}</Badge> : null}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("stageCount", { count: pipeline.stages.length })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!pipeline.isDefault ? (
                <form action={setDefaultPipelineFormAction.bind(null, pipeline.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <Star className="size-4" /> {t("makeDefault")}
                  </Button>
                </form>
              ) : null}
              {!pipeline.isDefault ? (
                <form action={archivePipelineFormAction.bind(null, pipeline.id)}>
                  <ConfirmSubmit
                    message={t("archivePipelineConfirm")}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-destructive")}
                  >
                    <Trash2 className="size-4" /> {tCommon("archive")}
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={renamePipelineFormAction.bind(null, pipeline.id)} className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1 space-y-1">
                <label
                  htmlFor={`pipeline-${pipeline.id}-name`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("renamePipeline")}
                </label>
                <Input id={`pipeline-${pipeline.id}-name`} name="name" defaultValue={pipeline.name} required />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                {t("saveName")}
              </Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("order")}</TableHead>
                  <TableHead>{t("stage")}</TableHead>
                  <TableHead>{t("probability")}</TableHead>
                  <TableHead>{t("outcome")}</TableHead>
                  <TableHead>{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipeline.stages.map((stage, index) => (
                  <TableRow key={stage.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{index + 1}</Badge>
                        <form action={reorderStageFormAction.bind(null, pipeline.id, stage.id, "up")}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={index === 0}
                            aria-label={t("moveStageUp", { name: stage.name })}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                        </form>
                        <form action={reorderStageFormAction.bind(null, pipeline.id, stage.id, "down")}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={index === pipeline.stages.length - 1}
                            aria-label={t("moveStageDown", { name: stage.name })}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                    <TableCell>
                      <form
                        action={updateStageFormAction.bind(null, stage.id)}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Input
                          name="name"
                          defaultValue={stage.name}
                          className="h-8 w-36"
                          aria-label={t("stageName")}
                          required
                        />
                        <input type="hidden" name="position" value={stage.position} />
                        <Input
                          name="probability"
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={stage.probability}
                          className="h-8 w-20"
                          aria-label={t("probability")}
                          required
                        />
                        <select
                          name="outcome"
                          defaultValue={stage.outcome}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          aria-label={t("outcome")}
                        >
                          <option value="open">{tEnums("stageOutcome.open")}</option>
                          <option value="won">{tEnums("stageOutcome.won")}</option>
                          <option value="lost">{tEnums("stageOutcome.lost")}</option>
                        </select>
                        <Button type="submit" variant="secondary" size="sm">
                          {tCommon("save")}
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>{formatNumber(stage.probability, locale)}%</TableCell>
                    <TableCell>
                      <Badge variant={stage.outcome === "won" ? "success" : stage.outcome === "lost" ? "destructive" : "info"}>
                        {tEnums(`stageOutcome.${stage.outcome}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <form action={deleteStageFormAction.bind(null, stage.id)}>
                        <ConfirmSubmit
                          message={t("removeStageConfirm")}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
                        >
                          <Trash2 className="size-3.5" /> {tCommon("remove")}
                        </ConfirmSubmit>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <form action={createStageFormAction.bind(null, pipeline.id)} className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1 space-y-1">
                <label
                  htmlFor={`stage-${pipeline.id}-name`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("addStage")}
                </label>
                <Input
                  id={`stage-${pipeline.id}-name`}
                  name="name"
                  placeholder={t("newStagePlaceholder")}
                  required
                />
              </div>
              <Input
                name="probability"
                type="number"
                min={0}
                max={100}
                defaultValue={50}
                className="h-9 w-24"
                aria-label={t("probability")}
                required
              />
              <select
                name="outcome"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label={t("outcome")}
              >
                <option value="open">{tEnums("stageOutcome.open")}</option>
                <option value="won">{tEnums("stageOutcome.won")}</option>
                <option value="lost">{tEnums("stageOutcome.lost")}</option>
              </select>
              <Button type="submit" size="sm">
                <Plus className="size-4" /> {t("addStage")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
