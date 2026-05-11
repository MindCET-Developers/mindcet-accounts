"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedServiceCatalog } from "@/lib/services/shared-catalog";

const bulkDeleteSchema = z.object({
  serviceIds: z.array(z.string().uuid()).min(1),
});

export async function deleteSelectedServices(formData: FormData) {
  const parsed = bulkDeleteSchema.safeParse({
    serviceIds: formData.getAll("serviceIds"),
  });

  if (!parsed.success) {
    redirect(
      `/services?error=${encodeURIComponent("יש לבחור לפחות שירות אחד למחיקה")}`,
    );
  }

  const { supabase } = await getAuthenticatedServiceCatalog();

  const { error } = await supabase
    .from("services")
    .delete()
    .in("id", parsed.data.serviceIds);

  if (error) {
    redirect(`/services?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/invoices");
  revalidatePath("/reminders");
  redirect("/services");
}
