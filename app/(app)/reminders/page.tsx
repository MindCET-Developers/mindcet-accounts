import { Bell, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import type { Reminder } from "@/lib/types";

type ReminderWithService = Reminder & {
  services: { name: string; next_renewal_date: string | null } | null;
};

export default async function RemindersPage() {
  const supabase = await createClient();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*, services(name, next_renewal_date)")
    .order("days_before", { ascending: false })
    .returns<ReminderWithService[]>();

  const all = reminders ?? [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">תזכורות</h1>
        <p className="text-[--color-muted]">
          ניהול התראות לפני חידושי שירותים ותוקף הנחות.
        </p>
      </div>

      {all.length === 0 ? (
        <Card className="text-center py-16">
          <div className="mx-auto mb-4 size-12 rounded-[--radius-md] bg-[--color-surface-2] grid place-items-center text-[--color-brand-400]">
            <Bell className="size-6" />
          </div>
          <h2 className="text-lg font-medium mb-1">אין תזכורות פעילות</h2>
          <p className="text-sm text-[--color-muted]">
            אחרי הוספת שירותים אפשר יהיה להגדיר תזכורות לחידושים.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {all.map((reminder) => (
            <Card key={reminder.id} className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    {reminder.services?.name ?? "שירות לא ידוע"}
                  </h2>
                  <p className="mt-1 text-sm text-[--color-muted]">
                    {reminder.type === "renewal" ? "חידוש שירות" : "תוקף הנחה"} ·{" "}
                    {reminder.days_before} ימים לפני
                  </p>
                </div>
                <div className="size-9 rounded-[--radius] bg-[--color-brand-500]/10 text-[--color-brand-400] grid place-items-center">
                  <CalendarDays className="size-4" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {reminder.channels.map((channel) => (
                  <span
                    key={channel}
                    className="rounded-md bg-[--color-surface-2] px-2 py-1 text-xs text-[--color-muted]"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
