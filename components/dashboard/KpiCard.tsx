import { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  accent?: "default" | "warning" | "danger";
  icon?: ReactNode;
}

export function KpiCard({ label, value, sublabel, accent = "default", icon }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-[--color-muted]">{label}</div>
        {icon && (
          <div
            className={cn(
              "size-9 rounded-[--radius] grid place-items-center",
              accent === "warning" && "bg-[--color-accent-amber]/10 text-[--color-accent-amber]",
              accent === "danger" && "bg-[--color-accent-red]/10 text-[--color-accent-red]",
              accent === "default" && "bg-[--color-brand-500]/10 text-[--color-brand-400]",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 kpi-number text-3xl md:text-4xl text-[--color-foreground]">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-[--color-muted-2]">{sublabel}</div>
      )}
    </Card>
  );
}
