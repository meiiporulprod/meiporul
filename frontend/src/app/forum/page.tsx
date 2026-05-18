import { createClient } from "@/lib/supabase/server";
import ForumClient from "./ForumClient";

export const revalidate = 0;

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "fake_news" } = await searchParams;
  const supabase = await createClient();

  // Fetch both lists in parallel to allow instant client-side tab switching
  const [
    { data: dbFakePosts },
    { data: dbReportPosts }
  ] = await Promise.all([
    supabase.from("forum_posts_view").select("*").eq("tab", "fake_news").order("created_at", { ascending: false }).limit(50),
    supabase.from("forum_posts_view").select("*").eq("tab", "report_id").order("created_at", { ascending: false }).limit(50),
  ]);

  const fakePosts = dbFakePosts ?? [];
  const reportPosts = dbReportPosts ?? [];

  return (
    <ForumClient
      initialTab={tab}
      fakePosts={fakePosts}
      reportPosts={reportPosts}
    />
  );
}
