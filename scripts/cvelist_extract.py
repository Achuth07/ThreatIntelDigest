"""Streams a CVE List "all CVEs" release zip into one compact JSON line per CVE record (WHA-53).

The release asset is a zip that contains another zip (cves.zip) of about 300k JSON files.
Only the containers scripts/backfill_cvelist.ts reads are kept: cveMetadata, the CNA metrics,
and the CISA-ADP container. Standard library only.

Usage: python3 -I scripts/cvelist_extract.py <YYYY-MM-DD_all_CVEs_at_midnight.zip.zip> <out.ndjson>
"""
import io
import json
import sys
import zipfile


def slim(record):
    containers = record.get("containers", {})
    cna = containers.get("cna", {})
    cisa = [a for a in containers.get("adp", []) if a.get("providerMetadata", {}).get("shortName") == "CISA-ADP"]
    return {
        "cveMetadata": record.get("cveMetadata", {}),
        "containers": {
            "cna": {"metrics": cna.get("metrics", [])},
            "adp": [{"providerMetadata": a.get("providerMetadata", {}), "metrics": a.get("metrics", [])} for a in cisa],
        },
    }


def main(source, target):
    count = 0
    with zipfile.ZipFile(source) as outer:
        inner_name = next(n for n in outer.namelist() if n.endswith(".zip"))
        # The inner zip needs random access; reading it into memory takes about 600 MB.
        with zipfile.ZipFile(io.BytesIO(outer.read(inner_name))) as inner, open(target, "w") as out:
            for name in inner.namelist():
                if not (name.endswith(".json") and "/CVE-" in name):
                    continue
                try:
                    record = json.loads(inner.read(name))
                except ValueError:
                    continue
                out.write(json.dumps(slim(record), separators=(",", ":")) + "\n")
                count += 1
    print(f"{count} records written to {target}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
