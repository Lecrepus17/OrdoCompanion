import asyncio
import glob
import hashlib
import io
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Any

import pymupdf
from PIL import Image
import winocr

sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
PDFS_DIR = ROOT_DIR / "pdfs"
CACHE_DIR = ROOT_DIR / "data" / "cache"
RAW_OUTPUT_PATH = ROOT_DIR / "data" / "raw_books.json"

EXTRACTOR_VERSION = "v5"


OCR_PHRASE_REPLACEMENTS = [
    ("A! 'RORA DA VFRDADF", "AURORA DA VERDADE"),
    ("PROM INCIAR SIGII O", "PRONUNCIAR SIGILO"),
    ("LÍNGT IA MORTA", "LÍNGUA MORTA"),
    ("OVFRCIOCK", "OVERCLOCK"),
    ("PODFRFS GFRAIS", "PODERES GERAIS"),
    ("PODFRFS PARANORMAIS", "PODERES PARANORMAIS"),
    ("FQUIPAMFNTOS", "EQUIPAMENTOS"),
    ("ORIGFNS", "ORIGENS"),
    ("OROCMPAROORU.U", "ORDEM PARANORMAL"),
    ("Orcro Realitas", "Ordo Realitas"),
    ("OPR}G", "OPRPG"),
    ("OPRÑ", "OPRPG"),
    ("Ladrar e Yorder", "Ladrar e Morder"),
    ("a±nergia", "a Energia"),
    ("e±aralhar", "embaralhar"),
    ("plasaútica", "plasmática"),
    ("pneumátiço", "pneumático"),
    ("Sogado:", "jogador"),
    ("adusta:", "ajustar"),
    ("Ciências Forenses.", "Ciências Forenses."),
    ("Espírito Cívico-", "Espírito Cívico."),
    ("Engenheiro.", "Engenheiro."),
    ("Fortitud ", "Fortitude "),
    ("P V", "PV"),
    ("15m I loa", "15m | 10□"),
    ("9m16a", "9m | 6□"),
    ("12m18a", "12m | 8□"),
    ("6m 14a", "6m | 4□"),
    ("3<14+3", "3d4+3"),
    ("4<14", "4d4"),
    ("Id12+I()", "1d12+10"),
    ("Id12+1()", "1d12+10"),
    ("Idl()", "1d10"),
    ("dl()", "d10"),
    ("3d1()", "3d10"),
    ("6dI()", "6d10"),
    ("2dIO", "2d10"),
    ("2dlO", "2d10"),
    ("Idi2", "1d12"),
    ("—ID", "-1d20"),
    ("m e I a n c o I i a", "melancolia"),
    ("M E L A N C O L I A", "MELANCOLIA"),
    ("A M I G O", "AMIGO"),
    ("I M A G I N Á R I O", "IMAGINÁRIO"),
]

OCR_WORD_REPLACEMENTS = {
    "Sogo": "jogo",
    "dogo": "jogo",
    "JOCO": "JOGO",
    "Sogadores": "jogadores",
    "dogador": "jogador",
    "anis": "mais",
    "anndano": "mundano",
    "zundo": "mundo",
    "comns": "comuns",
    "uan": "uma",
    "tuna": "uma",
    "unia": "uma",
    "urpa": "uma",
    "trn": "um",
    "veda": "veja",
    "Veda": "Veja",
    "OPRG": "OPRPG",
    "seda": "seja",
    "sedam": "sejam",
    "annipular": "manipular",
    "annição": "munição",
    "Clinição": "munição",
    "andificação": "modificação",
    "anvimento": "movimento",
    "Movipento": "Movimento",
    "pensanvnto": "pensamento",
    "pensanvrlto": "pensamento",
    "completagpnte": "completamente",
    "pergnnentemente": "permanentemente",
    "radicalzpnte": "radicalmente",
    "Ellito": "muito",
    "anito": "muito",
    "amito": "muito",
    "mesan": "mesma",
    "extrean": "extrema",
    "óulgamento": "julgamento",
    "obóetivos": "objetivos",
    "obdetivo": "objetivo",
    "siavlesmente": "simplesmente",
    "simplesrente": "simplesmente",
    "oecanica": "mecânica",
    "anior": "maior",
    "aóuda": "ajuda",
    "Vedicina": "Medicina",
    "cotkiurar": "conjurar",
    "apras": "apenas",
    "assunir": "assumir",
    "coradoso": "corajoso",
    "çaos": "caos",
    "prória": "própria",
    "VULHO": "JULHO",
}
OCR_WORD_REGEX = re.compile(r"\b(" + "|".join(re.escape(k) for k in OCR_WORD_REPLACEMENTS.keys()) + r")\b")


