"""
Manually trigger AI fact-check on a pending forum post.
Usage: python crawler/fact_check_post.py <post_id>
"""
import os, sys, json, re
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL      = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GROQ_API_KEY      = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL        = "llama-3.1-8b-instant"

if not GROQ_API_KEY:
    print("ERROR: GROQ_API_KEY not set in .env")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python crawler/fact_check_post.py <post_id>")
    sys.exit(1)

post_id = sys.argv[1]
sb = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

# Fetch post
row = sb.table("forum_posts").select("id, title, content, status").eq("id", post_id).single().execute().data
if not row:
    print(f"Post {post_id} not found.")
    sys.exit(1)

print(f"Post: {row['title'][:80]}")
print(f"Status: {row['status']}")

claim = f"{row['title']}\n\n{row['content']}"

system_prompt = "You are a fact-checker specializing in Tamil Nadu politics and misinformation. Your job is to identify the specific false claim being spread and verify whether it is true or false. Always respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON."
user_prompt = f"""A user has reported the following as fake news circulating on social media:

\"\"\"
{claim}
\"\"\"

Instructions:
1. Identify the specific factual claim being spread (ignore who is spreading it — focus on what they are claiming).
2. Fact-check that underlying claim against known facts about Tamil Nadu politics.
3. Verdict must reflect whether the CLAIM BEING SPREAD is true or false — not whether the reporter is correct to flag it.
   - "false" = the claim being spread is demonstrably false
   - "misleading" = the claim has some basis but is distorted or missing key context
   - "true" = the claim is actually factually accurate
   - "unverified" = cannot be confirmed or denied with available information
   - "satire" = the content is clearly satirical

Respond with exactly this JSON structure:
{{
  "verdict": "true" | "false" | "misleading" | "unverified" | "satire",
  "neutral_analysis": "2-4 sentences: state the specific claim being made, then explain what the facts actually show",
  "party_response": "2-3 sentences starting with 'DMK/TVK would argue that...' reflecting their known public position"
}}"""

print("Calling Groq API…")
res = requests.post(
    "https://api.groq.com/openai/v1/chat/completions",
    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
    json={
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 600,
    },
    timeout=30,
)
res.raise_for_status()

raw = res.json()["choices"][0]["message"]["content"].strip()
cleaned = re.sub(r"```json|```", "", raw).strip()
m = re.search(r"\{[\s\S]*\}", cleaned)
if not m:
    print("ERROR: No JSON in Groq response:", raw)
    sys.exit(1)

parsed = json.loads(m.group())
valid = ["true", "false", "misleading", "unverified", "satire"]
if parsed.get("verdict") not in valid:
    parsed["verdict"] = "unverified"

print(f"\nVerdict:  {parsed['verdict']}")
print(f"Analysis: {parsed['neutral_analysis'][:120]}…")

sb.table("forum_posts").update({
    "ai_verdict":       parsed["neutral_analysis"],
    "ai_verdict_label": parsed["verdict"],
    "ai_party_response": parsed.get("party_response", ""),
    "status":           "ai_checked",
}).eq("id", post_id).execute()

print(f"\nDone — post {post_id} updated to ai_checked.")
