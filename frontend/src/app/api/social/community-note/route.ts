import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a community note" }, { status: 401 });

  const { tweet_url, note_text } = await req.json();
  if (!tweet_url || !note_text) {
    return NextResponse.json({ error: "Missing tweet_url or note_text" }, { status: 400 });
  }
  if (note_text.length < 10 || note_text.length > 280) {
    return NextResponse.json({ error: "Note must be 10–280 characters" }, { status: 400 });
  }

  const { error } = await supabase
    .from("community_notes")
    .insert({ tweet_url, note_text, submitted_by: user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
