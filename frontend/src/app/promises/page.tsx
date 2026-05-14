import { createClient } from "@/lib/supabase/server";
import PromiseTracker from "@/components/PromiseTracker";
import type { Promise as PromiseRecord } from "@/lib/types";

export const revalidate = 3600;

export default async function PromisesPage() {
  const supabase = await createClient();

  const { data: promises } = await supabase
    .from("promises")
    .select(
      "id, promise_text, promise_tamil, category, status, impact_level, made_on, made_by, source_url, source_name, status_evidence, status_updated_at, status_source_url, created_at"
    )
    .order("category")
    .order("impact_level", { ascending: false })
    .limit(200);

  return <PromiseTracker promises={(promises ?? []) as PromiseRecord[]} />;
}
