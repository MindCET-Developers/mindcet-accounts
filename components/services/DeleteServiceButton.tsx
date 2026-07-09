"use client";

import { Trash2 } from "lucide-react";
import { deleteSelectedServices } from "@/app/(app)/services/actions";

export function DeleteServiceButton({
  serviceId,
  serviceName,
}: {
  serviceId: string;
  serviceName: string;
}) {
  return (
    <form
      action={deleteSelectedServices}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `למחוק את "${serviceName}"? החשבוניות שלו יישארו במערכת ללא שיוך.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="serviceIds" value={serviceId} />
      <button
        type="submit"
        className="size-8 grid place-items-center rounded-(--radius) text-(--color-muted) hover:text-(--color-accent-red) hover:bg-(--color-surface-2) transition-colors"
        aria-label={`מחיקת ${serviceName}`}
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
