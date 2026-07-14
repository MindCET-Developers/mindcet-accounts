#!/usr/bin/env node
/**
 * Delete all data from Supabase
 * Usage: node scripts/delete-all-data.js
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

async function deleteAllData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
    console.error("Run: vercel env pull");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("🔄 Deleting all data...");

    // Delete in correct order to respect foreign key constraints
    const { error: invoicesError } = await supabase
      .from("invoices")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (invoicesError) throw invoicesError;
    console.log("✅ Deleted invoices");

    const { error: remindersError } = await supabase
      .from("reminders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (remindersError) throw remindersError;
    console.log("✅ Deleted reminders");

    const { error: nonprofitError } = await supabase
      .from("nonprofit_discounts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (nonprofitError) throw nonprofitError;
    console.log("✅ Deleted nonprofit_discounts");

    const { error: servicesError } = await supabase
      .from("services")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (servicesError) throw servicesError;
    console.log("✅ Deleted services");

    console.log("\n✨ All data deleted successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

deleteAllData();
