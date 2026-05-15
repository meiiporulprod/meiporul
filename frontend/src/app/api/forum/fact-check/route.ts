import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, claim } = await req.json();
  if (!post_id || !claim) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const prompt = `/no_think
You are a fact-checker for Tamil Nadu political content. Analyze the following claim.

CLAIM:
${claim}

Respond ONLY with a valid JSON object, no markdown fences, no explanation outside JSON:
{
  "verdict": "true" | "false" | "misleading" | "unverified" | "satire",
  "neutral_analysis": "2-4 sentences objective analysis with verifiable facts",
  "party_response": "2-3 sentences starting with 'DMK/TVK would argue that...' reflecting their known position"
}`;

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(60000),
    });

    if (!ollamaRes.ok) throw new Error(`Ollama ${ollamaRes.status}`);
    const { response } = await ollamaRes.json() as { response: string };

    // Strip any accidental <think>...</think> blocks and markdown fences
    const cleaned = response
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/```json|```/g, "")
      .trim();

    // Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as {
      verdict: string;
      neutral_analysis: string;
      party_response: string;
    };

    const validVerdicts = ["true", "false", "misleading", "unverified", "satire"];
    if (!validVerdicts.includes(parsed.verdict)) parsed.verdict = "unverified";

    await supabase
      .from("forum_posts")
      .update({
        ai_verdict: parsed.neutral_analysis,
        ai_verdict_label: parsed.verdict,
        ai_party_response: parsed.party_response,
        status: "ai_checked",
      })
      .eq("id", post_id);

    return NextResponse.json({ ok: true, ...parsed });
  } catch (err) {
    console.error("Fact-check error:", err);
    // Save a fallback so the UI doesn't spin forever
    await supabase
      .from("forum_posts")
      .update({
        ai_verdict: "Automated fact-check could not be completed at this time.",
        ai_verdict_label: "unverified",
        status: "ai_checked",
      })
      .eq("id", post_id);
    return NextResponse.json({ error: "AI check failed" }, { status: 500 });
  }
}
