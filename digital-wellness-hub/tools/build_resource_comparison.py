"""Export the canonical resources into a standalone CSV and readable Markdown table."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "resources.json"
CSV_OUT = ROOT / "evidence" / "RESOURCE_COMPARISON.csv"
MD_OUT = ROOT / "evidence" / "RESOURCE_COMPARISON.md"
FIELDS = ["name", "purpose", "platform", "cost", "privacy", "accessibility", "limitations", "official_source", "additional_source_and_install_links", "date_checked"]


def rows():
    items = json.loads(SOURCE.read_text(encoding="utf-8"))
    output = []
    for item in items:
        links = item.get("links", [])
        extras = "; ".join(
            f"{link.get('label') or link.get('type') or 'Link'}: {link.get('url', '')}"
            for link in links if link.get("url")
        )
        output.append({
            "name": item.get("name", ""),
            "purpose": item.get("purpose", ""),
            "platform": ", ".join(item.get("platforms", [])),
            "cost": item.get("pricing", ""),
            "privacy": item.get("privacy", ""),
            "accessibility": item.get("accessibility", ""),
            "limitations": item.get("limitations", ""),
            "official_source": f"{item.get('sourceLabel', 'Official source')}: {item.get('officialUrl', '')}",
            "additional_source_and_install_links": extras,
            "date_checked": item.get("dateChecked", ""),
        })
    return output


def main():
    records = rows()
    CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUT.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(records)

    def cell(value):
        return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ")
    lines = [
        "# Resource comparison", "",
        "Standalone comparison exported from `data/resources.json`; generated 17 Nov 2026.",
        "The descriptions are a fit guide, not a universal ranking. Accessibility notes are not independent conformance tests.", "",
        "| " + " | ".join(FIELDS) + " |",
        "| " + " | ".join("---" for _ in FIELDS) + " |",
    ]
    lines.extend("| " + " | ".join(cell(record[field]) for field in FIELDS) + " |" for record in records)
    MD_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} rows to {CSV_OUT} and {MD_OUT}")


if __name__ == "__main__":
    main()
