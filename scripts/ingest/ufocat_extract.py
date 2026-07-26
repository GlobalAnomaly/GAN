"""Extract UFOCAT 2023 into normalised JSONL for the ingest pipeline.

Python because nothing else reads .accdb without the Microsoft ACE driver, which
this machine does not have. The seam is deliberate: Python handles the
format-specific extraction, TypeScript handles the domain logic, so the matcher
and the editorial rules live with the rest of the tested code.

Everything below that looks fussy was verified against the codebook and then
against the data, because each one silently corrupts the archive if guessed:

  Longitude sign     The codebook's English system makes West and North
                     positive. Standard practice is West negative. So longitude
                     is negated and latitude is not. Checked: Newport WA stores
                     117.05 and is at 117.05 W; Hoppers Crossing, Australia
                     stores -144.69 and is at 144.69 E.

  X3                 Selects the coordinate system. Null on 320,400 of 320,412
                     rows, so the exotic cases are 12 records: '=' means known
                     to be in error, 'Q' unchecked, 'M' French metric at 400
                     grads from the Paris meridian.

  British grid       148 records put a two-letter Ordnance Survey square in
                     LATITUDE. Converting OSGB36 properly is real work and a
                     100km square is too coarse for a pin, so the record is kept
                     and the coordinates are dropped. A wrong pin is worse than
                     no pin.

  Minute-point       44 records write fractions as minutes ("48'30") rather than
                     decimals. Converted, not discarded.

  TYPE first digit   '0' marks entries that are deliberately NOT UFO events:
                     nuclear tests, aircraft crashes, power failures, crop
                     circles, deaths of UFO figures. 13,502 of them. They would
                     otherwise become sightings on the map.

  LEVEL              The contributor's availability choice. 0 and 1 are
                     confidential and dropped entirely; 2 keeps the record but
                     loses witness names.

  Range check        33 rows hold impossible values, from a separator missing in
                     the fixed-width field ("4005" for 40.05, "-8155" for
                     -81.55) and from plain typos (94.77 where North Little Rock
                     is at 34.77). Deliberately NOT repaired: dividing by 100
                     would also silently convert the typos into plausible but
                     wrong locations, which is the failure that matters most
                     here. Coordinates dropped, record kept.

  REGION / STATE     REGION is not a country. It is one of 17 continent-level
                     codes, where CA means Central America and CN means Canada,
                     and STATE is the subdivision: GBR is Great Britain inside
                     EU, WA is Washington inside US. STATE alone is not unique,
                     since CA is both California and the Central America region,
                     so the WORLD table is keyed on the pair.

Output is JSONL at .pipeline/ufocat.jsonl, which is gitignored. Narrative text is
written to a separate file so the publishable facts and the local-only prose
cannot be confused for one another downstream.
"""

from access_parser import AccessParser
import json
import os
import re

ACCDB = r"D:\Git\Websites\Global Anomaly Network\UFO Data\ufocat2023.accdb"
OUT_DIR = r"D:\Git\Websites\Global Anomaly Network\.pipeline"

FACTS_PATH = os.path.join(OUT_DIR, "ufocat.jsonl")
NOTES_PATH = os.path.join(OUT_DIR, "ufocat-notes.jsonl")

# Availability codes that must never be published. 1 may appear only as a tally.
LEVEL_CONFIDENTIAL = {"0", "1"}
LEVEL_NAMES_WITHHELD = {"2"}

# UFOCAT's 17 region codes onto our continent enum. Oceans, Antarctica, "World"
# and "Outer Space" all become unknown, because the enum has no honest home for
# them and inventing one would put a pin in the middle of the Pacific as though
# that were a location.
CONTINENT = {
    "US": "north_america",
    "CN": "north_america",   # Canada
    "CA": "north_america",   # Central America, not California
    "NA": "north_america",
    "SA": "south_america",
    "EU": "europe",
    "AF": "africa",
    "AS": "asia",
    "ME": "asia",            # Middle East
    "AU": "oceania",         # includes Papua New Guinea and New Zealand
    "A": "unknown",          # Atlantic
    "I": "unknown",          # Indian
    "P": "unknown",          # Pacific
    "M": "unknown",          # Mediterranean
    "AA": "unknown",         # Antarctica
    "W": "unknown",          # World
    "XX": "unknown",         # Outer Space
}

