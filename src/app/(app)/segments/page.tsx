import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TagList } from "@/components/ui/badges";
import { LocalTime } from "@/components/ui/local-time";
import { listSegments } from "@/lib/services/marketing";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const segments = await listSegments(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segments"
        description="Reusable groups of contacts defined by live criteria."
        actions={
          <Button asChild>
            <Link href="/segments/new">
              <Plus className="size-4" /> New segment
            </Link>
          </Button>
        }
      />

      {segments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No segments yet"
          description="Create a segment to group contacts for a campaign."
          action={<Button asChild><Link href="/segments/new">New segment</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Criteria</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((segment) => (
                <TableRow key={segment.id}>
                  <TableCell>
                    <Link href={`/segments/${segment.id}`} className="font-medium hover:underline">
                      {segment.name}
                    </Link>
                    {segment.description ? (
                      <p className="max-w-md truncate text-xs text-muted-foreground">{segment.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {segment.criteria.tags?.length ? <TagList tags={segment.criteria.tags} /> : null}
                      {segment.criteria.industry ? <Badge variant="outline">{segment.criteria.industry}</Badge> : null}
                      {segment.criteria.jobTitle ? <Badge variant="outline">{segment.criteria.jobTitle}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/segments/${segment.id}`} className="font-medium hover:underline">
                      {segment.audienceCount}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={segment.updatedAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
