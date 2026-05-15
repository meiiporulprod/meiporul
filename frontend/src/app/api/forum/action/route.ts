import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, action_type } = await req.json();
  if (!post_id || !action_type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Toggle: try insert, if unique conflict then delete
  const { error: insertErr } = await supabase
    .from("forum_actions")
    .insert({ user_id: user.id, post_id, action_type });

  if (insertErr?.code === "23505") {
    // Already exists — undo (remove the action)
    await supabase
      .from("forum_actions")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", post_id)
      .eq("action_type", action_type);
    return NextResponse.json({ toggled: "removed" });
  }

  return NextResponse.json({ toggled: "added" });
}
