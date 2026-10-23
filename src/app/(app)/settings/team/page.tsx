import { RotateCcw, ShieldOff, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { InviteMemberForm } from "@/components/settings/invite-member-form";
import { ResetLinkButton } from "@/components/settings/reset-link-button";
import { LocalTime } from "@/components/ui/local-time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { listPendingInvites } from "@/lib/services/invites";
import { listTeamMembers } from "@/lib/services/users";
import {
  changeRoleFormAction,
  revokeInviteFormAction,
  setUserStatusFormAction,
} from "@/actions/team";
import { cn } from "@/lib/utils";

export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireAdmin();
  const raw = await searchParams;
  const error = getParam(raw, "error");
  const [members, invites] = await Promise.all([listTeamMembers(), listPendingInvites()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite teammates, manage roles, deactivate access, and issue password reset links."
      />

      <PageError code={error} />

      <Card>
        <CardHeader>
          <CardTitle>Invite a teammate</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteMemberForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    {member.id === currentUser.id ? (
                      <Badge variant="outline" className="mt-1">You</Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <form action={changeRoleFormAction.bind(null, member.id)} className="flex items-center gap-2">
                      <select
                        name="role"
                        defaultValue={member.role}
                        aria-label={`Role for ${member.name}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <Button type="submit" variant="secondary" size="sm">
                        Save
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "active" ? "success" : "secondary"}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={member.createdAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <ResetLinkButton userId={member.id} name={member.name} />
                      {member.id !== currentUser.id ? (
                        member.status === "active" ? (
                          <form action={setUserStatusFormAction.bind(null, member.id, "inactive")}>
                            <ConfirmSubmit
                              message={`Deactivate ${member.name}? They will lose access immediately.`}
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
                            >
                              <ShieldOff className="size-3.5" /> Deactivate
                            </ConfirmSubmit>
                          </form>
                        ) : (
                          <form action={setUserStatusFormAction.bind(null, member.id, "active")}>
                            <Button type="submit" variant="ghost" size="sm">
                              <RotateCcw className="size-3.5" /> Reactivate
                            </Button>
                          </form>
                        )
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations ({invites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell className="capitalize">{invite.role}</TableCell>
                    <TableCell>
                      <LocalTime value={invite.expiresAt} />
                    </TableCell>
                    <TableCell>
                      <form action={revokeInviteFormAction.bind(null, invite.id)}>
                        <ConfirmSubmit
                          message="Revoke this invitation?"
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
                        >
                          <Trash2 className="size-3.5" /> Revoke
                        </ConfirmSubmit>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
