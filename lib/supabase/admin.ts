import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export function createAdminClient() {
  const serverKey = (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!serverKey) {
    throw new Error("Missing Supabase server key");
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serverKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
