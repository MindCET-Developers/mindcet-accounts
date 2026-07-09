import Link from "next/link";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { NavLinks } from "./NavLinks";

export function Header({ user }: { user: User }) {
  const name = (user.user_metadata?.full_name as string) ?? user.email ?? "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="h-14 border-b border-[--color-border-soft] bg-[--color-surface] flex items-center justify-between gap-4 px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-4 md:gap-6 min-w-0">
        <Link href="/invoices" className="flex items-center gap-2 shrink-0">
          <span className="text-base">💳</span>
          <span className="hidden sm:inline text-sm font-semibold tracking-tight">
            MindCET
          </span>
        </Link>
        <NavLinks />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="size-7 rounded-full object-cover ring-1 ring-[--color-border]"
            />
          ) : (
            <div className="size-7 rounded-full bg-[--color-brand-600] grid place-items-center text-xs font-medium text-white">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="hidden sm:inline text-[--color-muted]">{name}</span>
        </div>

        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="size-8 grid place-items-center rounded-[--radius] text-[--color-muted] hover:text-[--color-foreground] hover:bg-[--color-surface-2] transition-colors"
            aria-label="התנתקות"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
