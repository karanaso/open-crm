import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { globalSearch } from "@/lib/services/search";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const term = request.nextUrl.searchParams.get("q") ?? "";
  const results = await globalSearch(term);
  return Response.json(results);
}
