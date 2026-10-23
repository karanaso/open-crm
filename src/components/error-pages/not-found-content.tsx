import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NotFoundContent({
  title,
  description,
  backLabel,
}: {
  title: string;
  description: string;
  backLabel: string;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Button asChild>
        <Link href="/dashboard">{backLabel}</Link>
      </Button>
    </div>
  );
}
