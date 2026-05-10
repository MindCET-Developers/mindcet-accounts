"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/services", label: "שירותים", icon: Layers },
  { href: "/invoices", label: "חשבוניות", icon: FileText },
  { href: "/reminders", label: "תזכורות", icon: Bell },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-l border-[--color-border-soft] py-6 px-3">
      <Link href="/" className="flex items-center gap-2.5 px-3 mb-8">
        <div className="size-8 rounded-[10px] bg-gradient-brand grid place-items-center text-base shrink-0">
          💳
        </div>
        <span className="text-sm font-semibold tracking-tight leading-tight">
          MindCET <br />
          <span className="text-[--color-muted] font-normal">Accounts</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-[--radius] text-sm transition-colors",
                active
                  ? "bg-[--color-surface-2] text-[--color-foreground] font-medium"
                  : "text-[--color-muted] hover:text-[--color-foreground] hover:bg-[--color-surface]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
