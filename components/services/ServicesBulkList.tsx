"use client";

import Link from "next/link";
import { Grid2X2, List, Pencil, Tag, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Service } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { deleteSelectedServices } from "@/app/(app)/services/actions";

type ViewMode = "cards" | "list";

function groupByVendor(services: Service[]): [string, Service[]][] {
  const map = new Map<string, Service[]>();
  for (const service of services) {
    const key = service.vendor?.trim() || "ללא ספק";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(service);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "he"));
}

export function ServicesBulkList({ services }: { services: Service[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = selected.length === services.length;
  const groups = useMemo(() => groupByVendor(services), [services]);

  function toggleService(serviceId: string) {
    setSelected((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : services.map((service) => service.id));
  }

  return (
    <form action={deleteSelectedServices} className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-[--radius] border border-[--color-border-soft] bg-[--color-surface] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-[--color-muted]">
          <input
            type="checkbox"
            className="size-4 accent-[--color-brand-500]"
            checked={allSelected}
            onChange={toggleAll}
          />
          בחירת כל השירותים
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <ViewModeSwitch viewMode={viewMode} onChange={setViewMode} />
          <span className="text-xs text-[--color-muted]">
            {selected.length} נבחרו
          </span>
          <Button
            type="submit"
            variant="danger"
            disabled={selected.length === 0}
            onClick={(event) => {
              if (
                !window.confirm(
                  `למחוק ${selected.length} שירותים? החשבוניות שלהם יישארו במערכת ללא שיוך.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <Trash2 className="size-4" />
            מחיקה
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <ServicesTableGrouped
          groups={groups}
          selectedSet={selectedSet}
          onToggleService={toggleService}
        />
      ) : (
        <div className="grid gap-8">
          {groups.map(([vendor, group]) => (
            <div key={vendor}>
              <h2 className="mb-3 text-sm font-semibold text-[--color-foreground] border-b border-[--color-border-soft] pb-2">
                {vendor}
                <span className="mr-2 text-xs font-normal text-[--color-muted]">
                  ({group.length})
                </span>
              </h2>
              <ServicesCards
                selectedSet={selectedSet}
                services={group}
                onToggleService={toggleService}
              />
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

function ViewModeSwitch({
  onChange,
  viewMode,
}: {
  onChange: (viewMode: ViewMode) => void;
  viewMode: ViewMode;
}) {
  return (
    <div
      className="inline-flex items-center rounded-[--radius] border border-[--color-border-soft] bg-[--color-background] p-1"
      aria-label="בחירת תצוגת שירותים"
    >
      <ViewModeButton
        active={viewMode === "cards"}
        label="תצוגת כרטיסיות"
        onClick={() => onChange("cards")}
      >
        <Grid2X2 className="size-4" />
      </ViewModeButton>
      <ViewModeButton
        active={viewMode === "list"}
        label="תצוגת רשימה"
        onClick={() => onChange("list")}
      >
        <List className="size-4" />
      </ViewModeButton>
    </div>
  );
}

function ViewModeButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-8 place-items-center rounded-[--radius-sm] text-[--color-muted] transition-colors hover:text-[--color-foreground]",
        active && "bg-[--color-surface-2] text-[--color-foreground]",
      )}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

function ServicesCards({
  onToggleService,
  selectedSet,
  services,
}: {
  onToggleService: (serviceId: string) => void;
  selectedSet: Set<string>;
  services: Service[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const checked = selectedSet.has(service.id);

        return (
          <Card key={service.id} className="!p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <label className="mt-1">
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={service.id}
                  className="size-4 accent-[--color-brand-500]"
                  checked={checked}
                  onChange={() => onToggleService(service.id)}
                />
              </label>
              <ServiceTitle service={service} />
              <StatusPill status={service.status} />
            </div>

            <ServicePrice service={service} />

            {service.next_renewal_date && (
              <div className="mt-3 text-xs text-[--color-muted]">
                חידוש: {formatDate(service.next_renewal_date)}
              </div>
            )}

            <Tags tags={service.tags} className="mt-4" />

            <div className="mt-5 border-t border-[--color-border-soft] pt-4">
              <EditLink serviceId={service.id} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ServicesTableGrouped({
  groups,
  onToggleService,
  selectedSet,
}: {
  groups: [string, Service[]][];
  onToggleService: (serviceId: string) => void;
  selectedSet: Set<string>;
}) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="text-xs text-[--color-muted]">
            <tr className="border-b border-[--color-border-soft]">
              <th className="w-12 px-5 py-3 text-right font-medium"></th>
              <th className="px-5 py-3 text-right font-medium">שירות</th>
              <th className="px-5 py-3 text-right font-medium">סטטוס</th>
              <th className="px-5 py-3 text-left font-medium">עלות</th>
              <th className="px-5 py-3 text-right font-medium">חידוש</th>
              <th className="px-5 py-3 text-right font-medium">תגיות</th>
              <th className="px-5 py-3 text-right font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border-soft]">
            {groups.map(([vendor, group]) => (
              <Fragment key={vendor}>
                <tr className="bg-[--color-surface-2]/60">
                  <td colSpan={7} className="px-5 py-2 text-xs font-semibold text-[--color-muted] uppercase tracking-widest">
                    {vendor}
                    <span className="mr-2 font-normal">({group.length})</span>
                  </td>
                </tr>
                {group.map((service) => {
                  const checked = selectedSet.has(service.id);
                  return (
                    <tr key={service.id} className="hover:bg-[--color-surface-2]/50">
                      <td className="px-5 py-4">
                        <label className="inline-flex">
                          <input
                            type="checkbox"
                            name="serviceIds"
                            value={service.id}
                            className="size-4 accent-[--color-brand-500]"
                            checked={checked}
                            onChange={() => onToggleService(service.id)}
                          />
                        </label>
                      </td>
                      <td className="px-5 py-4">
                        <ServiceTitle service={service} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={service.status} />
                      </td>
                      <td className="px-5 py-4 text-left">
                        <ServicePrice service={service} compact />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[--color-muted]">
                        {service.next_renewal_date
                          ? formatDate(service.next_renewal_date)
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <Tags tags={service.tags} compact />
                      </td>
                      <td className="px-5 py-4">
                        <EditLink serviceId={service.id} />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ServicesTable({
  onToggleService,
  selectedSet,
  services,
}: {
  onToggleService: (serviceId: string) => void;
  selectedSet: Set<string>;
  services: Service[];
}) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="text-xs text-[--color-muted]">
            <tr className="border-b border-[--color-border-soft]">
              <th className="w-12 px-5 py-3 text-right font-medium"></th>
              <th className="px-5 py-3 text-right font-medium">שירות</th>
              <th className="px-5 py-3 text-right font-medium">סטטוס</th>
              <th className="px-5 py-3 text-left font-medium">עלות</th>
              <th className="px-5 py-3 text-right font-medium">חידוש</th>
              <th className="px-5 py-3 text-right font-medium">תגיות</th>
              <th className="px-5 py-3 text-right font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border-soft]">
            {services.map((service) => {
              const checked = selectedSet.has(service.id);

              return (
                <tr key={service.id} className="hover:bg-[--color-surface-2]/50">
                  <td className="px-5 py-4">
                    <label className="inline-flex">
                      <input
                        type="checkbox"
                        name="serviceIds"
                        value={service.id}
                        className="size-4 accent-[--color-brand-500]"
                        checked={checked}
                        onChange={() => onToggleService(service.id)}
                      />
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    <ServiceTitle service={service} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={service.status} />
                  </td>
                  <td className="px-5 py-4 text-left">
                    <ServicePrice service={service} compact />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[--color-muted]">
                    {service.next_renewal_date
                      ? formatDate(service.next_renewal_date)
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <Tags tags={service.tags} compact />
                  </td>
                  <td className="px-5 py-4">
                    <EditLink serviceId={service.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ServiceTitle({ service }: { service: Service }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate font-semibold">{service.name}</div>
      {service.vendor && (
        <div className="mt-0.5 truncate text-xs text-[--color-muted]">
          {service.vendor}
        </div>
      )}
    </div>
  );
}

function ServicePrice({
  compact = false,
  service,
}: {
  compact?: boolean;
  service: Service;
}) {
  return (
    <div className={cn("kpi-number", compact ? "text-sm" : "text-2xl")}>
      {formatCurrency(Number(service.cost_amount), service.cost_currency)}
      <span className="mr-1 text-xs font-normal text-[--color-muted-2]">
        / {billingCycleLabel(service.billing_cycle)}
      </span>
    </div>
  );
}

function Tags({
  className,
  compact = false,
  tags,
}: {
  className?: string;
  compact?: boolean;
  tags: string[];
}) {
  if (tags.length === 0) {
    return <span className="text-[--color-muted-2]">-</span>;
  }

  const visibleTags = compact ? tags.slice(0, 3) : tags;
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-[--color-surface-2] px-2 py-0.5 text-[11px] text-[--color-muted]"
        >
          <Tag className="size-2.5" />
          {tag}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-md bg-[--color-surface-2] px-2 py-0.5 text-[11px] text-[--color-muted]">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Service["status"] }) {
  const label =
    status === "active" ? "פעיל" : status === "paused" ? "מושהה" : "בוטל";
  const tone =
    status === "active"
      ? "bg-[--color-accent-green]/10 text-[--color-accent-green]"
      : status === "paused"
        ? "bg-[--color-accent-amber]/10 text-[--color-accent-amber]"
        : "bg-[--color-muted-2]/10 text-[--color-muted]";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}
    >
      {label}
    </span>
  );
}

function EditLink({ serviceId }: { serviceId: string }) {
  return (
    <Link
      href={`/services/${serviceId}/edit`}
      className="inline-flex h-8 items-center gap-2 rounded-[--radius-sm] px-3 text-xs font-medium text-[--color-muted] transition-colors hover:bg-[--color-surface-2] hover:text-[--color-foreground]"
    >
      <Pencil className="size-3.5" />
      עריכה
    </Link>
  );
}

function billingCycleLabel(billingCycle: Service["billing_cycle"]) {
  if (billingCycle === "monthly") {
    return "חודש";
  }

  if (billingCycle === "annual") {
    return "שנה";
  }

  return "חד פעמי";
}
