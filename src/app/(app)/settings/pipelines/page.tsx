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
import { cn } from "@/lib/utils";

export default async function PipelineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const error = getParam(raw, "error");
  const pipelines = await listPipelines(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipelines"
        description="Configure sales stages, probabilities, and which pipeline new deals use by default."
      />

      <PageError code={error} />

      <Card>
        <CardHeader>
          <CardTitle>New pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPipelineFormAction} className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1 space-y-1">
              <label htmlFor="new-pipeline-name" className="text-sm font-medium">
                Pipeline name
              </label>
              <Input id="new-pipeline-name" name="name" placeholder="Partnerships" required />
            </div>
            <Button type="submit">
              <Plus className="size-4" /> Create pipeline
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            New pipelines start with Lead, Qualified, Proposal, Negotiation, Won, and Lost stages.
          </p>
        </CardContent>
      </Card>

      {pipelines.map((pipeline) => (
        <Card key={pipeline.id}>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {pipeline.name}
                {pipeline.isDefault ? <Badge>Default</Badge> : null}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{pipeline.stages.length} stages</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!pipeline.isDefault ? (
                <form action={setDefaultPipelineFormAction.bind(null, pipeline.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <Star className="size-4" /> Make default
                  </Button>
                </form>
              ) : null}
              {!pipeline.isDefault ? (
                <form action={archivePipelineFormAction.bind(null, pipeline.id)}>
                  <ConfirmSubmit
                    message="Archive this pipeline? It must have no deals."
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-destructive")}
                  >
                    <Trash2 className="size-4" /> Archive
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={renamePipelineFormAction.bind(null, pipeline.id)} className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1 space-y-1">
                <label htmlFor={`pipeline-${pipeline.id}-name`} className="text-xs font-medium text-muted-foreground">
                  Rename pipeline
                </label>
                <Input id={`pipeline-${pipeline.id}-name`} name="name" defaultValue={pipeline.name} required />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Save name
              </Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Actions</TableHead>
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
                            aria-label={`Move ${stage.name} up`}
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
                            aria-label={`Move ${stage.name} down`}
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
                        <Input name="name" defaultValue={stage.name} className="h-8 w-36" aria-label="Stage name" required />
                        <input type="hidden" name="position" value={stage.position} />
                        <Input
                          name="probability"
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={stage.probability}
                          className="h-8 w-20"
                          aria-label="Probability"
                          required
                        />
                        <select
                          name="outcome"
                          defaultValue={stage.outcome}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          aria-label="Outcome"
                        >
                          <option value="open">Open</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                        <Button type="submit" variant="secondary" size="sm">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>{stage.probability}%</TableCell>
                    <TableCell>
                      <Badge variant={stage.outcome === "won" ? "success" : stage.outcome === "lost" ? "destructive" : "info"}>
                        {stage.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <form action={deleteStageFormAction.bind(null, stage.id)}>
                        <ConfirmSubmit
                          message="Remove this stage? It must have no deals."
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </ConfirmSubmit>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <form action={createStageFormAction.bind(null, pipeline.id)} className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1 space-y-1">
                <label htmlFor={`stage-${pipeline.id}-name`} className="text-xs font-medium text-muted-foreground">
                  Add stage
                </label>
                <Input id={`stage-${pipeline.id}-name`} name="name" placeholder="New stage" required />
              </div>
              <Input name="probability" type="number" min={0} max={100} defaultValue={50} className="h-9 w-24" aria-label="Probability" required />
              <select name="outcome" className="h-9 rounded-md border border-input bg-background px-2 text-sm" aria-label="Outcome">
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
              <Button type="submit" size="sm">
                <Plus className="size-4" /> Add stage
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
