import { NextRequest, NextResponse } from "next/server";
import { checkPublicRateLimit, clientIdentifierFromHeaders } from "@/lib/public-rate-limit";
import { getPublicListing } from "@/lib/services/public-listings";
import { publicListingIdSchema } from "@/lib/validation/public-listings";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function errorResponse(
  code: string,
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    },
  );
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rateLimit = checkPublicRateLimit(clientIdentifierFromHeaders(request.headers));
  if (!rateLimit.allowed) {
    return errorResponse("RATE_LIMITED", "Rate limit exceeded. Retry later.", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const { id } = await context.params;
  const parsedId = publicListingIdSchema.safeParse(id);
  if (!parsedId.success) {
    return errorResponse(
      "INVALID_PARAMETER",
      parsedId.error.issues[0]?.message ?? "id must be a valid UUID",
      400,
    );
  }

  try {
    const listing = await getPublicListing(parsedId.data);
    if (!listing) {
      return errorResponse("NOT_FOUND", "Listing not found.", 404);
    }

    return NextResponse.json(
      { data: listing },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": CACHE_CONTROL,
        },
      },
    );
  } catch {
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}
