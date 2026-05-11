import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SHARED_WORKSPACE_NAME = "MindCET";
const SHARED_WORKSPACE_CURRENCY = "USD";

export async function getAuthenticatedServiceCatalog() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    supabase: createAdminClient(),
    user,
  };
}

export async function getSharedWorkspaceId() {
  const supabase = createAdminClient();
  return getOrCreateSharedWorkspaceId(supabase);
}

async function getOrCreateSharedWorkspaceId(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", SHARED_WORKSPACE_NAME)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (workspace) {
    return workspace.id;
  }

  const { data: created, error: createError } = await supabase
    .from("workspaces")
    .insert({
      name: SHARED_WORKSPACE_NAME,
      default_currency: SHARED_WORKSPACE_CURRENCY,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Shared workspace was not created");
  }

  return created.id;
}
