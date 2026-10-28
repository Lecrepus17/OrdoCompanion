"""
Pipeline Sob Demanda para PDF Individual (Não Registrado):
Extrai páginas (nativo + OCR) e todas as entidades (rituais, ameaças, origens, poderes, armas, itens e regras)
de um único arquivo PDF enviado pelo usuário, atribuindo o bookId e sourcePdf correspondentes.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "scripts"))

from extract_raw_pages import extract_single_pdf  # noqa: E402
from parse_entities import (  # noqa: E402
    make_id,
    parse_creatures_from_books,
    parse_origins_from_books,
    parse_powers_from_books,
    parse_rituals_from_books,
    parse_rules_and_chapters,
    parse_weapons_and_items,
)


async def process_pdf_file(pdf_path: Path) -> Dict[str, Any]:
    if not pdf_path.exists():
        return {"ok": False, "error": f"Arquivo PDF não encontrado: {pdf_path}"}

    book_data = await extract_single_pdf(pdf_path)
    for p in book_data.get("pages", []):
        p["text"] = (
            p.get("text", "")
            .replace("\xad", "")
            .replace("\ufb01", "fi")
            .replace("\ufb02", "fl")
            .replace("\uf0ab", "")
        )

    books_list = [book_data]
    book_id = book_data["id"]
    book_title = book_data["title"]
    file_name = book_data["fileName"]

    rituals = parse_rituals_from_books(books_list)
    origins = parse_origins_from_books(books_list)
    powers = parse_powers_from_books(books_list)
    weapons, items = parse_weapons_and_items(books_list)
    creatures = parse_creatures_from_books(books_list)
    rules = parse_rules_and_chapters(books_list)

    # Filtra apenas entidades que pertencem a este book_id (evita itens fixos de outros livros)
    raw_entities = rituals + origins + powers + weapons + items + creatures + rules
    book_entities: List[Dict[str, Any]] = [
        ent for ent in raw_entities if ent.get("bookId") == book_id
    ]

    # Se o PDF não tinha sumário nativo e gerou poucas entidades, cria entradas de páginas/seções
    if not book_entities and book_data.get("pages"):
        first_text = book_data["pages"][0].get("text", "").strip()
        book_entities.append(
            {
                "id": make_id("rule", book_id, f"{book_title}_1"),
                "category": "rule",
                "subCategory": "Suplemento / Documento PDF",
                "name": book_title,
                "bookId": book_id,
                "bookTitle": book_title,
                "sourcePdf": file_name,
                "pageNumber": 1,
                "element": "Nenhum",
                "summary": f"{book_title} ({book_data.get('pageCount', 1)} páginas) — {first_text[:180]}",
                "description": first_text[:1800] or f"Conteúdo extraído de {file_name}",
                "tags": ["Suplemento PDF", book_title],
            }
        )

    used_ids = set()
    for ent in book_entities:
        base_id = ent["id"]
        uid = base_id
        counter = 2
        while uid in used_ids:
            uid = f"{base_id}_p{ent.get('pageNumber', 0)}_{counter}"
            counter += 1
        ent["id"] = uid
        ent["sourcePdf"] = file_name
        used_ids.add(uid)

    return {
        "ok": True,
        "book": {
            "id": book_id,
            "title": book_title,
            "fileName": file_name,
            "pageCount": book_data.get("pageCount", len(book_data.get("pages", []))),
            "toc": book_data.get("toc", []),
            "pages": [
                {
                    "pageNumber": p["pageNumber"],
                    "section": p.get("section", book_title),
                    "text": p.get("text", ""),
                }
                for p in book_data.get("pages", [])
            ],
        },
        "entities": book_entities,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Processa um único PDF via pipeline Python")
    parser.add_argument("--file", required=True, help="Caminho para o arquivo .pdf")
    args = parser.parse_args()

    try:
        res = asyncio.run(process_pdf_file(Path(args.file)))
        print(json.dumps(res, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
