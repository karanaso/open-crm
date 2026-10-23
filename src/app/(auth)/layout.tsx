import Link from "next/link";
import { BarChart3, Building2, LifeBuoy, Megaphone } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-40 -left-24 size-96 rounded-full bg-black/10 blur-2xl" />
        <Link href="/" className="relative text-lg font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl leading-tight font-semibold text-balance">
            One shared workspace for the whole customer lifecycle.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Keep companies, contacts, deals, support, and campaigns together — with a clear view of what
            needs attention next.
          </p>
          <ul className="grid gap-3 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-2">
              <Building2 className="size-4" /> A single customer directory
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="size-4" /> Pipeline and performance visibility
            </li>
            <li className="flex items-center gap-2">
              <LifeBuoy className="size-4" /> Support SLAs that stay on track
            </li>
            <li className="flex items-center gap-2">
              <Megaphone className="size-4" /> Segments and campaign tracking
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          Self-hosted. Your customer data stays in your database.
        </p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block text-lg font-semibold tracking-tight lg:hidden">
            {APP_NAME}
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
