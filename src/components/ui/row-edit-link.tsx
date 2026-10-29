import Link from "next/link";
import type { Route } from "next";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RowEditLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href={href as Route} aria-label={label} title={label}>
        <Pencil className="size-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
