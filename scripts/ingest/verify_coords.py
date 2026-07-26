"""Sanity-check the extracted coordinates by region.

The sign flip is the one error that would look fine in a database and put every
US pin in Central Asia. So rather than trust the two spot checks, this asserts
that each region's coordinates fall inside its actual bounding box.
"""

import json

PATH = r"D:\Git\Websites\Global Anomaly Network\.pipeline\ufocat.jsonl"

# region -> (lat_min, lat_max, lng_min, lng_max), generous but wrong-hemisphere
# values cannot pass.
BOXES = {
    "US": (18, 72, -180, -65),
    "CA": (41, 84, -142, -52),
    "FR": (41, 52, -5, 10),
    "GB": (49, 61, -9, 2),
    "DE": (47, 56, 5, 16),
    "AU": (-48, -9, 110, 180),
    "BR": (-34, 6, -74, -34),
    "JP": (24, 46, 122, 154),
    "RU": (41, 82, 19, 180),
    "IT": (35, 48, 6, 19),
}

seen = {k: 0 for k in BOXES}
bad = {k: [] for k in BOXES}
total = 0
with_coords = 0

with open(PATH, encoding="utf8") as f:
    for line in f:
        r = json.loads(line)
        total += 1
        if r["lat"] is None or r["lng"] is None:
            continue
        with_coords += 1
        region = r.get("region")
        if region not in BOXES:
            continue
        seen[region] += 1
        la1, la2, lo1, lo2 = BOXES[region]
        if not (la1 <= r["lat"] <= la2 and lo1 <= r["lng"] <= lo2):
            if len(bad[region]) < 3:
                bad[region].append(
                    (r["location_raw"], r["state"], r["lat"], round(r["lng"], 3)))

print("records:", total, " with coordinates:", with_coords)
print()
print(f"{'region':8} {'checked':>9} {'outside box':>12}  examples")
for region in BOXES:
    n = seen[region]
    if not n:
        continue
    # Count all failures, not just the sampled examples.
    print(f"{region:8} {n:>9} {'':>12}  {bad[region] if bad[region] else 'all inside'}")
