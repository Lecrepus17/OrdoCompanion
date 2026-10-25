import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
COMP_PATH = ROOT_DIR / "data" / "compendium_seed.json"
PAGES_PATH = ROOT_DIR / "data" / "books_pages_seed.json"
SRC_COMP_PATH = ROOT_DIR / "src" / "data" / "seed" / "compendium_seed.json"
SRC_PAGES_PATH = ROOT_DIR / "src" / "data" / "seed" / "books_pages_seed.json"

REQUIRED_CATEGORIES = {
    "ritual",
    "origin",
    "class",
    "track",
    "power",
    "weapon",
    "item",
    "skill",
    "condition",
    "creature",
    "rule",
}

EXPECTED_EXACT_COUNTS = {
    "class": 4,
    "skill": 28,
    "origin": 59,
    "track": 35,
    "ritual": 106,
    "condition": 37,
}

EXPECTED_MIN_COUNTS = {
    "weapon": 55,
    "item": 250,
    "power": 200,
    "creature": 180,
    "rule": 350,
}


def test_database() -> None:
    # 1. Existence of canonical files
    for p in (COMP_PATH, PAGES_PATH, SRC_COMP_PATH, SRC_PAGES_PATH):
        assert p.exists(), f"Missing file: {p}"

    comp = json.loads(COMP_PATH.read_text(encoding="utf-8"))
    pages_db = json.loads(PAGES_PATH.read_text(encoding="utf-8"))
    src_comp = json.loads(SRC_COMP_PATH.read_text(encoding="utf-8"))
    src_pages_db = json.loads(SRC_PAGES_PATH.read_text(encoding="utf-8"))

    # 2. Synchronized data check between data/ and src/data/seed/
    assert len(comp["entities"]) == len(src_comp["entities"]), (
        f"Entity count mismatch: data={len(comp['entities'])} vs src={len(src_comp['entities'])}"
    )
    assert len(pages_db["books"]) == len(src_pages_db["books"]), (
        f"Book count mismatch: data={len(pages_db['books'])} vs src={len(src_pages_db['books'])}"
    )

    # 3. Books verification
    books = comp.get("books", [])
    assert len(books) == 10, f"Expected exactly 10 books, got {len(books)}"
    book_ids = {b["id"] for b in books}
    assert len(book_ids) == 10, f"Duplicate book ids found: {book_ids}"
    assert set(pages_db["books"].keys()) == book_ids, "Book IDs between compendium and pages DB mismatch"

    # 4. Entities verification
    entities = comp.get("entities", [])
    assert len(entities) >= 1300, f"Expected >= 1300 entities, got {len(entities)}"

    seen_ids = set()
    category_counts = {}
    dice_re = re.compile(r"^\d+d\d+(?:[+-]\d+)?$")

    for ent in entities:
        eid = ent.get("id")
        assert eid, f"Entity without id: {ent}"
        assert eid not in seen_ids, f"Duplicate entity id: {eid}"
        seen_ids.add(eid)

        cat = ent.get("category")
        assert cat in REQUIRED_CATEGORIES, f"Entity {eid} has invalid category {cat}"
        category_counts[cat] = category_counts.get(cat, 0) + 1

        name = ent.get("name")
        assert name and isinstance(name, str), f"Entity {eid} has empty/invalid name: {name}"
        assert "\n" not in name, f"Entity {eid} name contains newline: {repr(name)}"
        assert not name.endswith(("•", "▸", "◆")), f"Entity {eid} name has bullet suffix: {name}"

        # Clean creature titles
        if cat == "creature":
            assert not any(bad in name for bad in ("•", "Criatura •", "Animal •", "Pessoa •")), (
                f"Creature {eid} has corrupted name: {name}"
            )
            vd = ent.get("vd")
            assert vd is not None, f"Creature {eid} missing VD"

        # Check origin specific fields
        if cat == "origin":
            assert ent.get("powerName"), f"Origin {eid} missing powerName"
            assert "\n" not in ent["powerName"], f"Origin {eid} powerName has newline: {ent['powerName']}"
            assert ent.get("trainedSkills"), f"Origin {eid} missing trainedSkills"

        # Check ritual specific fields
        if cat == "ritual":
            assert ent.get("circle") in (1, 2, 3, 4), f"Ritual {eid} has invalid circle: {ent.get('circle')}"
            assert ent.get("execution"), f"Ritual {eid} missing execution"
            assert ent.get("range"), f"Ritual {eid} missing range"

        # Check single line fields
        for field in ("subCategory", "element", "powerName"):
            val = ent.get(field)
            if val and isinstance(val, str):
                assert "\n" not in val, f"Entity {eid} field {field} contains newline: {repr(val)}"

        # Check dice formulas
        for df in ent.get("diceFormulas", []):
            assert dice_re.match(df), f"Entity {eid} has malformed dice formula: {df}"

        # Check foreign keys
        assert ent.get("bookId") in book_ids, f"Entity {eid} references unknown bookId {ent.get('bookId')}"
        book_pages = pages_db["books"][ent["bookId"]]["pages"]
        pno = ent.get("pageNumber", 1)
        assert 1 <= pno <= len(book_pages), f"Entity {eid} page {pno} out of range for {ent['bookId']}"

    # 5. Verify exact counts
    for cat, expected in EXPECTED_EXACT_COUNTS.items():
        actual = category_counts.get(cat, 0)
        assert actual == expected, f"Category '{cat}' count mismatch: expected {expected}, got {actual}"

    # 6. Verify min counts
    for cat, min_val in EXPECTED_MIN_COUNTS.items():
        actual = category_counts.get(cat, 0)
        assert actual >= min_val, f"Category '{cat}' count too low: expected >= {min_val}, got {actual}"

    print("[TEST PASS] Integridade da base de dados verificada com sucesso!")
    print(f"  - Livros verificados: {len(books)}")
    print(f"  - Entidades únicas: {len(entities)}")
    print("  - Contagens por categoria:")
    for cat in sorted(category_counts.keys()):
        print(f"      {cat}: {category_counts[cat]}")


if __name__ == "__main__":
    test_database()