def slugify_book_id(filename: str) -> str:
    stem = Path(filename).stem
    # Ignore version suffixes (e.g. "Sobrevivendo-Ao-Horror-v1") so the book id stays stable
    # when a better edition of the same PDF replaces an older one.
    stem = re.sub(r"(?i)[-_\s]+v\d+$", "", stem)
    stem = re.sub(r"\.+", "-", stem)
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", stem).strip("_").lower()
    return slug


def friendly_book_title(filename: str) -> str:
    stem = Path(filename).stem.replace("..", "")
    stem = re.sub(r"(?i)[-_\s]+v\d+$", "", stem)
    lower = stem.lower()
    if "livro base" in lower:
        return "Livro Base"
    if "sobrevivendo" in lower:
        return "Sobrevivendo ao Horror"
    m = re.search(r"arquivos[-_\s]*secretos[-_\s]*(\d+)", lower)
    if m:
        return f"Arquivos Secretos #{int(m.group(1)):02d}"
    return stem.replace("-", " ").replace("_", " ").title()


def clean_pdf_text(text: str, is_ocr: bool = False) -> str:
    """
    Cleans extracted page text.
    OCR-specific heuristics (word/phrase/diacritic/dice fixes) are only applied when
    `is_ocr` is True, so text extracted natively from selectable PDFs is not altered by them.
    """
    if not text:
        return ""
    # Remove buyer email watermarks
    lines = []
    for line in text.splitlines():
        if re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", line) and len(line.strip()) < 90:
            continue
        lines.append(line)
    cleaned = "\n".join(lines)

    # Strip soft hyphens (joining words broken across lines, e.g. "pa\xad\nranormal" -> "paranormal")
    # and expand typographic ligatures
    cleaned = re.sub(
        r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])\xad\s*\n+\s*-([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])",
        r"\1-\2",
        cleaned,
    )
    cleaned = re.sub(
        r"([a-záéíóúâêôãõç])\xad\s*\n+\s*(lo|la|los|las|se|lhe|lhes|me|te|nos)\b",
        r"\1-\2",
        cleaned,
    )
    cleaned = re.sub(r"([a-záéíóúâêôãõç])\xad\s*\n+\s*([a-záéíóúâêôãõç])", r"\1\2", cleaned)
    cleaned = re.sub(r"\xad[ \t]*\n[ \t]*", "", cleaned)
    cleaned = cleaned.replace("\xad", "")
    cleaned = cleaned.replace("\ufb01", "fi").replace("\ufb02", "fl")
    cleaned = cleaned.replace("\ufb00", "ff").replace("\ufb03", "ffi").replace("\ufb04", "ffl")

    # Replace private-use font icons and control chars from Jambô PDFs
    cleaned = cleaned.replace("\uf077", "• ")
    cleaned = cleaned.replace("\uf076", "◆ ")
    cleaned = cleaned.replace("\uf0b1", "◆ ")
    cleaned = cleaned.replace("\uf053", "◆ ")
    cleaned = cleaned.replace("\uf075", "▸ ")
    cleaned = cleaned.replace("\uf052", "⌖ ")
    cleaned = cleaned.replace("\uf071", "□")
    cleaned = cleaned.replace("\uf0e7", "+ ")
    cleaned = cleaned.replace("\uf02d", "-")
    cleaned = cleaned.replace("\uf0ab", "")
    cleaned = cleaned.replace("\uf0e9", "")
    cleaned = cleaned.replace("\uf0ea", "")
    cleaned = re.sub(r"[\uf000-\uf8ff]", "", cleaned)
    cleaned = cleaned.replace("\x8e", "• ")
    cleaned = cleaned.replace("\x92", "• ")
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", cleaned)
    cleaned = re.sub(r"(?m)^[\t ]*b\s+", "• ", cleaned)
    cleaned = re.sub(r"(?m)^Ì\s*", "• ", cleaned)
    cleaned = re.sub(r"(?m)^I\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+[\.:])", "• ", cleaned)
    cleaned = re.sub(r"(?m)^\?\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç])", "• ", cleaned)

    if is_ocr:
        # Phrase and word OCR fixes
        for bad, good in OCR_PHRASE_REPLACEMENTS:
            cleaned = cleaned.replace(bad, good)
        cleaned = OCR_WORD_REGEX.sub(lambda m: OCR_WORD_REPLACEMENTS[m.group(0)], cleaned)

        # Systematic Portuguese OCR diacritic/suffix fixes
        cleaned = re.sub(r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])ç[áàâ]o\b", r"\1ção", cleaned)
        cleaned = re.sub(r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])Ç[ÁÀÂ]O\b", r"\1ÇÃO", cleaned)
        cleaned = re.sub(r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])ç[óo]es\b", r"\1ções", cleaned)
        cleaned = re.sub(r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])Ç[ÓO]ES\b", r"\1ÇÕES", cleaned)
        cleaned = re.sub(r"\bn[áà]o\b", "não", cleaned)
        cleaned = re.sub(r"\bN[ÁÀ]O\b", "NÃO", cleaned)
        cleaned = re.sub(r"\bs[ôá]o\b", "são", cleaned)
        cleaned = re.sub(r"\bS[ÔÁ]O\b", "SÃO", cleaned)
        cleaned = re.sub(r"\bm[áa]os\b", "mãos", cleaned)
        cleaned = re.sub(r"\bent[áa]o\b", "então", cleaned)
        cleaned = re.sub(r"\b(?:vocé|votê)\b", "você", cleaned)
        cleaned = re.sub(r"\b(?:Vocé|Votê)\b", "Você", cleaned)
        cleaned = cleaned.replace("$ocê", "você")
        cleaned = re.sub(r"\bbónus\b", "bônus", cleaned)
        cleaned = re.sub(r"\bBónus\b", "Bônus", cleaned)
        cleaned = re.sub(r"\bgénero(s?)\b", r"gênero\1", cleaned)
        cleaned = re.sub(r"\bsubgénero(s?)\b", r"subgênero\1", cleaned)
        cleaned = re.sub(r"\btrés\b", "três", cleaned)
        cleaned = re.sub(r"\bTrés\b", "Três", cleaned)
        cleaned = re.sub(r"\bvém\b", "vêm", cleaned)
        cleaned = re.sub(r"\btém\b", "têm", cleaned)
        cleaned = re.sub(r"([a-záéíóúâêôãõç]{2,})éncia(s?)\b", r"\1ência\2", cleaned)
        cleaned = re.sub(r"\bSobrevivéncia\b", "Sobrevivência", cleaned)
        cleaned = re.sub(r"\bCiéncias\b", "Ciências", cleaned)

    # Normalize Jambô d20 icon font ('O') and OCR dice representations
    cleaned = re.sub(r"\b(\d+)O([+\-]\d+)\b", r"\1d20\2", cleaned)
    cleaned = re.sub(r"\b(\d+)O\b(?!\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-z])", r"\1d20", cleaned)
    cleaned = re.sub(r"\bdO([+\-]\d+)\b", r"1d20\1", cleaned)
    cleaned = re.sub(r"\bOO\s*([+\-]\s*\d+)\b", lambda m: "2d20" + m.group(1).replace(" ", ""), cleaned)
    cleaned = re.sub(r"\bO\s*([+\-]\s*\d+)\b", lambda m: "1d20" + m.group(1).replace(" ", ""), cleaned)
    cleaned = re.sub(r"[–—\-\u2212]\s*(\d+)O\b", r"-\1d20", cleaned)
    cleaned = re.sub(r"[–—\-\u2212]\s*OO\b", "-2d20", cleaned)
    cleaned = re.sub(r"\+\s*OO\b", "+2d20", cleaned)
    cleaned = re.sub(r"(?<=[+\u2212–—\-])\s*O\b(?!\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-z])", "1d20", cleaned)
    cleaned = re.sub(r"[–—\u2212]\s*O\b(?!\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-z])", "-1d20", cleaned)
    cleaned = re.sub(r"\+\s*O\b(?!\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-z])", "+1d20", cleaned)
    cleaned = re.sub(
        r"\b(Percepção|Iniciativa|Fortitude|FORTITUDE|Reflexos|REFLEXOS|Vontade|VONTADE|Teste|TESTE)\s+[O0]\b(?!\s*[+\-])(?!\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-z])",
        r"\1 1d20",
        cleaned,
    )

    # D shorthand in Sobrevivendo ao Horror (+2D, –1D, 5D+30)
    cleaned = re.sub(r"([+–—\-\u2212])\s*(\d+)D\b(?!\s*m\b|\s*pontos)", r"\1\2d20", cleaned)
    cleaned = re.sub(r"\b(\d+)D\+(\d+)\b", r"\1d20+\2", cleaned)
    cleaned = re.sub(r"\bquantidade de O de bônus\b", "quantidade de 1d20 de bônus", cleaned)
    cleaned = re.sub(r"\bresultado do O extra\b", "resultado do 1d20 extra", cleaned)
    cleaned = re.sub(r"1□□", "10□", cleaned)
    cleaned = re.sub(r"Teste ◆ \+(\d+)", r"Teste 1d20+\1", cleaned)
    cleaned = re.sub(r"recebe \+◆  em", r"recebe +1d20 em", cleaned)

    if is_ocr:
        # OCR statblock skill rolls: e.g. "Percepção 30+10" -> "Percepção 3d20+10", "Vontade 0+5" -> "Vontade 1d20+5"
        cleaned = re.sub(r"\bFortitude\s+201\s+Reflexos\b", "Fortitude 2d20 | Reflexos", cleaned)
        cleaned = re.sub(r"\b([1-6])[0O]\+(\d+)1\b", r"\1d20+\2", cleaned)
        skill_Roll_pat = (
            r"\b(Percepção|Iniciativa|Fortitude|FORTITUDE|Reflexos|REFLEXOS|Vontade|VONTADE|Teste|TESTE|"
            r"Acrobacia|Adestramento|Artes|Atletismo|Atualidades|Ciências|Crime|Diplomacia|Enganação|"
            r"Furtividade|Intimidação|Intuição|Investigação|Luta|Medicina|Ocultismo|Pilotagem|Pontaria|"
            r"Profissão(?:\s*\([^\)]+\))?|Religião|Sobrevivência|Tática|Tecnologia|"
            r"agarrar o alvo \(teste|manobra derrubar \(teste)\s+"
        )
        cleaned = re.sub(
            skill_Roll_pat + r"([—–-]?\s*[1-6])[0O]\s*\+\s*(\d+)\b",
            lambda m: f"{m.group(1)} {'-' if any(c in m.group(2) for c in '—–-') else ''}{re.sub(r'[^0-9]', '', m.group(2))}d20+{m.group(3)}",
            cleaned,
        )
        cleaned = re.sub(
            skill_Roll_pat + r"[0O]\s*\+\s*(\d+)\b",
            r"\1 1d20+\2",
            cleaned,
        )
        cleaned = re.sub(
            r"\b(Percepção|Iniciativa|Fortitude|FORTITUDE|Reflexos|REFLEXOS|Vontade|VONTADE|Teste|TESTE)\s+([—–-]?\s*[1-6])[0O]\b(?!\s*[+\-])",
            lambda m: f"{m.group(1)} {'-' if any(c in m.group(2) for c in '—–-') else ''}{re.sub(r'[^0-9]', '', m.group(2))}d20",
            cleaned,
        )
        cleaned = re.sub(
            r"(\dd20(?:\+\d+)?)\s+[1I]\s+(Iniciativa|Reflexos|REFLEXOS|Vontade|VONTADE|Dano|DANO|Machucado)\b",
            r"\1 | \2",
            cleaned,
        )
        cleaned = re.sub(r"\b(PV\s+\d+)\s+[1I]\s+(Machucado)\b", r"\1 | \2", cleaned)

        # OCR dice penalties in text ("penalidade de —20" -> "penalidade de -2d20")
        cleaned = re.sub(
            r"(penalidade\s+(?:de\s+|aumenta\s+para\s+|muda\s+para\s+)?)[—–-]([123])[0O]\b",
            r"\1-\2d20",
            cleaned,
        )
        cleaned = re.sub(r"(sofre\s+)[—–-]([123])[0O](\s+em\b)", r"\1-\2d20\3", cleaned)
        cleaned = re.sub(r"(mudam\s+para\s+)[—–-]10\b", r"\1-1d20", cleaned)
        cleaned = re.sub(
            r"todos com [—–-]30 \([—–-]20 da coreografia complexa",
            "todos com -3d20 (-2d20 da coreografia complexa",
            cleaned,
        )

        # OCR dice formulas (Id6 -> 1d6, etc.), displacement squares, ordinals, percentages, and 1/0 units
        cleaned = re.sub(r"\b[I1l]d([3468]|10|12|20|100)\b", r"1d\1", cleaned)
        cleaned = re.sub(r"\b(\d+)m\s*(?:\||[1I])\s*(\d+)\s*[0OQa□]\b", r"\1m | \2□", cleaned)
        cleaned = re.sub(r"\b([1234])[0O]\s+(círculo|Círculo|CÍRCULO)\b", r"\1º \2", cleaned)
        cleaned = re.sub(r"\b12\s+(círculo|Círculo)\b", r"1º \1", cleaned)
        cleaned = re.sub(r"\b([12345])[0O]\s+(estágio|Estágio|ESTÁGIO)\b", r"\1º \2", cleaned)
        cleaned = re.sub(r"\b12\s+(estágio|Estágio)\b", r"1º \1", cleaned)
        cleaned = re.sub(r"\b60\s+nível\b", "6º nível", cleaned)
        cleaned = re.sub(r"\b(\d{1,2})0/0(\+?)", r"\1%\2", cleaned)
        cleaned = re.sub(
            r"\bI\s+(PE|PV|PD|SAN|ser|objeto|cadáver|rodada|ponto|vez|minuto|hora|dia|metro|km|espaço|aliado|arma|item|nível|estágio)\b",
            r"1 \1",
            cleaned,
        )
        cleaned = re.sub(r"\bO\s+PV\b", "0 PV", cleaned)
        cleaned = re.sub(r"\bresultado\s+I\b", "resultado 1", cleaned)
        cleaned = re.sub(r"(?<!\w)[—–-][Il]\b", "-1", cleaned)

    # Join hyphenated line breaks (preserving hyphen on explicit double-hyphens and enclitics)
    cleaned = re.sub(
        r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])-\s*\n+\s*-([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])",
        r"\1-\2",
        cleaned,
    )
    cleaned = re.sub(
        r"([a-záéíóúâêôãõç])-\s*\n+\s*(lo|la|los|las|se|lhe|lhes|me|te|nos)\b",
        r"\1-\2",
        cleaned,
    )
    cleaned = re.sub(r"([a-záéíóúâêôãõç])-\s*\n+\s*([a-záéíóúâêôãõç])", r"\1\2", cleaned)
    # Also heal inline broken hyphenations ("que- brar" -> "quebrar", "torná- lo" -> "torná-lo")
    cleaned = re.sub(
        r"([a-záéíóúâêôãõç])-\s+(lo|la|los|las|se|lhe|lhes|me|te|nos|requisito|requisitos|ataque|atacar)\b",
        r"\1-\2",
        cleaned,
    )
    cleaned = re.sub(r"([a-záéíóúâêôãõç])-\s+([a-záéíóúâêôãõç])", r"\1\2", cleaned)

    return cleaned.strip()