# Region codes that are themselves a country, so the country name comes from the
# region rather than from the subdivision.
REGION_IS_COUNTRY = {"US": "United States", "CN": "Canada"}


def in_range(lat, lng):
    return lat is not None and lng is not None \
        and -90 <= lat <= 90 and -180 <= lng <= 180


def clean(v):
    """UFOCAT pads its character fields, so almost everything needs stripping."""
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def parse_coord(raw):
    """One coordinate, unsigned, or None when it cannot be trusted.

    Handles the minute-point notation. Returns None for the British National
    Grid form rather than guessing a 100km square's centre.
    """
    s = clean(raw)
    if not s:
        return None

    # Two leading letters means an Ordnance Survey grid square, not a degree.
    if re.match(r"^[A-Za-z]{2}", s):
        return None

    negative = s.startswith("-")
    s = s.lstrip("+-")

    # Minutes: "48'30" is 48 degrees 30 minutes.
    if "'" in s:
        deg, _, minutes = s.partition("'")
        try:
            value = float(deg or 0) + (float(minutes or 0) / 60.0)
        except ValueError:
            return None
    else:
        try:
            value = float(s)
        except ValueError:
            return None

    return -value if negative else value


def parse_date(year_raw, mo_raw, day_raw):
    """An ISO date and how precisely it is actually known.

    UFOCAT stores dates as characters so it can say "summer" or "E" for early
    month. Those are information about precision, so they downgrade the
    precision rather than being discarded or invented into a 1 January.
    """
    year = clean(year_raw)
    if not year or not year.isdigit():
        return None, "unknown"

    y = int(year)
    if not (1 <= y <= 2100):
        return None, "unknown"

    mo = clean(mo_raw)
    if not mo or not mo.isdigit() or not (1 <= int(mo) <= 12):
        return f"{y:04d}-01-01", "year"

    day = clean(day_raw)
    if not day or not day.isdigit() or not (1 <= int(day) <= 31):
        return f"{y:04d}-{int(mo):02d}-01", "month"

    return f"{y:04d}-{int(mo):02d}-{int(day):02d}", "day"


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    db = AccessParser(ACCDB)

    # (region, state) -> state name. First match wins: the pair is not unique in
    # WORLD, and the duplicates are the same place spelled twice.
    w = db.parse_table("WORLD")
    state_names = {}
    region_names = {}
    for r, rn, s, sn in zip(w["REGION"], w["REGIONNAME"], w["STATE"], w["STATENAME"]):
        if r is not None:
            region_names.setdefault(str(r).strip(), sn if rn is None else str(rn).strip())
        key = (str(r).strip() if r else None, str(s).strip() if s else None)
        if sn is not None:
            state_names.setdefault(key, str(sn).strip())

    t = db.parse_table("ufocat")
    n = len(t["URN"])

    stats = {
        "rows": n,
        "written": 0,
        "dropped_confidential": 0,
        "dropped_non_ufo": 0,
        "names_withheld": 0,
        "coords_ok": 0,
        "coords_dropped_error_flag": 0,
        "coords_dropped_british_grid": 0,
        "coords_flagged_unchecked": 0,
        "coords_dropped_metric": 0,
        "coords_dropped_out_of_range": 0,
        "date_day": 0,
        "date_month": 0,
        "date_year": 0,
        "date_unknown": 0,
        "with_notes": 0,
    }

    with open(FACTS_PATH, "w", encoding="utf8") as facts, \
         open(NOTES_PATH, "w", encoding="utf8") as notes:

        for i in range(n):
            level = clean(t["LEVEL"][i]) or ""
            if level in LEVEL_CONFIDENTIAL:
                stats["dropped_confidential"] += 1
                continue

            type_code = clean(t["TYPE"][i]) or ""
            if type_code.startswith("0"):
                stats["dropped_non_ufo"] += 1
                continue

            region = clean(t["REGION"][i])
            state = clean(t["STATE"][i])

            x3 = clean(t["X3"][i])
            lat = lng = None

            if x3 == "=":
                stats["coords_dropped_error_flag"] += 1
            elif x3 == "M":
                # 400 grads from the Paris meridian. Two records; not worth a
                # conversion path that would never be exercised again.
                stats["coords_dropped_metric"] += 1
            else:
                lat = parse_coord(t["LATITUDE"][i])
                lng_unsigned = parse_coord(t["LONGITUDE"][i])
                # The sign flip. West-positive becomes west-negative.
                lng = -lng_unsigned if lng_unsigned is not None else None

                if lat is None or lng is None:
                    if clean(t["LATITUDE"][i]) and re.match(
                            r"^[A-Za-z]{2}", clean(t["LATITUDE"][i])):
                        stats["coords_dropped_british_grid"] += 1
                    lat = lng = None
                elif not in_range(lat, lng):
                    stats["coords_dropped_out_of_range"] += 1
                    lat = lng = None
                else:
                    stats["coords_ok"] += 1
                    if x3 == "Q":
                        stats["coords_flagged_unchecked"] += 1

            occurred_at, precision = parse_date(
                t["YEAR"][i], t["MO"][i], t["DAY"][i])
            stats["date_" + precision] += 1

            names = clean(t["NAMES"][i])
            if level in LEVEL_NAMES_WITHHELD and names:
                names = None
                stats["names_withheld"] += 1

            urn = t["URN"][i]
            prn = t["PRN"][i]

            record = {
                "source_ref": str(int(urn)) if urn is not None else None,
                # Their hand-built same-event grouping. Carried through as
                # validation data for our own matcher, never published.
                "ufocat_prn": str(int(prn)) if prn is not None else None,
                "occurred_at": occurred_at,
                "date_precision": precision,
                "occurred_raw": " ".join(filter(None, [
                    clean(t["YEAR"][i]), clean(t["MO"][i]),
                    clean(t["DAY"][i]), clean(t["TIME"][i])])) or None,
                # Kept as its own field, not only inside occurred_raw. The
                # matcher uses clock proximity to separate otherwise identical
                # candidates: two accounts of one event at 21:00 and 21:05 are a
                # far better match than 21:00 and 04:00 on the same date.
                "time_raw": clean(t["TIME"][i]),
                "lat": lat,
                "lng": lng,
                "coords_unchecked": x3 == "Q",
                "location_raw": clean(t["LOCATION"][i]),
                "region_code": region,
                "state_code": state,
                "state_name": state_names.get((region, state)),
                # For US and Canada the region *is* the country; elsewhere the
                # subdivision carries it (GBR is Great Britain, MEX is Mexico).
                "country": REGION_IS_COUNTRY.get(region)
                or state_names.get((region, state)),
                "continent": CONTINENT.get(region, "unknown"),
                "county": clean(t["COUNTY"][i]),
                "shape": clean(t["SHAPE"][i]),
                "duration_raw": clean(t["DUR"][i]),
                "observers": None,
                "witness_names": names,
                # Their classifications, kept as theirs.
                "hynek": clean(t["HYNEK"][i]),
                "vallee": clean(t["VALLEE"][i]),
                "svp": clean(t["SVP"][i]),
                "type_code": type_code or None,
                # Their verdict, never translated into ours.
                "source_disposition": clean(t["EXPLAN"][i]),
                "explainability": clean(t["EXPL"][i]),
                # The bibliography: this is what points at primary literature.
                "cited_source": clean(t["SOURCE"][i]),
                "cited_author": clean(t["AUTHOR"][i]),
                "cited_locator": clean(t["PAGEVOL"][i]),
                "level": level or None,
            }

            wits = clean(t["WITS"][i])
            if wits and wits.isdigit():
                record["observers"] = int(wits)

            note = clean(t["NOTES"][i])
            record["has_narrative"] = bool(note)
            if note:
                stats["with_notes"] += 1
                notes.write(json.dumps(
                    {"source_ref": record["source_ref"], "notes": note},
                    ensure_ascii=False) + "\n")

            facts.write(json.dumps(record, ensure_ascii=False) + "\n")
            stats["written"] += 1

    print(json.dumps(stats, indent=2))
    print("\nfacts ->", FACTS_PATH)
    print("notes ->", NOTES_PATH, "(local only, never published)")


if __name__ == "__main__":
    main()
