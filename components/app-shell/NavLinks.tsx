"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/invoices", label: "חשבוניות" },
  { href: "/services", label: "הוצאות" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active =
          pathname.startsWith(item.href) ||
          (item.href === "/invoices" && pathname === "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 h-8 inline-flex items-center rounded-[--radius] text-sm transition-colors",
              active
                ? "bg-[--color-surface-2] text-[--color-foreground] font-medium"
                : "text-[--color-muted] hover:text-[--color-foreground] hover:bg-[--color-surface-2]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