def sort_blocks_reading_order(blocks: List[Any], page_width: float, page_height: float) -> str:
    """
    Sorts text blocks in natural reading order.
    Distinguishes true 2-column layouts from single-column pages wrapping around illustrations.
    """
    text_blocks = []
    for b in blocks:
        if len(b) >= 7 and b[6] != 0:
            continue
        x0, y0, x1, y1, raw_text = b[0], b[1], b[2], b[3], b[4]
        # Skip footer watermark / isolated page numbers at very bottom
        if y0 > page_height * 0.955:
            continue
        cleaned = clean_pdf_text(raw_text)
        if not cleaned:
            continue
        # Skip standalone page number in footer corner
        if y0 > page_height * 0.91 and re.fullmatch(r"\d{1,3}", cleaned):
            continue
        text_blocks.append((x0, y0, x1, y1, cleaned))

    if not text_blocks:
        return ""

    mid_x = page_width / 2.0
    # Check if there are actual left-column blocks (blocks confined to the left half of the page)
    has_confined_left = any(
        (b[0] < page_width * 0.25 and b[2] <= page_width * 0.55 and len(b[4]) > 25)
        for b in text_blocks
    )

    if not has_confined_left:
        # Single-column or art-wrapped page: sort top-to-bottom
        text_blocks.sort(key=lambda item: (round(item[1] / 6.0), item[0]))
        joined = "\n\n".join(b[4] for b in text_blocks)
        joined = re.sub(r"([A-Za-zÀ-ÖØ-öø-ÿ])[\xad\-]\s*\n+\s*([A-Za-zÀ-ÖØ-öø-ÿ])", r"\1\2", joined)
        return clean_pdf_text(joined, is_ocr=False)

    left_col = []
    right_col = []
    for b in text_blocks:
        x0, y0, x1, y1, cleaned = b
        if x0 >= mid_x * 0.92:
            right_col.append(b)
        else:
            left_col.append(b)

    left_col.sort(key=lambda item: (round(item[1] / 6.0), item[0]))
    right_col.sort(key=lambda item: (round(item[1] / 6.0), item[0]))

    ordered = [b[4] for b in left_col] + [b[4] for b in right_col]
    joined = "\n\n".join(ordered)
    joined = re.sub(r"([A-Za-zÀ-ÖØ-öø-ÿ])[\xad\-]\s*\n+\s*([A-Za-zÀ-ÖØ-öø-ÿ])", r"\1\2", joined)
    return clean_pdf_text(joined, is_ocr=False)


