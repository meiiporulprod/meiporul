import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import SocialClient from "./SocialClient";

export const revalidate = 120;

export type RedditPost = {
  post_id: string;
  subreddit: string;
  title: string;
  permalink: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: string;
  party_mentions: string[];
  sentiment_label: "positive" | "negative" | "neutral";
  sentiment_score: number;
};

export type SubSource = {
  subreddit: string;
  active: boolean;
  description: string | null;
};

export type PartyTally = {
  party: string;
  total: number;
  positive: number;
  negative: number;
};

export default async function SocialPage() {
  const supabase = await createClient();

  const [postsRes, sourcesRes, recentRes] = await Promise.all([
    supabase
      .from("reddit_posts")
      .select(
        "post_id,subreddit,title,permalink,author,score,num_comments,created_utc,party_mentions,sentiment_label,sentiment_score"
      )
      .eq("is_relevant", true)
      .order("created_utc", { ascending: false })
      .limit(300),

    supabase
      .from("reddit_sources")
      .select("subreddit,active,description")
      .eq("active", true)
      .order("subreddit"),

    supabase
      .from("reddit_posts")
      .select("party_mentions,sentiment_label")
      .eq("is_relevant", true)
      .gte(
        "created_utc",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  // Compute 7-day party tally
  const tallyMap: Record<string, PartyTally> = {};
  for (const post of recentRes.data ?? []) {
    for (const party of post.party_mentions ?? []) {
      if (!tallyMap[party])
        tallyMap[party] = { party, total: 0, positive: 0, negative: 0 };
      tallyMap[party].total++;
      if (post.sentiment_label === "positive") tallyMap[party].positive++;
      if (post.sentiment_label === "negative") tallyMap[party].negative++;
    }
  }
  const partyTally = Object.values(tallyMap).sort((a, b) => b.total - a.total);

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Social Pulse</h1>
          <p className="text-slate-400 text-sm">
            Reddit discussion on Tamil Nadu politics · sentiment powered by VADER
          </p>
        </div>
        <SocialClient
          posts={(postsRes.data ?? []) as RedditPost[]}
          sources={(sourcesRes.data ?? []) as SubSource[]}
          partyTally={partyTally}
        />
      </main>
    </>
  );
}
