"""
Insert 2026 TN election results for image-based PDFs (AC151–158).
These constituencies' PDFs could not be parsed automatically;
candidate data was extracted manually via OCR on rendered images.

Usage:
    python crawler/insert_image_ac_results.py
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

# ---------------------------------------------------------------------------
# Hardcoded candidate data extracted via EasyOCR from Form 20 PDFs
# Format: (candidate_name, party, evm_votes)
# postal_votes=0 (image PDFs only expose EVM totals)
# ---------------------------------------------------------------------------

AC_DATA = {
    151: {
        "name": "TITTAGUDI",
        "district": "",
        "reservation": "sc",
        "candidates": [
            ("CHANDRAN K.P.",       "Bahujan Samaj Party",                                          399),
            ("KRISHNAVESAN C.V.",   "Dravida Munnetra Kazhagam",                                  63106),
            ("MAHALAKSHMI V.",      "Nam Tamilar Katchi",                                           5709),
            ("ARUMUGARAN N.",       "All India Anna Dravida Munnetra Kazhagam",                    42502),
            ("KARTHIKEYA M.",       "Aanaithintiya Jananayaka Pathukappu",                           362),
            ("PERUMALANIVEL R.",    "All India Puratchi Thalaivar Makkal Munnettra Kazhagam",        443),
            ("RAJASEKAR A.",        "Tamilaga Vettri Kazhagam",                                    60477),
            ("THAYARAMAN N.",       "Bahujan Dravida Party",                                         158),
            ("SATHIYA K.",          "Tamizhaga Vaazhvurimai Katchi",                                 338),
            ("AMBARASAN J.",        "Independent",                                                   275),
            ("DHARMANATHAM V.",     "Independent",                                                   136),
            ("KARINBAM D.",         "Independent",                                                   315),
            ("MURUGAN A.",          "Independent",                                                   401),
            ("MURUGAN G.",          "Independent",                                                   549),
            ("NOTA",                "NOTA",                                                          584),
        ],
    },
    152: {
        "name": "VRIDDHACHALAM",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("JOTHI ANDAPANI",       "Nam Tamilar Katchi",                                          6047),
            ("SURYAPRAKASAM V.",     "Bahujan Samaj Party",                                          374),
            ("PONMALLATHA SUBBASWAMY", "Desiya Murpokku Dravida Kazhagam",                         69351),
            ("VAZHAGAN E.N.",        "Tamizhaga Vaazhvurimai Katchi",                               1896),
            ("DAINAMBI S.",          "Anti Corruption Dynamic Party",                                904),
            ("HIYA B.",              "Anna Makkal Munnetra Kazhagam",                                160),
            ("HARTHAN S.",           "Desiya Makkal Katchi",                                         225),
            ("CHANDRASUNDARI M.",    "Aanaithintiya Jananayaka Pathukappu",                          611),
            ("TAMIZHARASI P.",       "Pattali Makkal Katchi",                                      59791),
            ("VIJAY S.",             "Tamilaga Vettri Kazhagam",                                   66964),
            ("KUMAR K.",             "Independent",                                                  175),
            ("SANKARAN K.",          "Independent",                                                  161),
            ("SRINIVASAN R.",        "Independent",                                                  328),
            ("RAL K.",               "Independent",                                                  738),
            ("VEEGADASS M.",         "Independent",                                                  163),
            ("VELU P.",              "Independent",                                                  252),
            ("BAKARAN T.",           "Independent",                                                  129),
            ("PRAKASH S.",           "Independent",                                                  162),
            ("NOTA",                 "NOTA",                                                         755),
        ],
    },
    153: {
        "name": "NEYVELI",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("RAJENDRAN",          "Dravida Munnetra Kazhagam",                                    52769),
            ("KUMARAN R.",         "All India Anna Dravida Munnetra Kazhagam",                     63731),
            ("KALAYAANI B.",       "Nam Tamilar Katchi",                                            4444),
            ("MURUGAN V.",         "Bahujan Samaj Party",                                            131),
            ("K.",                 "Tamilaga Vettri Kazhagam",                                     34291),
            ("VALAVAN",            "Tamizhaga Vaazhvurimai Katchi",                                11381),
            ("KRISHNAN K.",        "Veerath Thiyagi Viswanatha Party",                               136),
            ("KARTHIKEYAN C.M.",   "Thozhilalarkal Katchi",                                          459),
            ("ANBASEELAN M.",      "Independent",                                                    102),
            ("KARUPPAYAN G.",      "Independent",                                                    221),
            ("CHANDRAN P.",        "Independent",                                                    347),
            ("NOTA",               "NOTA",                                                           768),
        ],
    },
    154: {
        "name": "PANRUTI",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("RAHMAN",             "Viduthalai Chiruthaigal Katchi",                               67735),
            ("YA M.",              "Nam Tamilar Katchi",                                            4884),
            ("D.S.",               "All India Anna Dravida Munnetra Kazhagam",                     78398),
            ("IU S.",              "Bahujan Samaj Party",                                            412),
            ("R.R.",               "Tamizhaga Vaazhvurimai Katchi",                                 1449),
            ("R.",                 "Thamizhaka Padaippalar Makkal Katchi",                           388),
            ("DAN M.",             "Tamilaga Vettri Kazhagam",                                     56022),
            ("SAIF A.",            "Independent",                                                    431),
            ("MURUGAN A.",         "Independent",                                                    141),
            ("NOTA",               "NOTA",                                                           907),
        ],
    },
    155: {
        "name": "CUDDALORE",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("DARASEKARAN",        "Indian National Congress",                                     55337),
            ("PATH.",              "All India Anna Dravida Munnetra Kazhagam",                     55258),
            ("LJAN.",              "Nam Tamilar Katchi",                                            5766),
            ("N.",                 "Bahujan Samaj Party",                                            136),
            ("AMY.",               "All India Puratchi Thalaivar Makkal Munnettra Kazhagam",        375),
            ("KUMAR.",             "Tamilaga Vettri Kazhagam",                                     70856),
            ("MOHAN.",             "Tamizhaga Vaazhvurimai Katchi",                                  623),
            ("BARAN.",             "Independent",                                                     51),
            ("VTHI.",              "Independent",                                                     97),
            ("SUNDARAM.",          "Independent",                                                     62),
            ("KALI.",              "Independent",                                                    327),
            ("AN.",                "Independent",                                                     74),
            ("CHANDRAN.",          "Independent",                                                     97),
            ("AMANI.",             "Independent",                                                    211),
            ("IE.",                "Independent",                                                    214),
            ("NOTA",               "NOTA",                                                           894),
        ],
    },
    156: {
        "name": "KURINJIPADI",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("J.",                 "Nam Tamilar Katchi",                                            4813),
            ("RSEL.",              "Bahujan Samaj Party",                                            273),
            ("RAN.",               "Dravida Munnetra Kazhagam",                                    76695),
            ("N.",                 "All India Anna Dravida Munnetra Kazhagam",                     69106),
            ("TVK156C5.",          "Tamizhaga Vaazhvurimai Katchi",                                 7113),
            ("TVK156C6.",          "Tamil Telugu National Party",                                    323),
            ("TVK156C7.",          "Tamilaga Vettri Kazhagam",                                     53110),
            ("AMOO.",              "Independent",                                                    928),
            ("N.2.",               "Independent",                                                    265),
            ("TVK156C10.",         "Independent",                                                    458),
            ("TVK156C11.",         "Independent",                                                    252),
            ("NOTA",               "NOTA",                                                           629),
        ],
    },
    157: {
        "name": "BHUVANAGIRI",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("ARUNMOZHITHEVA",     "All India Anna Dravida Munnetra Kazhagam",                     75707),
            ("KUMARAVELU M.",      "Bahujan Samaj Party",                                            363),
            ("ARAVANAN DURAI",     "Dravida Munnetra Kazhagam",                                    73220),
            ("KUMATHI S.",         "Nam Tamilar Katchi",                                            5105),
            ("MAHALINGAM T.",      "Tamilaga Vettri Kazhagam",                                     49904),
            ("THAMIZHAN",          "Tamizhaga Vaazhvurimai Katchi",                                  912),
            ("ARUNMOZHI V.",       "Independent",                                                    308),
            ("EZHILVENTHAN P.",    "Independent",                                                     49),
            ("YAPPAN S.",          "Independent",                                                     70),
            ("ARAVANAN",           "Independent",                                                     89),
            ("ALAMURUGAN M.",      "Independent",                                                    324),
            ("ALAMURUGAN G.",      "Independent",                                                    339),
            ("RAJA SEKAR G.",      "Independent",                                                    239),
            ("NOTA",               "NOTA",                                                           681),
        ],
    },
    158: {
        "name": "CHIDAMBARAM",
        "district": "",
        "reservation": "general",
        "candidates": [
            ("ANSARI.",            "Dravida Munnetra Kazhagam",                                    69739),
            ("NTK158C2.",          "Nam Tamilar Katchi",                                            6169),
            ("A.",                 "All India Anna Dravida Munnetra Kazhagam",                     63992),
            ("CHANDRAN M.",        "All India Puratchi Thalaivar Makkal Munnettra Kazhagam",        339),
            ("EZHIYAN.",           "Tamilaga Vettri Kazhagam",                                     54584),
            ("K.",                 "Anna Puratchi Thalaivar Ammaiyal Kazhagam",                     126),
            ("RAJAN.",             "Marumalarchi Dravida Munnetra Kazhagam",                        130),
            ("SIVAM K.",           "Independent",                                                    163),
            ("N.D.",               "Independent",                                                    211),
            ("KUMAR.",             "Independent",                                                    157),
            ("HE.",                "Independent",                                                    160),
            ("NOTA",               "NOTA",                                                           816),
        ],
    },
}


def upsert_constituency(number: int, info: dict) -> str:
    result = supabase.table("election_constituencies").upsert(
        {
            "number": number,
            "name": info["name"],
            "district": info["district"],
            "reservation": info["reservation"],
        },
        on_conflict="number",
    ).execute()
    return result.data[0]["id"]


def upsert_results(constituency_id: str, candidates: list[tuple]):
    # Sort by evm_votes descending to compute rank; NOTA gets rank=0
    non_nota = [(n, p, v) for n, p, v in candidates if n != "NOTA"]
    nota_rows = [(n, p, v) for n, p, v in candidates if n == "NOTA"]

    sorted_cands = sorted(non_nota, key=lambda x: x[2], reverse=True)
    winner_votes = sorted_cands[0][2] if sorted_cands else 0

    rows = []
    for rank, (name, party, votes) in enumerate(sorted_cands, start=1):
        rows.append({
            "constituency_id": constituency_id,
            "election_year": 2026,
            "candidate_name": name,
            "party": party,
            "evm_votes": votes,
            "postal_votes": 0,
            "total_votes": votes,
            "vote_share": None,
            "is_winner": votes == winner_votes,
            "rank": rank,
        })

    for name, party, votes in nota_rows:
        rows.append({
            "constituency_id": constituency_id,
            "election_year": 2026,
            "candidate_name": name,
            "party": party,
            "evm_votes": votes,
            "postal_votes": 0,
            "total_votes": votes,
            "vote_share": None,
            "is_winner": False,
            "rank": 0,
        })

    supabase.table("election_results").upsert(
        rows,
        on_conflict="constituency_id,election_year,candidate_name",
    ).execute()
    return len(rows)


def main():
    total_rows = 0
    for number, info in AC_DATA.items():
        print(f"Upserting AC{number} {info['name']}...", end=" ", flush=True)
        cid = upsert_constituency(number, info)
        n = upsert_results(cid, info["candidates"])
        total_rows += n
        print(f"constituency_id={cid}  {n} rows")

    print(f"\nDone. Total rows upserted: {total_rows}")


if __name__ == "__main__":
    main()
