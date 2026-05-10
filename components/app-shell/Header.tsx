import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function Header({ user }: { user: User }) {
  const name = (user.user_metadata?.full_name as string) ?? user.email ?? "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="h-14 border-b border-[--color-border-soft] flex items-center justify-between px-6 shrink-0">
      <div className="text-xs text-[--color-muted-2]">
        {/* Breadcrumb / page title slot — wired per page later */}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="size-7 rounded-full object-cover ring-1 ring-[--color-border]"
            />
          ) : (
            <div className="size-7 rounded-full bg-gradient-brand grid place-items-center text-xs font-medium text-white">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="hidden sm:inline text-[--color-muted]">{name}</span>
        </div>

        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="size-8 grid place-items-center rounded-[--radius] text-[--color-muted] hover:text-[--color-foreground] hover:bg-[--color-surface] transition-colors"
            aria-label="התנתקות"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
