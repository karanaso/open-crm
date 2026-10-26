import { redirect } from "@/lib/redirect";
import { countUsers } from "@/db/ensure-default-pipeline";
import { getCurrentUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const users = await countUsers();
  if (users === 0) redirect("/setup");
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  redirect("/login");
}
