import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { TagList } from "@/components/ui/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalTime } from "@/components/ui/local-time";
import { getSegment, getSegmentAudience } from "@/lib/services/marketing";
import { archiveSegmentAction } from "@/actions/marketing";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export default async function SegmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  await requireUser();
  const segment = await getSegment(id);
  if (!segment) notFound();
  const audience = await getSegmentAudience(segment.criteria);
  const error = getParam(raw, "error");

  return (
    <div className="space-y-6">
      <PageHeader
        title={segment.name}
        description={segment.description ?? undefined}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/segments/${segment.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            {!segment.archivedAt ? (
              <form action={archiveSegmentAction.bind(null, segment.id)}>
                <ConfirmSubmit
                  message="Archive this segment? Existing campaigns keep their audience snapshot."
                  className={cn(buttonVariants({ variant: "outline" }), "text-destructive")}
                >
                  <Trash2 className="size-4" /> Archive
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Matching contacts ({segment.audienceCount})</CardTitle>
          </CardHeader>
          <CardContent>
            {audience.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts match this segment right now.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audience.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{contact.companyName ?? "—"}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {segment.archivedAt ? <Badge variant="outline">Archived</Badge> : null}
              <div>
                <p className="text-muted-foreground">Tags</p>
                {segment.criteria.tags?.length ? <TagList tags={segment.criteria.tags} /> : <p>Any</p>}
              </div>
              <div>
                <p className="text-muted-foreground">Industry</p>
                <p>{segment.criteria.industry ?? "Any"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Job title contains</p>
                <p>{segment.criteria.jobTitle ?? "Any"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created between</p>
                <p>
                  {segment.criteria.createdFrom ?? "Any"} – {segment.criteria.createdTo ?? "Any"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Created by</p>
                <p>{segment.creatorName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <LocalTime value={segment.updatedAt} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
