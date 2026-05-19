"""Quick diagnostic — find problem ACs and show duplicate/missing winners."""
import os, re
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# Search for Vilupuram
r = sb.table("election_constituencies").select("id,number,name").ilike("name", "%ilupuram%").execute()
print("=== Vilupuram search ===")
for row in (r.data or []):
    print(f"  AC{row['number']}: {row['name']}")

# Find ALL constituencies missing a winner (no rank=1)
print("\n=== Constituencies with NO rank=1 winner ===")
all_c = sb.table("election_constituencies").select("id,number,name").order("number").execute().data or []
for c in all_c:
    winners = sb.table("election_results").select("candidate_name,party,total_votes").eq("constituency_id", c["id"]).eq("election_year", 2026).eq("is_winner", True).execute().data or []
    if not winners:
        total = sb.table("election_results").select("id", count="exact").eq("constituency_id", c["id"]).eq("election_year", 2026).execute()
        count = total.count or 0
        if count > 0:
            print(f"  AC{c['number']}: {c['name']} ({count} rows, NO winner)")

# Find ALL constituencies with 2+ rank=1 rows (duplicates)
print("\n=== Constituencies with DUPLICATE rank=1 (will show as 2 cards) ===")
for c in all_c:
    winners = sb.table("election_results").select("candidate_name,party,total_votes").eq("constituency_id", c["id"]).eq("election_year", 2026).eq("rank", 1).execute().data or []
    if len(winners) > 1:
        print(f"  AC{c['number']}: {c['name']}")
        for w in winners:
            print(f"    rank=1  {w['total_votes']:>8,}  {w['party']:<10} {w['candidate_name']}")
