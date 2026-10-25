"""
Renderiza uma página específica de qualquer PDF da raiz do projeto como imagem JPEG de alta definição,
utilizando cache em disco (data/cache/rendered_pages/) para resposta instantânea no Visualizador de PDF
tanto na Web quanto no Mobile (Android / iOS).
"""

import argparse
import json
import re
import sys
from pathlib import Path
import pymupdf

sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
PDFS_DIR = ROOT_DIR / "pdfs"
RENDER_CACHE_DIR = ROOT_DIR / "data" / "cache" / "rendered_pages"


def slugify_name(name: str) -> str:
    stem = Path(name).stem
    stem = re.sub(r"(?i)[-_\s]+v\d+$", "", stem)
    stem = re.sub(r"\.+", "-", stem)
    return re.sub(r"[^a-zA-Z0-9]+", "_", stem).strip("_").lower()


def resolve_pdf_path(file_arg: str) -> Path:
    # 1. Direct path check (absolute or relative)
    direct_cand = Path(file_arg)
    if not direct_cand.is_absolute():
        direct_cand = (ROOT_DIR / file_arg).resolve()
    if direct_cand.is_file() and direct_cand.suffix.lower() == ".pdf":
        return direct_cand

    # 2. Check in standard directories (pdfs/, root, public/pdfs/)
    candidate_dirs = [PDFS_DIR, ROOT_DIR, ROOT_DIR / "public" / "pdfs"]
    clean_name = Path(file_arg).name
    target_lower = clean_name.lower().strip()
    target_slug = slugify_name(clean_name)

    for cdir in candidate_dirs:
        if not cdir.exists():
            continue
        direct_in_dir = cdir / clean_name
        if direct_in_dir.is_file() and direct_in_dir.suffix.lower() == ".pdf":
            return direct_in_dir.resolve()
        for p in cdir.glob("*.pdf"):
            if p.name.lower() == target_lower or slugify_name(p.name) == target_slug:
                return p.resolve()

    raise FileNotFoundError(f"Arquivo PDF não encontrado: {file_arg}")


def render_page(file_arg: str, page_num: int, dpi: int = 150) -> dict:
    pdf_path = resolve_pdf_path(file_arg)
    dpi = max(72, min(260, int(dpi)))
    book_slug = slugify_name(pdf_path.name)

    RENDER_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    clamped_page = max(1, min(total_pages, int(page_num)))

    cache_filename = f"{book_slug}_p{clamped_page:04d}_dpi{dpi}.jpg"
    cache_path = RENDER_CACHE_DIR / cache_filename

    page = doc[clamped_page - 1]
    rect = page.rect

    if not cache_path.exists() or cache_path.stat().st_size == 0:
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        img_bytes = pix.tobytes("jpeg", jpg_quality=88)
        temp_path = RENDER_CACHE_DIR / f".tmp_{cache_filename}"
        temp_path.write_bytes(img_bytes)
        temp_path.replace(cache_path)
        width, height = pix.width, pix.height
    else:
        scale = dpi / 72.0
        width = int(round(rect.width * scale))
        height = int(round(rect.height * scale))

    doc.close()

    return {
        "ok": True,
        "fileName": pdf_path.name,
        "pageNumber": clamped_page,
        "pageCount": total_pages,
        "dpi": dpi,
        "width": width,
        "height": height,
        "cachePath": str(cache_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Renderiza página de PDF com PyMuPDF")
    parser.add_argument("--file", required=True, help="Nome do arquivo PDF ou bookId")
    parser.add_argument("--page", type=int, default=1, help="Número da página (1-indexed)")
    parser.add_argument("--dpi", type=int, default=150, help="Resolução em DPI (72 a 260)")
    args = parser.parse_args()

    try:
        res = render_page(args.file, args.page, args.dpi)
        print(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
