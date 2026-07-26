"""How many extracted coordinates are physically impossible?

Values like latitude 4005.0 appeared in the regional check. That is the fixed
width format defeating the parser: the codebook says the separator sits in
column 5, and where it is missing entirely "4005" reads as four thousand degrees
rather than 40 degrees 05 minutes.
"""

import json

PATH = r"D:\Git\Websites\Global Anomaly Network\.pipeline\ufocat.jsonl"

bad_lat = bad_lng = ok = none = 0
examples = []

with open(PATH, encoding="utf8") as f:
    for line in f:
        r = json.loads(line)
        la, lo = r["lat"], r["lng"]
        if la is None or lo is None:
            none += 1
            continue
        bl = not (-90 <= la <= 90)
        bo = not (-180 <= lo <= 180)
        if bl:
            bad_lat += 1
        if bo:
            bad_lng += 1
        if bl or bo:
            if len(examples) < 8:
                examples.append((r["location_raw"], r["state"], la, lo))
        else:
            ok += 1

print("in range        :", ok)
print("no coordinates  :", none)
print("latitude out of range :", bad_lat)
print("longitude out of range:", bad_lng)
print()
for e in examples:
    print("  ", e)