def sort_ocr_lines_two_column(lines: List[Any], img_width: int) -> str:
    if not lines:
        return ""

    parsed_lines = []
    for line in lines:
        txt = line.text.strip()
        if not txt:
            continue
        words = list(line.words)
        if words:
            x0 = min(w.bounding_rect.x for w in words)
            y0 = min(w.bounding_rect.y for w in words)
            x1 = max(w.bounding_rect.x + w.bounding_rect.width for w in words)
        else:
            x0, y0, x1 = 0, 0, 0
        parsed_lines.append((x0, y0, x1, txt))

    if not parsed_lines:
        return ""

    mid_x = img_width / 2.0
    left_lines = []
    right_lines = []
    for x0, y0, x1, txt in parsed_lines:
        if x0 >= mid_x * 0.90:
            right_lines.append((y0, x0, txt))
        else:
            left_lines.append((y0, x0, txt))

    left_lines.sort(key=lambda item: (round(item[0] / 12.0), item[1]))
    right_lines.sort(key=lambda item: (round(item[0] / 12.0), item[1]))

    raw = "\n".join([item[2] for item in left_lines] + [item[2] for item in right_lines])
    return clean_pdf_text(raw)


async def ocr_page(doc: pymupdf.Document, page_index: int, sem: asyncio.Semaphore) -> str:
    async with sem:
        page = doc[page_index]
        pix = page.get_pixmap(dpi=180)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))
        res = await winocr.recognize_pil(img, "pt-BR")
        return sort_ocr_lines_two_column(res.lines, img.width)


