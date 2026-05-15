import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, claim } = await req.json();
  if (!post_id || !claim) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Use service role to bypass RLS for AI-written fields
  const svc = createServiceClient();

  if (!GROQ_API_KEY) {
    await svc.from("forum_posts").update({
      ai_verdict: "Fact-check unavailable — GROQ_API_KEY not configured.",
      ai_verdict_label: "unverified",
      status: "ai_checked",
    }).eq("id", post_id);
    return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 503 });
  }

  const systemPrompt = `You are a fact-checker specializing in Tamil Nadu politics.
Always respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON.`;

  const userPrompt = `Fact-check this claim: "${claim}"

Respond with exactly this JSON structure:
{
  "verdict": "true" | "false" | "misleading" | "unverified" | "satire",
  "neutral_analysis": "2-4 sentences of objective analysis citing verifiable facts",
  "party_response": "2-3 sentences starting with 'DMK/TVK would argue that...' from their known position"
}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text()}`);
    const json = await res.json() as { choices: { message: { content: string } }[] };
    const raw = json.choices[0].message.content.trim();

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      verdict: string;
      neutral_analysis: string;
      party_response: string;
    };

    const validVerdicts = ["true", "false", "misleading", "unverified", "satire"];
    if (!validVerdicts.includes(parsed.verdict)) parsed.verdict = "unverified";

    await svc.from("forum_posts").update({
      ai_verdict: parsed.neutral_analysis,
      ai_verdict_label: parsed.verdict,
      ai_party_response: parsed.party_response,
      status: "ai_checked",
    }).eq("id", post_id);

    return NextResponse.json({ ok: true, ...parsed });
  } catch (err) {
    console.error("Fact-check error:", err);
    await svc.from("forum_posts").update({
      ai_verdict: "Automated fact-check could not be completed at this time.",
      ai_verdict_label: "unverified",
      status: "ai_checked",
    }).eq("id", post_id);
    return NextResponse.json({ error: "AI check failed" }, { status: 500 });
  }
}
