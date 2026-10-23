import { redirect } from "@/lib/redirect";
import { countUsers } from "@/db/ensure-default-pipeline";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const users = await countUsers();
  if (users === 0) redirect("/setup");
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  redirect("/login");
}
