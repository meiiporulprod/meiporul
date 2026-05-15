"""
Patch winner party names in election_results using authoritative constituency-wise data.
Source: BOOM Elections / ECI official results for TN 2026.

Run AFTER scrape_elections.py completes.
AC151-158 (image-based) are skipped — they already have correct party names.
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# constituency_number → winner_party (abbreviation matching partyColor function)
# Skipping 151-158 — those have correct party data from insert_image_ac_results.py
WINNER_PARTIES: dict[int, str] = {
    1:   "TVK",    2:   "TVK",    3:   "AIADMK", 4:   "TVK",    5:   "TVK",
    6:   "TVK",    7:   "TVK",    8:   "TVK",    9:   "TVK",    10:  "TVK",
    11:  "TVK",    12:  "TVK",    13:  "TVK",    14:  "TVK",    15:  "TVK",
    16:  "TVK",    17:  "TVK",    18:  "DMK",    19:  "DMK",    20:  "TVK",
    21:  "TVK",    22:  "TVK",    23:  "TVK",    24:  "TVK",    25:  "TVK",
    26:  "TVK",    27:  "TVK",    28:  "TVK",    29:  "TVK",    30:  "TVK",
    31:  "TVK",    32:  "TVK",    33:  "TVK",    34:  "AIADMK", 35:  "AIADMK",
    36:  "TVK",    37:  "TVK",    38:  "TVK",    39:  "TVK",    40:  "TVK",
    41:  "TVK",    42:  "AIADMK", 43:  "TVK",    44:  "AIADMK", 45:  "TVK",
    46:  "TVK",    47:  "IUML",   48:  "DMK",    49:  "AIADMK", 50:  "TVK",
    51:  "TVK",    52:  "AIADMK", 53:  "TVK",    54:  "DMK",    55:  "AIADMK",
    56:  "CPI",    57:  "AIADMK", 58:  "TVK",    59:  "PMK",    60:  "AIADMK",
    61:  "AIADMK", 62:  "AIADMK", 63:  "DMK",    64:  "AIADMK", 65:  "AIADMK",
    66:  "TVK",    67:  "AIADMK", 68:  "AIADMK", 69:  "DMK",    70:  "PMK",
    71:  "AIADMK", 72:  "VCK",    73:  "DMK",    74:  "DMK",    75:  "PMK",
    76:  "AIADMK", 77:  "DMK",    78:  "DMK",    79:  "AIADMK", 80:  "TVK",
    81:  "AIADMK", 82:  "AIADMK", 83:  "AIADMK", 84:  "AIADMK", 85:  "AIADMK",
    86:  "AIADMK", 87:  "AIADMK", 88:  "TVK",    89:  "TVK",    90:  "TVK",
    91:  "TVK",    92:  "TVK",    93:  "TVK",    94:  "TVK",    95:  "AIADMK",
    96:  "TVK",    97:  "TVK",    98:  "TVK",    99:  "TVK",    100: "TVK",
    101: "AIADMK", 102: "AIADMK", 103: "AIADMK", 104: "AIADMK", 105: "AIADMK",
    106: "TVK",    107: "TVK",    108: "BJP",     109: "DMK",    110: "DMK",
    111: "TVK",    112: "TVK",    113: "TVK",    114: "TVK",    115: "TVK",
    116: "TVK",    117: "TVK",    118: "TVK",    119: "AIADMK", 120: "DMK",
    121: "TVK",    122: "TVK",    123: "DMK",    124: "DMK",    125: "DMK",
    126: "DMK",    127: "AIADMK", 128: "DMK",    129: "DMK",    130: "TVK",
    131: "AIADMK", 132: "DMK",    133: "DMK",    134: "DMK",    135: "AIADMK",
    136: "TVK",    137: "DMK",    138: "TVK",    139: "TVK",    140: "DMK",
    141: "TVK",    142: "TVK",    143: "AIADMK", 144: "DMK",    145: "TVK",
    146: "TVK",    147: "TVK",    148: "DMK",    149: "AIADMK", 150: "PMK",
    # 151-158 skipped (image-based, already patched)
    159: "VCK",    160: "DMK",    161: "INC",    162: "DMK",    163: "DMK",
    164: "CPI(M)", 165: "AIADMK", 166: "CPI",    167: "AMMK",   168: "DMK",
    169: "AIADMK", 170: "DMK",    171: "TVK",    172: "IUML",   173: "DMK",
    174: "TVK",    175: "DMK",    176: "DMK",    177: "DMK",    178: "TVK",
    179: "AIADMK", 180: "DMK",    181: "DMK",    182: "DMK",    183: "TVK",
    184: "TVK",    185: "TVK",    186: "TVK",    187: "TVK",    188: "INC",
    189: "TVK",    190: "TVK",    191: "TVK",    192: "TVK",    193: "TVK",
    194: "TVK",    195: "TVK",    196: "DMK",    197: "TVK",    198: "DMK",
    199: "TVK",    200: "DMK",    201: "TVK",    202: "TVK",    203: "TVK",
    204: "DMK",    205: "TVK",    206: "TVK",    207: "DMK",    208: "DMK",
    209: "DMK",    210: "TVK",    211: "DMK",    212: "DMK",    213: "DMK",
    214: "TVK",    215: "DMK",    216: "TVK",    217: "TVK",    218: "DMK",
    219: "AIADMK", 220: "DMK",    221: "DMK",    222: "DMK",    223: "DMK",
    224: "TVK",    225: "AIADMK", 226: "DMK",    227: "TVK",    228: "TVK",
    229: "AIADMK", 230: "DMK",    231: "INC",    232: "CPI(M)", 233: "INC",
    234: "INC",
}


def main():
    print("Fetching constituency IDs...")
    r = sb.table("election_constituencies").select("id,number").execute()
    num_to_id = {x["number"]: x["id"] for x in r.data}
    print(f"Found {len(num_to_id)} constituencies in DB.")

    updated = 0
    skipped = 0
    for num, party in WINNER_PARTIES.items():
        cid = num_to_id.get(num)
        if not cid:
            print(f"  AC{num}: constituency not in DB, skipping")
            skipped += 1
            continue
        sb.table("election_results").update({"party": party}).eq(
            "constituency_id", cid
        ).eq("is_winner", True).eq("election_year", 2026).execute()
        updated += 1

    print(f"\nDone. Updated {updated} winner party names, skipped {skipped}.")


if __name__ == "__main__":
    main()