def build_default_toc_for_sobrevivendo() -> List[Dict[str, Any]]:
    return [
        {"level": 1, "title": "Prefácio", "page": 5},
        {"level": 1, "title": "Capítulo 1: Os Sobreviventes", "page": 7},
        {"level": 2, "title": "Novas Origens", "page": 8},
        {"level": 2, "title": "Novas Opções para Classes", "page": 15},
        {"level": 3, "title": "O Combatente Sobrevivente", "page": 15},
        {"level": 3, "title": "O Especialista Sobrevivente", "page": 23},
        {"level": 3, "title": "O Ocultista Sobrevivente", "page": 27},
        {"level": 2, "title": "Nova Classe: O Sobrevivente", "page": 31},
        {"level": 2, "title": "Poderes Gerais", "page": 34},
        {"level": 2, "title": "Equipamentos", "page": 38},
        {"level": 2, "title": "Poderes Paranormais", "page": 47},
        {"level": 2, "title": "Novos Rituais", "page": 49},
        {"level": 2, "title": "Novos Itens Amaldiçoados", "page": 58},
        {"level": 1, "title": "Capítulo 2: O Horror", "page": 64},
        {"level": 2, "title": "Mestrando Terror", "page": 65},
        {"level": 2, "title": "Novas Regras (Investigação, Perseguição, Furtividade)", "page": 82},
        {"level": 2, "title": "Novas Regras Opcionais", "page": 98},
        {"level": 1, "title": "Capítulo 3: Novas Ameaças", "page": 125},
        {"level": 2, "title": "Criaturas Paranormais", "page": 127},
        {"level": 2, "title": "Novas Ameaças da Realidade", "page": 159},
        {"level": 2, "title": "Animais", "page": 164},
        {"level": 1, "title": "Capítulo 4: Missões", "page": 168},
        {"level": 2, "title": "Missão 1: Noite de Compras", "page": 169},
        {"level": 2, "title": "Missão 2: O Terminal do Fim", "page": 195},
        {"level": 1, "title": "Apêndices e Fichas", "page": 223},
    ]


