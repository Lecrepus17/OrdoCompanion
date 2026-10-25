"""
Master Pipeline: Extrai todos os PDFs da pasta pdfs/ (ou raiz do projeto), unifica todas as entidades
e páginas, e atualiza automaticamente a base de dados do aplicativo Expo em src/data/seed/.

Para adicionar novos PDFs no futuro:
1. Coloque o novo arquivo .pdf na pasta pdfs/ do projeto.
2. Execute: python scripts/extract_all.py
"""

import asyncio
import os
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "scripts"))

from extract_raw_pages import extract_all_pdfs
from parse_entities import run_entity_pipeline


def sync_public_pdfs() -> None:
    """Cria hardlinks (0 bytes extras em disco) em public/pdfs/ para todos os PDFs da pasta pdfs/ (ou raiz)."""
    public_pdfs_dir = ROOT_DIR / "public" / "pdfs"
    public_pdfs_dir.mkdir(parents=True, exist_ok=True)
    count = 0

    pdfs_source_dir = ROOT_DIR / "pdfs"
    source_pdfs: list[Path] = []
    if pdfs_source_dir.exists():
        source_pdfs.extend(pdfs_source_dir.glob("*.pdf"))
    for p in ROOT_DIR.glob("*.pdf"):
        if not any(sp.name.lower() == p.name.lower() for sp in source_pdfs):
            source_pdfs.append(p)

    source_names = {p.name for p in source_pdfs}
    for pub_pdf in list(public_pdfs_dir.glob("*.pdf")):
        if pub_pdf.name not in source_names:
            try:
                pub_pdf.unlink()
                print(f"[PDF ASSETS] Removido PDF obsoleto: {pub_pdf.name}")
            except Exception:
                pass

    for pdf_path in sorted(source_pdfs, key=lambda p: p.name.lower()):
        dest = public_pdfs_dir / pdf_path.name
        if dest.exists():
            continue
        try:
            os.link(pdf_path, dest)
        except Exception:
            shutil.copy2(pdf_path, dest)
        count += 1
    print(f"[PDF ASSETS] {len(list(public_pdfs_dir.glob('*.pdf')))} PDFs vinculados em public/pdfs/ ({count} novos)")


async def main() -> None:
    print("============================================================")
    print("  GUIA ORDEM PARANORMAL - PIPELINE DE EXTRAÇÃO AUTOMÁTICA")
    print("============================================================\n")

    await extract_all_pdfs()
    compendium = run_entity_pipeline()

    seed_dir = ROOT_DIR / "src" / "data" / "seed"
    seed_dir.mkdir(parents=True, exist_ok=True)

    comp_src = ROOT_DIR / "data" / "compendium_seed.json"
    pages_src = ROOT_DIR / "data" / "books_pages_seed.json"

    shutil.copy2(comp_src, seed_dir / "compendium_seed.json")
    shutil.copy2(pages_src, seed_dir / "books_pages_seed.json")

    sync_public_pdfs()

    print(f"\n[SYNC OK] Base sincronizada em {seed_dir}:")
    print(f"  - compendium_seed.json ({compendium['stats']['totalEntities']} entidades)")
    print(f"  - books_pages_seed.json ({compendium['stats']['totalPages']} páginas de {compendium['stats']['totalBooks']} livros)")


if __name__ == "__main__":
    asyncio.run(main())