async def extract_single_pdf(pdf_path: Path) -> Dict[str, Any]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    book_id = slugify_book_id(pdf_path.name)
    title = friendly_book_title(pdf_path.name)
    cache_file = CACHE_DIR / f"pages_{book_id}.json"

    stat = pdf_path.stat()
    fingerprint = f"{EXTRACTOR_VERSION}:{pdf_path.name}:{stat.st_size}:{int(stat.st_mtime)}"

    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    native_count = sum(1 for page in doc if len(page.get_text().strip()) >= 25)
    is_primarily_native = (native_count / max(1, total_pages)) >= 0.75

    old_ocr_map: Dict[int, str] = {}
    if cache_file.exists():
        try:
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            if cached.get("fingerprint") == fingerprint and len(cached.get("pages", [])) > 0:
                print(f"[CACHE HIT] {title} ({len(cached['pages'])} páginas)")
                return cached
            # Reuse previously OCR'd pages so we don't repeat OCR unnecessarily
            if not is_primarily_native:
                for p in cached.get("pages", []):
                    if p.get("method") == "ocr":
                        old_ocr_map[p["pageNumber"]] = clean_pdf_text(p.get("text", ""), is_ocr=True)
        except Exception as e:
            print(f"[CACHE WARN] Re-extraindo {pdf_path.name}: {e}")

    raw_toc = doc.get_toc()
    toc = [{"level": int(lvl), "title": str(t).strip(), "page": int(pg)} for lvl, t, pg in raw_toc]
    if not toc and "sobrevivendo" in book_id:
        toc = build_default_toc_for_sobrevivendo()

    print(f"[EXTRACTING] {title} ({pdf_path.name}) - {total_pages} páginas...")
    t0 = time.time()

    pages_data: List[Dict[str, Any]] = [None] * total_pages  # type: ignore
    ocr_indices: List[int] = []

    for idx in range(total_pages):
        page = doc[idx]
        blocks = page.get_text("blocks")
        ordered_text = sort_blocks_reading_order(blocks, page.rect.width, page.rect.height)
        if len(ordered_text.strip()) >= 25 or is_primarily_native:
            pages_data[idx] = {
                "pageNumber": idx + 1,
                "text": ordered_text,
                "method": "native",
            }
        elif (idx + 1) in old_ocr_map:
            pages_data[idx] = {
                "pageNumber": idx + 1,
                "text": old_ocr_map[idx + 1],
                "method": "ocr",
            }
        else:
            ocr_indices.append(idx)

    if ocr_indices:
        print(f"  -> Executando OCR (pt-BR) em {len(ocr_indices)} páginas de {title}...")
        sem = asyncio.Semaphore(6)
        tasks = [ocr_page(doc, idx, sem) for idx in ocr_indices]
        ocr_results = await asyncio.gather(*tasks)
        for idx, ocr_txt in zip(ocr_indices, ocr_results):
            pages_data[idx] = {
                "pageNumber": idx + 1,
                "text": ocr_txt.strip(),
                "method": "ocr",
            }

    for p in pages_data:
        pno = p["pageNumber"]
        current_section = title
        for entry in toc:
            if entry["page"] <= pno:
                current_section = entry["title"]
            else:
                break
        p["section"] = current_section

    book_payload = {
        "id": book_id,
        "title": title,
        "fileName": pdf_path.name,
        "fingerprint": fingerprint,
        "pageCount": total_pages,
        "toc": toc,
        "pages": pages_data,
    }

    cache_file.write_text(json.dumps(book_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    elapsed = time.time() - t0
    print(f"[DONE] {title} extraído em {elapsed:.1f}s.")
    return book_payload


def get_book_sort_key(name: str):
    lower = name.lower()
    # 1. Livro Base
    if "livro base" in lower or "livro_base" in lower:
        return (0, 0, lower)
    # 2. Sobrevivendo ao Horror
    if "sobrevivendo" in lower or "horror" in lower:
        return (1, 0, lower)
    # 3. Arquivos Secretos
    if "arquivo" in lower:
        nums = re.findall(r"\d+", lower)
        num = int(nums[0]) if nums else 999
        return (2, num, lower)
    # 4. Outros
    return (3, 0, lower)


async def extract_all_pdfs() -> List[Dict[str, Any]]:
    # Search for PDFs in pdfs/ (preferred) and root folder
    pdf_candidates: List[Path] = []
    if PDFS_DIR.exists():
        pdf_candidates.extend(PDFS_DIR.glob("*.pdf"))
    for p in ROOT_DIR.glob("*.pdf"):
        if not any(c.name.lower() == p.name.lower() for c in pdf_candidates):
            pdf_candidates.append(p)

    # Deduplicate PDFs by slugified book id: prefer versioned/native digital files (e.g. Sobrevivendo-Ao-Horror-v1)
    grouped: Dict[str, List[Path]] = {}
    for p in pdf_candidates:
        bid = slugify_book_id(p.name)
        grouped.setdefault(bid, []).append(p)

    selected_pdfs: List[Path] = []
    for bid, candidates in grouped.items():
        if len(candidates) == 1:
            selected_pdfs.append(candidates[0])
        else:
            candidates.sort(key=lambda c: ("-v" in c.stem.lower(), c.stat().st_size), reverse=True)
            selected_pdfs.append(candidates[0])

    selected_pdfs.sort(key=lambda p: get_book_sort_key(p.name))
    books = []
    for pdf_path in selected_pdfs:
        book_data = await extract_single_pdf(pdf_path)
        books.append(book_data)

    RAW_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_OUTPUT_PATH.write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nTotal de livros extraídos: {len(books)} -> salvo em {RAW_OUTPUT_PATH}")
    return books


if __name__ == "__main__":
    asyncio.run(extract_all_pdfs())
