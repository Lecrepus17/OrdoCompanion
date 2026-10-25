import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_BOOKS_PATH = ROOT_DIR / "data" / "raw_books.json"
COMPENDIUM_OUT_PATH = ROOT_DIR / "data" / "compendium_seed.json"
BOOKS_OUT_PATH = ROOT_DIR / "data" / "books_pages_seed.json"
SRC_COMPENDIUM_OUT_PATH = ROOT_DIR / "src" / "data" / "seed" / "compendium_seed.json"
SRC_BOOKS_OUT_PATH = ROOT_DIR / "src" / "data" / "seed" / "books_pages_seed.json"


def make_id(category: str, book_id: str, name: str) -> str:
    norm = unicodedata.normalize("NFD", name.lower().strip())
    norm = "".join(c for c in norm if unicodedata.category(c) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "_", norm).strip("_")
    if not slug:
        slug = hashlib.md5(name.encode("utf-8")).hexdigest()[:8]
    return f"{category}__{book_id}__{slug}"


def normalize_element(raw: str) -> str:
    u = raw.upper()
    elements = []
    for el, label in [
        ("SANGUE", "Sangue"),
        ("MORTE", "Morte"),
        ("CONHECIMENTO", "Conhecimento"),
        ("ENERGIA", "Energia"),
        ("MEDO", "Medo"),
        ("TRANSMISSÃO", "Transmissão"),
    ]:
        if el in u:
            elements.append(label)
    if len(elements) > 1:
        return "Variável (" + " / ".join(elements) + ")"
    if len(elements) == 1:
        return elements[0]
    return "Nenhum"


def extract_dice_formulas(text: str) -> List[str]:
    matches = re.findall(r"\b\d+d(?:4|6|8|10|12|20|100)(?:[+\-]\d+)?\b", text, flags=re.IGNORECASE)
    seen = []
    for m in matches:
        low = m.lower()
        if low not in seen:
            seen.append(low)
    return seen[:8]


def smart_title(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text.replace("\uf0ab", "")).strip()
    if not cleaned:
        return ""
    if cleaned.isupper():
        words = cleaned.title().split(" ")
        low_words = {"De", "Da", "Do", "Das", "Dos", "E", "Em", "Para", "Por", "Com", "No", "Na", "Nos", "Nas", "Ao", "Aos", "À", "Às", "Pelo", "Pela"}
        out = [w.lower() if (i > 0 and w in low_words) else w for i, w in enumerate(words)]
        res = " ".join(out)
        res = re.sub(r"\bT\.i\.", "T.I.", res)
        return res
    return cleaned


def is_title_case_header(text: str) -> bool:
    t = re.sub(r"\s+", " ", text).strip()
    if not t or len(t) < 3 or len(t) > 45:
        return False
    if t.endswith((".", ":", ";", ",")):
        return False
    words = t.split(" ")
    if words[0].upper() in (
        "VOCÊ", "PREPARE", "OUVIR", "GATILHO", "EFEITO", "ESCOLHA", "QUANDO",
        "UMA", "UM", "SE", "AO", "PARA", "POR", "COM", "COMO", "EM", "NO", "NA",
        "OS", "AS", "SUA", "SEU", "SUAS", "SEUS", "TODO", "TODA", "TODOS", "TODAS",
        "FALHOU", "NORMAL", "PRECÁRIA", "CONFORTÁVEL", "LUXUOSA", "AFINIDADE",
    ):
        return False
    small_words = {"de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "no", "na", "ao", "à", "às", "o", "a", "os", "as", "ou", "me", "se", "te", "nos", "lhe", "lhes", "que", "dum", "duma", "<elemento>"}
    for w in words:
        w_clean = w.strip("()-+’'\"<>")
        if not w_clean:
            continue
        if w_clean.lower() in small_words:
            continue
        if not w_clean[0].isupper():
            return False
    return True


# ============================================================================
# 1. DYNAMIC RITUAL PARSER (Anchor-based: works on all books & future PDFs)
# ============================================================================
def parse_rituals_from_books(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rituals: List[Dict[str, Any]] = []
    seen_keys = set()

    for book in books:
        book_id = book["id"]
        book_title = book["title"]

        for page in book["pages"]:
            pno = page["pageNumber"]
            txt = page["text"].replace("\xad", "").replace("\ufb01", "fi").replace("\ufb02", "fl")

            if not re.search(r"(?i)\bExecução\b", txt) or not re.search(r"(?i)\bAlcance\b", txt):
                continue

            anchor_iter = list(
                re.finditer(
                    r"(?im)^[•\s]*Execução:?\s*([^\n;]+)(?:;\s*|\n+\s*)Alcance:?\s*([^\n;]+)(?:;\s*|\n+\s*)(Alvo ou Área|Alvo|Área|Efeito):?\s*([^\n;]+(?:\n+(?!Duração\b|Resistência\b)[a-záéíóúâêôãõç0-9][^\n;]*)?)(?:(?:;\s*|\n+\s*)Duração:?\s*([^\n;]+(?:\n\s*(?:veja\s+texto|sustentada|instantânea|cena|permanente|até\s+ser\s+dissipado)[^\n;]*)?))?(?:(?:;\s*|\n+\s*)Resistência:?\s*([^\n;]+(?:\n\s*(?:dano\s+à\s+metade|à\s+metade|parcial|evita|anula|veja\s+texto|dissipado)[^\n;]*)?))?",
                    txt,
                )
            )
            if not anchor_iter:
                continue

            for idx, m in enumerate(anchor_iter):
                execucao = m.group(1).strip().rstrip(" ;.")
                alcance = m.group(2).strip().rstrip(" ;.")
                target_type = m.group(3).strip()
                alvo = re.sub(r"\s+", " ", m.group(4)).strip().rstrip(" ;.")
                duracao = re.sub(r"\s+", " ", (m.group(5) or "instantânea")).strip().rstrip(" ;.")
                resistencia = re.sub(r"\s+", " ", (m.group(6) or "Nenhuma")).strip().rstrip(" ;.")

                prev_start = anchor_iter[idx - 1].end() if idx > 0 else 0
                prev_text = txt[prev_start : m.start()].strip()
                prev_lines = [l.strip() for l in prev_text.splitlines() if l.strip()]

                el_line = ""
                el_idx = len(prev_lines)
                if prev_lines:
                    for li in range(len(prev_lines) - 1, -1, -1):
                        u = prev_lines[li].upper()
                        if any(k in u for k in ("SANGUE", "MORTE", "CONHECIMENTO", "ENERGIA", "MEDO", "ONHECIMENTO", "ONHECIMENIO", "MORIT")) and not u.startswith("RITUAIS DE"):
                            el_line = prev_lines[li]
                            el_idx = li
                            break

                raw_name = ""
                search_lines = prev_lines[:el_idx] if el_idx > 0 else prev_lines
                for li, l in enumerate(search_lines):
                    if l.upper() in ("RITUAL", "NOVO RITUAL") and li + 1 < len(search_lines):
                        cand = search_lines[li + 1]
                        if len(cand) <= 45 and not cand.endswith("."):
                            raw_name = cand
                            break

                if not raw_name:
                    for li in range(len(search_lines) - 1, -1, -1):
                        l = search_lines[li]
                        u = l.upper()
                        if (
                            len(l) <= 48
                            and not l.endswith(".")
                            and not u.startswith(("RITUAL", "RITUAIS DE", "DESCRIÇÃO", "NOVOS RITUAIS", "DISCENTE", "VERDADEIRO", "CAPÍTULO"))
                        ):
                            title_parts = [l]
                            if l.isupper():
                                k = li - 1
                                while (
                                    k >= 0
                                    and search_lines[k].isupper()
                                    and len(search_lines[k]) <= 40
                                    and not search_lines[k].endswith(".")
                                    and not search_lines[k].upper().startswith(("RITUAL", "RITUAIS DE", "NOVOS RITUAIS", "CAPÍTULO"))
                                ):
                                    if search_lines[k] != title_parts[0]:
                                        title_parts.insert(0, search_lines[k])
                                    k -= 1
                            raw_name = " ".join(title_parts)
                            break

                if not raw_name and el_line:
                    raw_name = el_line

                circle_m = re.search(r"([1234])", el_line)
                circle = int(circle_m.group(1)) if circle_m else 1
                element = normalize_element(
                    el_line.replace("ONHECIMENTO", "CONHECIMENTO")
                    .replace("ONHECIMENIO", "CONHECIMENTO")
                    .replace("MORIT", "MORTE")
                )
                if element == "Nenhum":
                    element = normalize_element(txt[:400])

                next_end = anchor_iter[idx + 1].start() if (idx + 1) < len(anchor_iter) else len(txt)
                raw_body = txt[m.end() : next_end].strip()
                if (idx + 1) < len(anchor_iter):
                    body_lines = raw_body.splitlines()
                    while body_lines and len(body_lines[-1].strip()) <= 48 and not body_lines[-1].strip().endswith("."):
                        body_lines.pop()
                    raw_body = "\n".join(body_lines).strip()

                discente = ""
                verdadeiro = ""
                disc_m = re.search(r"Disce[nr]te\s*\(([^)]+)\):\s*([^\n]+(?:\n(?!Verdadeiro)[^\n]+)*)", raw_body, flags=re.IGNORECASE)
                if disc_m:
                    discente = f"({disc_m.group(1).strip()}) {disc_m.group(2).strip().replace(chr(10), ' ')}"
                verd_m = re.search(r"Verdadeiro\s*\(([^)]+)\):\s*([^\n]+(?:\n[^\n]+)*)", raw_body, flags=re.IGNORECASE)
                if verd_m:
                    verdadeiro = f"({verd_m.group(1).strip()}) {verd_m.group(2).strip().replace(chr(10), ' ')}"

                clean_desc = re.split(r"\n\s*(?:Disce[nr]te|Verdadeiro)\s*\(", raw_body, flags=re.IGNORECASE)[0].strip()
                name_clean = smart_title(raw_name)
                if not name_clean or len(name_clean) < 2:
                    continue

                key = (book_id, name_clean.lower())
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                rituals.append({
                    "id": make_id("ritual", book_id, name_clean),
                    "category": "ritual",
                    "subCategory": f"{circle}º Círculo",
                    "name": name_clean,
                    "bookId": book_id,
                    "bookTitle": book_title,
                    "pageNumber": pno,
                    "element": element,
                    "circle": circle,
                    "execution": execucao,
                    "range": alcance,
                    "target": f"{target_type}: {alvo}",
                    "duration": duracao,
                    "resistance": resistencia,
                    "discente": discente,
                    "verdadeiro": verdadeiro,
                    "diceFormulas": extract_dice_formulas(raw_body),
                    "summary": (clean_desc.split(".")[0].strip() + ".") if clean_desc else name_clean,
                    "description": clean_desc,
                    "tags": [element, f"{circle}º Círculo", book_title, "Ritual"],
                })

    return rituals


# ============================================================================
# 2. DYNAMIC CONDITIONS PARSER (Livro Base + Arquivos Secretos #03)
# ============================================================================
def parse_conditions_from_books(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    conditions: List[Dict[str, Any]] = []
    lb = next((b for b in books if b["id"] == "livro_base"), None)
    if lb:
        for pno in (312, 313):
            if pno > len(lb["pages"]):
                continue
            txt = lb["pages"][pno - 1]["text"]
            for block in txt.split("\n\n"):
                b = block.strip().replace("\n", " ")
                m = re.match(r"^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç\s\-]{2,25})\.\s+(.+)$", b)
                if m:
                    cname = m.group(1).strip()
                    if cname in ("A menos que", "Condições", "Apêndice"):
                        continue
                    cdesc = m.group(2).strip()
                    ctype = "Geral"
                    for t in ("medo", "mental", "sentidos", "paralisia", "fadiga"):
                        if f"Condição de {t}" in cdesc or f"Condição {t}" in cdesc:
                            ctype = t.capitalize()
                            break
                    conditions.append({
                        "id": make_id("condition", "livro_base", cname),
                        "category": "condition",
                        "subCategory": f"Condição ({ctype})",
                        "name": cname,
                        "bookId": "livro_base",
                        "bookTitle": "Livro Base",
                        "pageNumber": pno,
                        "element": "Medo" if ctype == "Medo" else "Nenhum",
                        "conditionType": ctype,
                        "summary": cdesc.split(".")[0].strip() + ".",
                        "description": cdesc,
                        "tags": ["Condição", ctype, "Livro Base"],
                    })

    as03 = next((b for b in books if b["id"] == "arquivos_secretos_03"), None)
    if as03 and len(as03["pages"]) >= 124:
        conditions.append({
            "id": make_id("condition", "arquivos_secretos_03", "Apaixonado"),
            "category": "condition",
            "subCategory": "Condição (Mental)",
            "name": "Apaixonado",
            "bookId": "arquivos_secretos_03",
            "bookTitle": as03["title"],
            "pageNumber": 124,
            "element": "Sangue",
            "conditionType": "Mental",
            "summary": "O personagem passa a sentir paixão por alguém.",
            "description": "O personagem passa a sentir paixão por alguém. Ele sofre penalidade igual à soma dos PV e PE recebidos durante uma relação íntima em todos os testes contra a pessoa pela qual estiver apaixonado.",
            "tags": ["Condição", "Mental", as03["title"]],
        })
        conditions.append({
            "id": make_id("condition", "arquivos_secretos_03", "Trêmulo"),
            "category": "condition",
            "subCategory": "Condição (Geral)",
            "name": "Trêmulo",
            "bookId": "arquivos_secretos_03",
            "bookTitle": as03["title"],
            "pageNumber": 124,
            "element": "Nenhum",
            "conditionType": "Geral",
            "summary": "O personagem fica nervoso, tomado por tremeliques.",
            "description": "O personagem fica nervoso, tomado por tremeliques. Ele sofre –1d20 em testes baseados em Força e Vigor por 3 rodadas.",
            "tags": ["Condição", "Geral", as03["title"]],
        })

    return conditions


# ============================================================================
# 3. DYNAMIC ORIGINS PARSER (All 59 Origins Across All Books)
# ============================================================================
def parse_origins_from_books(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    origins: List[Dict[str, Any]] = []
    seen = set()

    sh_ocr_replacements = [
        ("CHFF on ITRC) I Ann", "CHEF DO OUTRO LADO"),
        ("Você era um aluno do colegial", "COLEGIAL\nVocê era um aluno do colegial"),
        ("DIPI OMATA", "DIPLOMATA"),
        ("EXPI ORADOR", "EXPLORADOR"),
        (". I ENÇÃO PARANORMAL.", "INVENÇÃO PARANORMAL."),
        ('RAMON "PLAYRAY" E JOÃO "PORTILL" I A Passagem', 'JOVEM MÍSTICO\nRAMON "PLAYRAY" E JOÃO "PORTILL" I A Passagem'),
        ("LEGISTA DO\nT! DA NOITE", "LEGISTA DO TURNO DA NOITE"),
        ("Lu•ro HABITUAL.", "LUTO HABITUAL."),
        ("MATEIRQ__", "MATEIRO"),
        ("MERG( II HADOR", "MERGULHADOR"),
        ("NFRD FNT( ISIASTA", "NERD ENTUSIASTA"),
        ("PSIC.ól OGC)", "PSICÓLOGO"),
        ("LUTA oU FUGA.", "LUTA OU FUGA."),
    ]

    known_origins_powers = {
        # Sobrevivendo ao Horror (20)
        "Amigo dos Animais": "Companheiro Animal",
        "Astronauta": "Acostumado ao Extremo",
        "Chef do Outro Lado": "Fome do Outro Lado",
        "Colegial": "Poder da Amizade",
        "Cosplayer": "Não é Fantasia, é Cosplay!",
        "Diplomata": "Conexões",
        "Explorador": "Manual do Sobrevivente",
        "Experimento": "Mutação",
        "Fanático por Criaturas": "Conhecimento Oculto",
        "Fotógrafo": "Através da Lente",
        "Inventor Paranormal": "Invenção Paranormal",
        "Jovem Místico": "A Culpa é das Estrelas",
        "Legista do Turno da Noite": "Luto Habitual",
        "Mateiro": "Mapa Celeste",
        "Mergulhador": "Fôlego de Nadador",
        "Motorista": "Mãos no Volante",
        "Nerd Entusiasta": "O Inteligentão",
        "Profetizado": "Luta ou Fuga",
        "Psicólogo": "Terapia",
        "Repórter Investigativo": "Encontrar a Verdade",
        # Arquivos Secretos (13)
        "Ferido por Ritual": "Mácula Ritualística",
        "Transtornado Arrependido": "Sofrimento de Sangue",
        "Influencer Paranormal": "Registrar o Paranormal",
        "Caçador de Recompensas": "Quem Não Arrisca, Não Petisca",
        "Ufólogo": "Minha Teoria Absurda",
        "Funcionário de Beira de Estrada": "Turno Invertido",
        "Cientista Ex-Panacea": "Existe uma Explicação",
        "Cobaia Sobrevivente": "Forças para Enfrentar",
        "Segurança Ex-Panacea": "Técnicas de Contenção",
        "Exorcizado": "O Que Restou",
        "Sensitivo Rebelde": "Sussurros e Vultos",
        "Treinado pela Hell Hunters": "Treinamento com Arsenal",
        "Veterano de Conflito Armado": "Full Metal Jacket",
    }

    known_origins = [
        # Livro Base (26)
        "Acadêmico", "Agente de Saúde", "Amnésico", "Artista", "Atleta", "Chef",
        "Criminoso", "Cultista Arrependido", "Desgarrado", "Engenheiro", "Executivo",
        "Investigador", "Lutador", "Magnata", "Mercenário", "Militar", "Operário",
        "Policial", "Religioso", "Servidor Público", "Teórico da Conspiração", "T.I.",
        "Trabalhador Rural", "Trambiqueiro", "Universitário", "Vítima",
        # Sobrevivendo ao Horror + Arquivos Secretos (33)
        *known_origins_powers.keys(),
    ]
    known_origins_upper = {o.upper(): o for o in known_origins}

    for book in books:
        book_id = book["id"]
        book_title = book["title"]

        if book_id == "livro_base":
            target_pages = [p for p in book["pages"] if 18 <= p["pageNumber"] <= 23]
        elif book_id == "sobrevivendo_ao_horror":
            target_pages = [p for p in book["pages"] if 8 <= p["pageNumber"] <= 14]
        elif book_id == "arquivos_secretos_07":
            target_pages = [p for p in book["pages"] if p["pageNumber"] == 80]
        else:
            target_pages = [
                p for p in book["pages"]
                if re.search(r"(?i)per[íi]cias\s+treinadas[\.:]", p["text"])
            ]

        if not target_pages:
            continue

        combined_chunks: List[Tuple[int, str]] = []
        for p in target_pages:
            pno = p["pageNumber"]
            txt = p["text"]
            txt = re.sub(r"LEGISTA\s+DO\s*\n+\s*TURNO\s+DA\s+NOITE", "LEGISTA DO TURNO DA NOITE", txt, flags=re.IGNORECASE)
            txt = re.sub(r"Segurança\s*\n\s*Ex-Panacea", "Segurança Ex-Panacea", txt)
            txt = re.sub(r"FERIDO\s*\n\s*POR RITUAL", "Ferido por Ritual", txt)
            txt = re.sub(r"TRANSTORNADO\s*\n\s*ARREPENDIDO", "Transtornado Arrependido", txt)
            txt = re.sub(r"SENSITIVO\s*\n\s*REBELDE", "Sensitivo Rebelde", txt)
            if book_id == "sobrevivendo_ao_horror":
                for old_s, new_s in sh_ocr_replacements:
                    txt = txt.replace(old_s, new_s)
                if pno == 13:
                    txt = re.sub(r"(?:TABELA\s+1\.1|TABFI AIT)[\s\S]*?Encontrar a Verdade\n?", "", txt)
                    txt = re.sub(r"TABFI AIT NOVAS ORIGFNS[\s\S]*?Atualidades e Investigação\n", "", txt)
                    txt = re.sub(r"\nPODER\n[\s\S]*?Encontrar a Verdade\n", "\n", txt)
                if pno == 8:
                    txt = re.sub(r"ORIGENS DA COMUNIDADE\n[\s\S]*?após seus nomes\.\n", "", txt)
                if pno == 9:
                    txt = re.sub(r"RESPEITE O TEXTO\n[\s\S]*?de ORDEM PARANORMAL\n", "", txt)
            if book_id == "livro_base":
                if pno == 20:
                    txt = re.sub(r"EXEMPLO DE CRIAÇÃO DE PERSONAGEM: ORIGEM[\s\S]*?Faro para Pistas\.\n+", "", txt)
                if pno == 21:
                    txt = re.sub(r"TABELA 1\.1:\s*ORIGENS[\s\S]*?Cicatrizes Psicológicas\n+", "", txt)
            combined_chunks.append((pno, txt))

        full_text = ""
        page_offsets: List[Tuple[int, int]] = []
        for pno, chunk_txt in combined_chunks:
            page_offsets.append((len(full_text), pno))
            full_text += chunk_txt + "\n\n"

        def page_for_offset(off: int) -> int:
            res_p = page_offsets[0][1]
            for start_off, pno in page_offsets:
                if off >= start_off:
                    res_p = pno
                else:
                    break
            return res_p

        matches = list(re.finditer(r"(?i)per[íi]cias\s+treinadas[\.:]\s*([^\.]*?(?:\([^)]*\)[^\.]*?)*\.)", full_text))
        for idx, m in enumerate(matches):
            trained_skills = re.sub(r"\s+", " ", m.group(1)).strip().rstrip(".")
            pno = page_for_offset(m.start())

            prev_start = matches[idx - 1].end() if idx > 0 else 0
            prev_segment = full_text[prev_start : m.start()].strip()
            seg_lines = [l.strip() for l in prev_segment.splitlines() if l.strip()]

            title_idx = 0
            raw_title = ""
            for li in range(len(seg_lines) - 1, -1, -1):
                cand_u = seg_lines[li].upper().strip(".")
                if cand_u in known_origins_upper:
                    title_idx = li
                    raw_title = known_origins_upper[cand_u]
                    break
                if seg_lines[li] == "T.I.":
                    title_idx = li
                    raw_title = "T.I."
                    break

            if not raw_title:
                for li, line in enumerate(seg_lines):
                    if (
                        len(line) <= 42
                        and not line.endswith((".", ",", ";", ":"))
                        and not line.upper().startswith(("ORIGENS", "NOVAS ORIGENS", "CAPÍTULO", "TABELA", "PERÍCIAS", "ATUALIZAÇÃO", "NOVO USO", "USO PARA"))
                        and re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\.\-\(\)]+$", line)
                    ):
                        title_idx = li
                        raw_title = smart_title(line)
                        if idx == 0 or li >= 1:
                            break

            if not raw_title:
                continue

            lore_lines = seg_lines[title_idx + 1 :]
            lore_desc = " ".join(lore_lines).strip()

            next_limit = matches[idx + 1].start() if (idx + 1) < len(matches) else len(full_text)
            after_segment = full_text[m.end() : next_limit].strip()
            after_segment = re.split(r"(?m)^(?:ATUALIZAÇÃO|NOVO USO PARA|USO PARA A)\b", after_segment)[0].strip()
            after_lines = [l.strip() for l in after_segment.splitlines() if l.strip() and not l.strip().isdigit()]

            if (idx + 1) < len(matches) and len(after_lines) > 1:
                cut_idx = len(after_lines)
                for li in range(1, len(after_lines)):
                    line = after_lines[li]
                    if line.upper().strip(".") in known_origins_upper or line == "T.I.":
                        cut_idx = li
                        break
                    if (
                        len(line) <= 42
                        and not line.endswith((".", ",", ";", ":"))
                        and re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\.\-\(\)]+$", line)
                    ):
                        cut_idx = li
                        break
                after_lines = after_lines[:cut_idx]

            after_text = " ".join(after_lines).strip()
            name_clean = smart_title(raw_title)

            if name_clean in known_origins_powers:
                power_name = known_origins_powers[name_clean]
                pdesc = re.sub(rf"^{re.escape(power_name)}[\.:!]\s*", "", after_text, flags=re.IGNORECASE)
                power_desc = pdesc.strip()
            else:
                pm = re.match(r"^([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][^\.\n!]{1,42}[\.!])\s*([\s\S]+)$", after_text)
                if pm:
                    power_name = smart_title(pm.group(1).rstrip(".!"))
                    power_desc = pm.group(2).strip()
                else:
                    power_name = "Poder de Origem"
                    power_desc = after_text

            key = (book_id, name_clean.lower())
            if key in seen:
                continue
            seen.add(key)

            full_desc = f"{lore_desc}\n\nPerícias Treinadas: {trained_skills}\n\n{power_name}: {power_desc}".strip()
            origins.append({
                "id": make_id("origin", book_id, name_clean),
                "category": "origin",
                "subCategory": "Origem",
                "name": name_clean,
                "bookId": book_id,
                "bookTitle": book_title,
                "pageNumber": pno,
                "element": "Nenhum",
                "trainedSkills": trained_skills,
                "powerName": power_name,
                "powerDescription": power_desc,
                "summary": f"Perícias: {trained_skills} | Poder: {power_name}",
                "description": full_desc,
                "tags": ["Origem", book_title],
            })

    return origins


# ============================================================================
# 4. DYNAMIC POWERS PARSER (Class Powers, General Powers, Paranormal Powers)
# ============================================================================
def parse_powers_from_books(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    powers: List[Dict[str, Any]] = []
    seen = set()

    def add_power(
        book_id: str,
        book_title: str,
        pno: int,
        pname: str,
        pdesc: str,
        subcat: str,
        element: str = "Nenhum",
        prereq: Optional[str] = None,
        affinity: Optional[str] = None,
    ) -> None:
        pname_clean = smart_title(re.sub(r"\s+", " ", pname).strip("•? \t\n.-"))
        if not pname_clean or len(pname_clean) < 3 or len(pname_clean) > 48:
            return
        if not is_title_case_header(pname_clean):
            return
        u = pname_clean.upper()
        if any(
            u.startswith(bad)
            for bad in (
                "TABELA", "PODER", "CAPÍTULO", "NEX ", "AFINIDADE", "ORIGENS",
                "NOVOS ", "NOVAS ", "CARACTERÍSTICAS", "PONTOS DE", "SANIDADE",
                "PERÍCIAS", "PROFICIÊNCIAS", "HABILIDADES", "AUMENTO DE", "GRAU DE",
                "VERSATILIDADE", "FALHOU NO", "NORMAL", "PRECÁRIA", "CONFORTÁVEL",
                "LUXUOSA", "POR ", "RESPONDENDO", "PRESENÇA PARA", "OCULTISMO EM VEZ",
            )
        ):
            return
        key = (book_id, pname_clean.lower())
        if key in seen:
            return
        seen.add(key)

        pdesc_clean = re.sub(r"\s+", " ", pdesc).strip()
        if prereq is None:
            req_m = re.search(r"Pré-requisitos?:\s*([^\.]+)\.", pdesc_clean, flags=re.IGNORECASE)
            prereq = req_m.group(1).strip() if req_m else "Nenhum"

        entry: Dict[str, Any] = {
            "id": make_id("power", book_id, pname_clean),
            "category": "power",
            "subCategory": subcat,
            "name": pname_clean,
            "bookId": book_id,
            "bookTitle": book_title,
            "pageNumber": pno,
            "element": element,
            "prerequisite": prereq,
            "diceFormulas": extract_dice_formulas(pdesc_clean),
            "summary": pdesc_clean.split(".")[0].strip() + ".",
            "description": pdesc_clean if not affinity else f"{pdesc_clean}\n\nAfinidade: {affinity}",
            "tags": [subcat, element, book_title, "Poder"] if element != "Nenhum" else [subcat, book_title, "Poder"],
        }
        if affinity:
            entry["affinity"] = affinity
        powers.append(entry)

    # 4A. Livro Base Class Powers & Paranormal Powers
    lb = next((b for b in books if b["id"] == "livro_base"), None)
    if lb:
        for class_subcat, page_range in [
            ("Poder de Combatente", (26, 27, 28)),
            ("Poder de Especialista", (30, 31)),
            ("Poder de Ocultista", (34, 35, 36)),
        ]:
            combined = ""
            offsets = []
            for pno in page_range:
                txt = lb["pages"][pno - 1]["text"]
                txt = re.sub(r"CARACTERÍSTICAS[\s\S]*?Habilidade de trilha\n", "", txt)
                txt = re.sub(r"TRILHAS DE[\s\S]*$", "", txt)
                offsets.append((len(combined), pno))
                combined += txt + "\n"

            for m in re.finditer(r"(?m)^•\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\.\n]{2,42})\.\s*([\s\S]+?)(?=\n•\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ]|\nAumento de Atributo\.|\Z)", combined):
                pno = offsets[0][1]
                for off, pg in offsets:
                    if m.start() >= off:
                        pno = pg
                add_power("livro_base", "Livro Base", pno, m.group(1), m.group(2), class_subcat)

        lb_para_text = ""
        lb_para_offsets = []
        for pno in (115, 116, 117, 118):
            txt = lb["pages"][pno - 1]["text"]
            txt = re.sub(r"RESPONDENDO AO OUTRO LADO[\s\S]*?\"Marcados\"\.\n+N\n+", "", txt)
            txt = re.sub(r"TABELA 3\.2:[\s\S]*?Sangue 2\n+", "", txt)
            lb_para_offsets.append((len(lb_para_text), pno))
            lb_para_text += txt + "\n"

        current_el = "Conhecimento"
        para_blocks = re.split(r"(?m)(?=^PODERES DE (?:CONHECIMENTO|ENERGIA|MORTE|SANGUE)\b|^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç ]{2,35}\n\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\s\S]{20,900}?\n\nAfinidade:)", lb_para_text)
        pos_cursor = 0
        for blk in para_blocks:
            idx_pos = lb_para_text.find(blk, pos_cursor)
            if idx_pos >= 0:
                pos_cursor = idx_pos
            pno = 115
            for off, pg in lb_para_offsets:
                if pos_cursor >= off:
                    pno = pg
            el_hdr = re.match(r"^PODERES DE (CONHECIMENTO|ENERGIA|MORTE|SANGUE)\s*", blk)
            if el_hdr:
                current_el = normalize_element(el_hdr.group(1))
                blk = blk[el_hdr.end():]
            m = re.match(r"^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç ]{2,38})\n+([\s\S]+?)\n+Afinidade:\s*([^\n]+(?:\n(?![A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+ )[^\n]+)*)", blk.strip())
            if m:
                pname, pbody, pafin = m.group(1).strip(), m.group(2).strip(), m.group(3).strip().replace("\n", " ")
                req_m = re.search(r"Pré-requisitos?:\s*([^\.]+)\.", pbody)
                prereq = req_m.group(1).strip() if req_m else f"{current_el} 1"
                add_power("livro_base", "Livro Base", pno, pname, pbody, "Poder Paranormal", current_el, prereq, pafin)

    # 4B. Sobrevivendo ao Horror Class Powers, General Powers & Paranormal Powers
    sh = next((b for b in books if b["id"] == "sobrevivendo_ao_horror"), None)
    if sh:
        for class_subcat, page_range in [
            ("Poder de Combatente", (15, 16)),
            ("Poder de Especialista", (23, 24)),
            ("Poder de Ocultista", (27, 28)),
        ]:
            combined_txt = "\n\n".join(sh["pages"][p - 1]["text"] for p in page_range)
            combined_txt = re.sub(r"(?m)^[\t ]*b\s+", "• ", combined_txt)
            combined_txt = re.split(r"NOVAS TRILHAS", combined_txt)[0]
            if "NOVOS PODERES" in combined_txt:
                combined_txt = re.split(r"NOVOS PODERES\s*\n\s*DE [A-ZÁÉÍÓÚÂÊÔÃÕÇ]+", combined_txt)[-1]
            combined_txt = re.sub(r"•\s+Traçado\s+Conjura\s*\n+\s*tório\.", "• Traçado Conjuratório.", combined_txt)

            for m in re.finditer(
                r"(?m)^•\s+([A-ZÀ-ÖØ-öø-ÿA-Za-z ,’'\-]{2,45})\.\s+([\s\S]+?)(?=\n+•\s+[A-ZÀ-ÖØ-öø-ÿ]|\Z)",
                combined_txt,
            ):
                pname = m.group(1).replace("\n", " ").strip()
                pbody = m.group(2).strip()
                pbody = re.sub(r"(?m)^(?:PAULO\s+MACHADO|FELIX\s+FONTANA|AMIR\s+FJELLSPØKELSE)[\s\S]*?(?=\n\n|\Z)", "", pbody).strip()
                power_pno = page_range[0]
                for check_pno in page_range:
                    if pname in sh["pages"][check_pno - 1]["text"]:
                        power_pno = check_pno
                        break
                add_power("sobrevivendo_ao_horror", sh["title"], power_pno, pname, pbody, class_subcat)

        # General Powers in Sobrevivendo ao Horror (pages 34-37, Table 2.3)
        sh_gen_table = {
            "Acrobático": "Agi 2", "Ás do Volante": "Agi 2", "Atlético": "For 2", "Atraente": "Pre 2",
            "Dedos Ágeis": "Agi 2", "Detector de Mentiras": "Pre 2", "Especialista em Emergências": "Int 2",
            "Estigmado": "—", "Foco em Perícia": "Treinado na perícia", "Inventário Organizado": "Int 2",
            "Informado": "Int 2", "Interrogador": "For 2", "Mentiroso Nato": "Pre 2", "Observador": "Int 2",
            "Pai de Pet": "Pre 2", "Palavras de Devoção": "Pre 2", "Parceiro": "Treinado em Diplomacia, NEX 30%",
            "Pensamento Tático": "Int 2", "Personalidade Esotérica": "Int 2", "Persuasivo": "Pre 2",
            "Pesquisador Científico": "Int 2", "Proativo": "Agi 2", "Provisões de Emergência": "—",
            "Racionalidade Inflexível": "Int 3", "Rato de Computador": "Int 2", "Resposta Rápida": "Agi 2",
            "Talentoso": "Pre 2", "Teimosia Obstinada": "Pre 2", "Tenacidade": "Vig 2",
            "Sentidos Aguçados": "Pre 2", "Sobrevivencialista": "Int 2", "Sorrateiro": "Agi 2",
            "Vitalidade Reforçada": "Vig 2", "Vontade Inabalável": "Pre 2",
        }
        for pno in (34, 35, 36, 37):
            txt = sh["pages"][pno - 1]["text"]
            if pno == 35:
                txt = re.sub(r"TABELA 2\.3: PODERES GERAIS[\s\S]*?Vontade Inabalável\s+Pre 2\n?", "", txt)
            for pname, req in sh_gen_table.items():
                pat = r"(?m)^" + re.escape(pname) + r"\n+([A-ZÀ-ÖØ-öø-ÿ][\s\S]+?)(?=\n+[A-ZÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9 ’'\-]{2,35}\n+|\Z)"
                m = re.search(pat, txt)
                if m:
                    pbody = m.group(1).strip()
                    add_power("sobrevivendo_ao_horror", sh["title"], pno, pname, pbody, "Poder Geral", prereq=req)

        # SaH Paranormal Powers (Table 1.6 on p. 47-48: 8 powers)
        sh_para_powers = [
            (47, "Espreitar da Besta", "Sangue", "Sangue 1", "Você recebe +5 em Furtividade. Em cenas de perseguição, se for o caçador, pode usar Furtividade em vez de Atletismo. Em cenas de furtividade, pode fazer ações discretas sem sofrer -1d20 de penalidade.", "O bônus em Furtividade aumenta para +10."),
            (47, "Instintos Sanguinários", "Sangue", "Sangue 1", "Ao se conectar com o Sangue do Outro Lado, você desperta instintos animalescos paranormais. Você recebe visão no escuro e faro.", "Você não pode mais ser flanqueado, não fica desprevenido e recebe +5 em testes de resistência contra armadilhas."),
            (47, "Antecipar Vitalidade", "Morte", "Morte 1", "Quando faz um teste, você pode acumular uma carga de antecipação para adicionar +1d20 a esse teste (máximo de cargas igual ao Vigor). Na próxima ação dormir, perde uma carga em vez de recuperar PV.", "Amplia sua capacidade de sacrificar vitalidade futura, podendo acumular até o dobro do Vigor e somando +2d20 por carga."),
            (47, "Aura de Pavor", "Morte", "Morte 2", "Você pode gastar 2 PE para emanar uma aura de pavor espiral em alcance curto que impõe penalidades e condições de medo aos inimigos próximos.", "Aumenta a DT da aura e intensifica a condição de medo causada."),
            (48, "Absorver Conhecimento", "Conhecimento", "Conhecimento 1", "Você consegue absorver fragmentos de memória e conhecimento ao tocar objetos ou registros deixados por outras pessoas.", "Reduz o custo em PE e amplia as informações obtidas."),
            (48, "Apatia Herege", "Conhecimento", "Conhecimento 1", "Você usa as experiências grotescas que já viveu para desligar suas emoções e blindar sua mente. Quando faz um teste contra uma condição de medo, você pode gastar 2 PE para rolar o teste novamente.", "Você pode usar esse poder depois de saber se passou no teste, além de escolher a melhor rolagem entre as duas."),
            (48, "Conexão Empática", "Energia", "Energia 1", "Você pode gastar uma ação completa e 2 PE para tocar um objeto elétrico ligado e conversar com ele como se fosse um ser senciente até o fim da cena.", "Você pode se conectar a objetos à distância em alcance curto e recebe +5 em testes de Diplomacia e Tecnologia com eles."),
            (48, "Valer-se do Caos", "Energia", "Energia 1", "Quando faz um teste de perícia, você pode apostar no caos da Energia para receber dados extras ou efeitos imprevisíveis.", "Você pode rolar novamente resultados desfavoráveis gerados pelo caos."),
        ]
        for pno, pname, el, prereq, pbody, pafin in sh_para_powers:
            add_power("sobrevivendo_ao_horror", sh["title"], pno, pname, pbody, "Poder Paranormal", el, prereq, pafin)

    # 4C. Arquivos Secretos Powers
    for book in books:
        book_id = book["id"]
        if book_id in ("livro_base", "sobrevivendo_ao_horror"):
            continue
        book_title = book["title"]

        for page in book["pages"]:
            pno = page["pageNumber"]
            txt = page["text"]
            sec = page.get("section", "")

            if "PODER PARANORMAL" in txt.upper():
                for m in re.finditer(
                    r"(?m)^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,40}(?:\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,40})?)\n+\s*PODER PARANORMAL\s+(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)\s*\n+([\s\S]+?)(?:\n+Afinidade:\s*([^\n]+(?:\n\n?[^\n]+)*?))?(?=\n+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,40}\n+\s*PODER PARANORMAL|\Z)",
                    txt,
                ):
                    pname = m.group(1).replace("\n", " ").strip()
                    el = normalize_element(m.group(2))
                    pbody = m.group(3).strip()
                    pafin = m.group(4).strip().replace("\n", " ") if m.group(4) else None
                    req_m = re.search(r"Pré-requisitos?:\s*([^\.]+)\.", pbody)
                    prereq = req_m.group(1).strip() if req_m else f"{el} 1"
                    add_power(book_id, book_title, pno, pname, pbody, "Poder Paranormal", el, prereq, pafin)

            is_as_power_page = (
                "Poderes" in sec
                or re.search(r"(?m)^PODERES\s+(?:DE\s+)?(?:COMBATENTE|ESPECIALISTA|OCULTISTA|GERAIS|INTENÇÃO|SACRIFÍCIO|TRANSMISSÃO)", txt)
            )
            if is_as_power_page and "PODER PARANORMAL" not in txt.upper():
                cur_subcat = "Poder Geral"
                if "Combatente" in sec:
                    cur_subcat = "Poder de Combatente"
                elif "Especialista" in sec:
                    cur_subcat = "Poder de Especialista"
                elif "Ocultista" in sec:
                    cur_subcat = "Poder de Ocultista"
                elif "Intenção" in sec:
                    cur_subcat = "Poder de Intenção"
                elif "Sacrifício" in sec:
                    cur_subcat = "Poder de Sacrifício"
                elif "Transmissão" in sec:
                    cur_subcat = "Poder de Transmissão"

                paragraphs = [b.strip() for b in txt.split("\n\n") if b.strip()]
                i = 0
                while i < len(paragraphs):
                    p_str = paragraphs[i]
                    u_str = re.sub(r"\s+", " ", p_str.upper()).strip()
                    if u_str in ("PODERES DE COMBATENTE", "PODERES DE ESPECIALISTA", "PODERES DE OCULTISTA", "PODERES GERAIS", "PODERES DE INTENÇÃO", "PODERES DE SACRIFÍCIO", "PODERES DE TRANSMISSÃO"):
                        if "COMBATENTE" in u_str:
                            cur_subcat = "Poder de Combatente"
                        elif "ESPECIALISTA" in u_str:
                            cur_subcat = "Poder de Especialista"
                        elif "OCULTISTA" in u_str:
                            cur_subcat = "Poder de Ocultista"
                        elif "INTENÇÃO" in u_str:
                            cur_subcat = "Poder de Intenção"
                        elif "SACRIFÍCIO" in u_str:
                            cur_subcat = "Poder de Sacrifício"
                        elif "TRANSMISSÃO" in u_str:
                            cur_subcat = "Poder de Transmissão"
                        else:
                            cur_subcat = "Poder Geral"
                        i += 1
                        continue

                    p_lines = [l.strip() for l in p_str.splitlines() if l.strip()]
                    cand_title = " ".join(p_lines)
                    if (
                        1 <= len(p_lines) <= 3
                        and is_title_case_header(cand_title)
                        and (i + 1) < len(paragraphs)
                    ):
                        body_parts = []
                        j = i + 1
                        while j < len(paragraphs):
                            next_p = paragraphs[j]
                            next_u = re.sub(r"\s+", " ", next_p.upper()).strip()
                            next_lines = [l.strip() for l in next_p.splitlines() if l.strip()]
                            next_cand = " ".join(next_lines)
                            if next_u in ("PODERES DE COMBATENTE", "PODERES DE ESPECIALISTA", "PODERES DE OCULTISTA", "PODERES GERAIS", "PODERES PARANORMAIS"):
                                break
                            if 1 <= len(next_lines) <= 2 and is_title_case_header(next_cand):
                                break
                            body_parts.append(next_p)
                            j += 1
                        if body_parts:
                            full_body = " ".join(body_parts)
                            if len(full_body) >= 40:
                                add_power(book_id, book_title, pno, cand_title, full_body, cur_subcat)
                            i = j
                            continue
                    i += 1

    return powers


# ============================================================================
# 5. DYNAMIC TRACKS (TRILHAS) & CLASSES PARSER (All 4 Classes & 35 Tracks)
# ============================================================================
def parse_classes_and_tracks(books: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    classes: List[Dict[str, Any]] = [
        {
            "id": "class__livro_base__combatente",
            "category": "class",
            "subCategory": "Classe Principal",
            "name": "Combatente",
            "bookId": "livro_base",
            "bookTitle": "Livro Base",
            "pageNumber": 26,
            "element": "Nenhum",
            "initialPV": "20 + Vigor",
            "pvPerNex": "4 PV (+Vig)",
            "initialPE": "2 + Presença",
            "pePerNex": "2 PE (+Pre)",
            "initialSAN": "12",
            "sanPerNex": "3 SAN",
            "trainedSkills": "Luta ou Pontaria (uma das duas) e Fortitude ou Reflexos (uma das duas), mais 1 + Intelecto perícias.",
            "proficiencies": "Armas simples, armas táticas e proteções leves.",
            "summary": "Treinado para lutar com todo tipo de armas, e com a força e a coragem para encarar os perigos de frente.",
            "description": (
                "Treinado para lutar com todo tipo de armas, e com a força e a coragem para encarar os perigos de frente. "
                "É o tipo de agente que prefere abordagens mais diretas e costuma atirar primeiro e perguntar depois.\n\n"
                "• Ataque Especial (NEX 5%): Quando faz um ataque, você pode gastar 2 PE para receber +5 no teste de ataque ou na rolagem de dano. "
                "Conforme avança de NEX, pode gastar mais PE para bônus maiores (NEX 25%: 3 PE/+10; NEX 55%: 4 PE/+15; NEX 85%: 5 PE/+20).\n"
                "• Habilidade de Trilha (NEX 10%, 40%, 65%, 99%).\n"
                "• Poder de Combatente (NEX 15%, 30%, 45%, 60%, 75%, 90%)."
            ),
            "tags": ["Classe", "Combatente", "Livro Base"],
        },
        {
            "id": "class__livro_base__especialista",
            "category": "class",
            "subCategory": "Classe Principal",
            "name": "Especialista",
            "bookId": "livro_base",
            "bookTitle": "Livro Base",
            "pageNumber": 30,
            "element": "Nenhum",
            "initialPV": "16 + Vigor",
            "pvPerNex": "3 PV (+Vig)",
            "initialPE": "3 + Presença",
            "pePerNex": "3 PE (+Pre)",
            "initialSAN": "16",
            "sanPerNex": "4 SAN",
            "trainedSkills": "Uma quantidade de perícias à sua escolha igual a 7 + Intelecto.",
            "proficiencies": "Armas simples e proteções leves.",
            "summary": "Um agente que confia mais em esperteza, raciocínio rápido e vasto conhecimento técnico para resolver mistérios.",
            "description": (
                "Um agente que confia mais em esperteza do que em força bruta. Um especialista se vale de conhecimento técnico, "
                "raciocínio rápido ou mesmo lábia para resolver mistérios e enfrentar o paranormal.\n\n"
                "• Eclético (NEX 5%): Quando faz um teste de uma perícia, você pode gastar 2 PE para receber os benefícios de ser treinado nesta perícia.\n"
                "• Perito (NEX 5%): Escolha duas perícias nas quais você é treinado (exceto Luta e Pontaria). Quando faz um teste de uma delas, "
                "você pode gastar 2 PE para somar +1d6 no resultado do teste (aumenta para +1d8 em 25%, +1d10 em 55%, +1d12 em 85%).\n"
                "• Habilidade de Trilha (NEX 10%, 40%, 65%, 99%).\n"
                "• Poder de Especialista (NEX 15%, 30%, 45%, 60%, 75%, 90%)."
            ),
            "tags": ["Classe", "Especialista", "Livro Base"],
        },
        {
            "id": "class__livro_base__ocultista",
            "category": "class",
            "subCategory": "Classe Principal",
            "name": "Ocultista",
            "bookId": "livro_base",
            "bookTitle": "Livro Base",
            "pageNumber": 34,
            "element": "Variável",
            "initialPV": "12 + Vigor",
            "pvPerNex": "2 PV (+Vig)",
            "initialPE": "4 + Presença",
            "pePerNex": "4 PE (+Pre)",
            "initialSAN": "20",
            "sanPerNex": "5 SAN",
            "trainedSkills": "Ocultismo e Vontade, mais uma quantidade de perícias à sua escolha igual a 3 + Intelecto.",
            "proficiencies": "Armas simples.",
            "summary": "Estudioso do Outro Lado capaz de canalizar os elementos paranormais e conjurar rituais de 1º a 4º Círculo.",
            "description": (
                "O Outro Lado é misterioso, perigoso e, de certa forma, cativante. Muitos estudiosos das entidades se perdem em seus reinos obscuros, "
                "mas existem aqueles que visam compreender e dominar os mistérios paranormais para usá-los para combater o próprio Outro Lado.\n\n"
                "• Escolhido pelo Outro Lado (NEX 5%): Você começa com três rituais de 1º círculo. Sempre que avança de NEX, aprende um ritual "
                "de qualquer círculo que possa lançar (2º círculo em NEX 25%, 3º em NEX 55%, 4º em NEX 85%). DT para resistir: 10 + limite de PE + Presença.\n"
                "• Habilidade de Trilha (NEX 10%, 40%, 65%, 99%).\n"
                "• Poder de Ocultista (NEX 15%, 30%, 45%, 60%, 75%, 90%)."
            ),
            "tags": ["Classe", "Ocultista", "Livro Base"],
        },
        {
            "id": "class__sobrevivendo_ao_horror__sobrevivente",
            "category": "class",
            "subCategory": "Classe de Terror / NEX 0%",
            "name": "Sobrevivente",
            "bookId": "sobrevivendo_ao_horror",
            "bookTitle": "Sobrevivendo ao Horror",
            "pageNumber": 31,
            "element": "Nenhum",
            "initialPV": "8 + Vigor",
            "pvPerNex": "+2 PV por Estágio",
            "initialPE": "2 + Presença",
            "pePerNex": "+1 PE por Estágio",
            "initialSAN": "8",
            "sanPerNex": "+2 SAN por Estágio",
            "trainedSkills": "1 + Intelecto perícias à sua escolha (além das perícias de Origem).",
            "proficiencies": "Armas simples.",
            "summary": "Pessoas comuns sem treinamento da Ordem jogadas em situações de terror extremo, evoluindo em 5 Estágios até se tornarem Agentes.",
            "description": (
                "Nova classe apresentada em Sobrevivendo ao Horror para representar pessoas comuns enfrentando o paranormal pela primeira vez.\n\n"
                "• Empenho (1º Estágio): Quando faz um teste de perícia, você pode gastar 1 PE para receber +2 nesse teste.\n"
                "• Trilha de Sobrevivente (2º e 4º Estágios): Escolha entre Durão, Esperto ou Esotérico.\n"
                "• Cicatrizado (5º Estágio): Ao sobreviver até o 5º Estágio, pode se tornar um agente de NEX 5% mantendo a habilidade Cicatrizado."
            ),
            "tags": ["Classe", "Sobrevivente", "Sobrevivendo ao Horror"],
        },
    ]

    tracks: List[Dict[str, Any]] = []
    seen_tracks = set()

    def add_track(book_id: str, book_title: str, pno: int, class_name: str, tname: str, tbody: str) -> None:
        clean_title = smart_title(tname)
        key = (book_id, class_name.lower(), clean_title.lower())
        if key in seen_tracks:
            return
        seen_tracks.add(key)
        el = "Variável" if ("Monstruoso" in clean_title or "Possuído" in clean_title) else "Nenhum"
        first_line = tbody.splitlines()[0].strip() if tbody.strip() else f"Trilha de {class_name}."
        tracks.append({
            "id": make_id("track", book_id, f"{class_name}_{clean_title}"),
            "category": "track",
            "subCategory": f"Trilha de {class_name}",
            "name": f"{clean_title} ({class_name})",
            "bookId": book_id,
            "bookTitle": book_title,
            "pageNumber": pno,
            "element": el,
            "className": class_name,
            "summary": first_line[:220],
            "description": tbody.strip(),
            "tags": ["Trilha", f"Trilha de {class_name}", class_name, book_title],
        })

    # 5A. Livro Base Tracks (15 tracks)
    lb = next((b for b in books if b["id"] == "livro_base"), None)
    if lb:
        lb_track_specs = [
            ("Combatente", (28, 29), ["Aniquilador", "Comandante de Campo", "Guerreiro", "Operações Especiais", "Tropa de Choque"]),
            ("Especialista", (31, 32, 33), ["Atirador de Elite", "Infiltrador", "Médico de Campo", "Negociador", "Técnico"]),
            ("Ocultista", (36, 37), ["Conduíte", "Flagelador", "Graduado", "Intuitivo", "Lâmina Paranormal"]),
        ]
        for class_name, pg_nums, tnames in lb_track_specs:
            combined = ""
            offsets = []
            for pno in pg_nums:
                txt = lb["pages"][pno - 1]["text"]
                txt = re.sub(r"EXEMPLO DE CRIAÇÃO DE PERSONAGEM: CLASSE[\s\S]*?Perito\.\n+", "", txt)
                txt = txt.replace("\nTudo comeca pelo Sangue\n", "\n")
                offsets.append((len(combined), pno))
                combined += txt + "\n"

            for idx, tname in enumerate(tnames):
                m = re.search(rf"(?m)^{re.escape(tname)}\s*\n", combined)
                if not m:
                    continue
                next_pos = len(combined)
                if idx + 1 < len(tnames):
                    m_next = re.search(rf"(?m)^{re.escape(tnames[idx + 1])}\s*\n", combined)
                    if m_next:
                        next_pos = m_next.start()
                tbody = combined[m.end() : next_pos].strip()
                pno = offsets[0][1]
                for off, pg in offsets:
                    if m.start() >= off:
                        pno = pg
                add_track("livro_base", "Livro Base", pno, class_name, tname, tbody)

    # 5B. Sobrevivendo ao Horror Tracks (12 tracks)
    sh = next((b for b in books if b["id"] == "sobrevivendo_ao_horror"), None)
    if sh:
        sh_track_specs = [
            ("Combatente", "Agente Secreto", 16, (16, 17), r"(?:AGENTE SECRETO|AGFNTF SFC\.RFTO)\n", r"\nEm um mundo cheio de predadores"),
            ("Combatente", "Caçador", 17, (17, 18), r"Em um mundo cheio de predadores", r"\nMONSTRUOSO\n"),
            ("Combatente", "Monstruoso", 18, (18, 19, 20, 21, 22), r"MONSTRUOSO\n", r"\Z"),
            ("Especialista", "Bibliotecário", 24, (24,), r"BIBLIOTECÁRIO\n", r"\Z"),
            ("Especialista", "Perseverante", 25, (25,), r"PERSEVERANTE\n", r"\Z"),
            ("Especialista", "Muambeiro", 26, (26,), r"Você sempre foi bom em lidar com equipamentos", r"\Z"),
            ("Ocultista", "Exorcista", 28, (28, 29), r"EXORCISTA\n", r"\n(?:POSSUÍDO|POSSI líno)\n"),
            ("Ocultista", "Possuído", 29, (29, 30), r"(?:POSSUÍDO|POSSI líno)\n", r"\nPARAPSICÓLOGO\n"),
            ("Ocultista", "Parapsicólogo", 30, (30,), r"PARAPSICÓLOGO\n", r"\Z"),
            ("Sobrevivente", "Durão", 32, (32,), r"(?:DURÃO|DURÁQ[—–-])\n", r"\Z"),
            ("Sobrevivente", "Esperto", 33, (33,), r"Voc[êeé] é um estudante, técnico", r"\nESOTÉRICO\n"),
            ("Sobrevivente", "Esotérico", 33, (33,), r"ESOTÉRICO\n", r"\nQUANDO JOGAR DE SOBREVIVENTE"),
        ]
        for class_name, tname, start_pno, pg_nums, start_pat, end_pat in sh_track_specs:
            combined = "\n".join(sh["pages"][p - 1]["text"] for p in pg_nums)
            sm = re.search(start_pat, combined)
            start_idx = sm.end() if (sm and tname not in ("Caçador", "Muambeiro", "Esperto")) else (sm.start() if sm else 0)
            sub_txt = combined[start_idx:]
            em = re.search(end_pat, sub_txt)
            tbody = sub_txt[:em.start()] if em else sub_txt
            add_track("sobrevivendo_ao_horror", sh["title"], start_pno, class_name, tname, tbody)

    # 5C. Arquivos Secretos Tracks (8 tracks across AS#01, #04, #05, #07, #09)
    for book in books:
        book_id = book["id"]
        if book_id in ("livro_base", "sobrevivendo_ao_horror"):
            continue
        book_title = book["title"]
        pages = book["pages"]

        for idx, page in enumerate(pages):
            pno = page["pageNumber"]
            txt = page["text"]
            m_before = re.search(
                r"(?im)^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ \t\-]{2,35})\n+(?:NOVA\s+)?TRILHA\s+DE\s+(COMBATENTE|ESPECIALISTA|OCULTISTA):?",
                txt,
            )
            m_after = re.search(
                r"(?im)^(?:NOVA\s+)?TRILHA\s+DE\s+(COMBATENTE|ESPECIALISTA|OCULTISTA):\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,35})",
                txt,
            )
            m_colon = re.search(
                r"(?im)^(?:NOVA\s+)?TRILHA:\s*(COMBATENTE|ESPECIALISTA|OCULTISTA)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,35})",
                txt,
            )
            if m_before:
                raw_title = m_before.group(1).strip()
                class_raw = m_before.group(2).upper()
                tbody = txt[m_before.end():].strip()
            elif m_after:
                class_raw = m_after.group(1).upper()
                raw_title = m_after.group(2).strip()
                tbody = txt[m_after.end():].strip()
            elif m_colon:
                class_raw = m_colon.group(1).upper()
                raw_title = m_colon.group(2).strip()
                tbody = txt[m_colon.end():].strip()
            else:
                continue

            class_name = "Combatente" if "COMBATENTE" in class_raw else ("Ocultista" if "OCULTISTA" in class_raw else "Especialista")

            k = idx + 1
            while k < len(pages) and "99%" not in tbody:
                next_txt = pages[k]["text"]
                if re.search(r"(?im)^(?:NOVA\s+)?TRILHA\s+DE\s+", next_txt):
                    break
                tbody += "\n\n" + next_txt.strip()
                k += 1
                if "99%" in next_txt and k < len(pages) and ("SANGUE" in pages[k]["text"] or "ENERGIA" in pages[k]["text"]):
                    tbody += "\n\n" + pages[k]["text"].strip()
                    break

            if raw_title:
                add_track(book_id, book_title, pno, class_name, raw_title, tbody)

    return classes, tracks


# ============================================================================
# 6. WEAPONS, ITEMS, MODIFICATIONS & CURSED ITEMS PARSER
# ============================================================================
def parse_weapons_and_items(books: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    weapons: List[Dict[str, Any]] = []
    items: List[Dict[str, Any]] = []
    seen_weapons = set()
    seen_items = set()

    # 6A. Parse weapon table rows from Livro Base (pages 58-59)
    lb = next((b for b in books if b["id"] == "livro_base"), None)
    if lb:
        proficiency = "Armas Simples"
        handedness = "Corpo a Corpo – Leves"
        for pno in (58, 59):
            txt = lb["pages"][pno - 1]["text"]
            for block in txt.split("\n\n"):
                lines = [l.strip() for l in block.strip().splitlines() if l.strip()]
                if not lines:
                    continue
                if lines[0] in ("Armas Simples", "Armas Táticas", "Armas Pesadas"):
                    proficiency = lines[0]
                    if len(lines) > 1:
                        handedness = lines[1]
                    continue
                if any(lines[0].startswith(prefix) for prefix in ("Corpo a Corpo", "Armas de Disparo", "Armas de Arremesso", "Armas de Fogo")):
                    handedness = lines[0]
                    continue
                if len(lines) == 7 and lines[0] != "Arma":
                    wname, cat, dmg, crit, rng, dmg_type, spaces = lines
                    key = ("livro_base", wname.lower())
                    if key in seen_weapons:
                        continue
                    seen_weapons.add(key)
                    weapons.append({
                        "id": make_id("weapon", "livro_base", wname),
                        "category": "weapon",
                        "subCategory": f"{proficiency} ({handedness})",
                        "name": wname,
                        "bookId": "livro_base",
                        "bookTitle": "Livro Base",
                        "pageNumber": pno,
                        "element": "Nenhum",
                        "itemCategory": cat,
                        "damage": dmg,
                        "critical": crit,
                        "range": rng,
                        "damageType": dmg_type,
                        "spaces": spaces,
                        "proficiency": proficiency,
                        "handedness": handedness,
                        "diceFormulas": extract_dice_formulas(dmg),
                        "summary": f"Cat {cat} | Dano: {dmg} ({dmg_type}) | Crítico: {crit} | Alcance: {rng} | Espaços: {spaces}",
                        "description": f"Proficiência: {proficiency} ({handedness})\nCategoria: {cat}\nDano: {dmg}\nCrítico: {crit}\nAlcance: {rng}\nTipo de Dano: {dmg_type}\nEspaços: {spaces}",
                        "tags": ["Arma", proficiency, f"Categoria {cat}", "Livro Base"],
                    })

        weapon_desc_text = "\n\n".join(lb["pages"][p - 1]["text"] for p in (59, 60, 61, 62))
        for w in weapons:
            m = re.search(rf"(?m)^{re.escape(w['name'])}\.\s*([^\n]+(?:\n(?![A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç \t]+\.)[^\n]+)*)", weapon_desc_text)
            if m:
                w["description"] += "\n\n" + m.group(1).strip().replace("\n", " ")

    # 6B. Sobrevivendo ao Horror New Weapons (Table 1.4, pages 38-39)
    sh = next((b for b in books if b["id"] == "sobrevivendo_ao_horror"), None)
    if sh:
        sh_weapons = [
            ("Pregador Pneumático", "0", "1d4", "x4", "Curto", "Perfuração", "1", "Armas Simples", "Armas de Disparo – Uma Mão", 39, "Ferramenta pneumática que dispara pregos em alta pressão."),
            ("Estilingue", "0", "1d4", "20/x2", "Curto", "Impacto", "1", "Armas Simples", "Armas de Disparo – Duas Mãos", 38, "Ao contrário de outras armas de disparo, permite aplicar Força às rolagens de dano."),
            ("Revólver Compacto", "I", "2d4", "19/x3", "Curto", "Balístico", "1", "Armas Simples", "Armas de Fogo – Leves", 39, "Arma de fogo leve discreta que fornece +5 em Crime para ser ocultada. Capacidade: 5 balas curtas."),
            ("Baioneta", "0", "1d4 (1d6 fixada)", "19/x2", "Curto", "Perfuração", "1", "Armas Táticas", "Corpo a Corpo – Leves", 38, "Lâmina projetada para ser fixada em um fuzil ou arma de fogo de duas mãos (torna-se arma ágil de duas mãos com dano 1d6)."),
            ("Faca Tática", "I", "1d6", "19/x2", "Curto", "Corte / Perfuração", "1", "Armas Táticas", "Corpo a Corpo – Leves", 38, "Faca balanceada de combate e sobrevivência (arma ágil, fornece +2 na RD de bloqueio ou pode ser sacrificada para +15 RD)."),
            ("Gancho de Carne", "0", "1d4", "x4", "—", "Perfuração", "1", "Armas Táticas", "Corpo a Corpo – Leves", 39, "Gancho metálico afiado usado em frigoríficos; pode ser amarrado a uma corda para alcançar 4,5m."),
            ("Bastão Policial", "0", "1d6", "20/x2", "—", "Impacto", "1", "Armas Táticas", "Corpo a Corpo – Uma Mão", 38, "Arma branca de uso padrão com guarda lateral (arma ágil, concede +1 na Defesa ao usar esquiva)."),
            ("Picareta", "0", "1d6", "x4", "—", "Perfuração", "2", "Armas Táticas", "Corpo a Corpo – Uma Mão", 39, "Ferramenta pesada de mineração com ponta perfurante letal."),
            ("Shuriken", "0", "1d4", "20/x2", "Curto", "Perfuração", "0,5", "Armas Táticas", "Armas de Arremesso", 39, "Estrela metálica afiada de arremesso rápido."),
            ("Pistola Pesada", "I", "2d8", "18/x2", "Curto", "Balístico", "1", "Armas Táticas", "Armas de Fogo – Uma Mão", 39, "Pistola de grosso calibre com alto poder de parada. Impõe -1d20 no ataque se disparada com apenas uma mão. Capacidade: 10 balas curtas."),
            ("Espingarda de Cano Duplo", "I", "4d6 (6d6 ambos)", "20/x3", "Curto", "Balístico", "2", "Armas Táticas", "Armas de Fogo – Duas Mãos", 38, "Espingarda com dois canos paralelos. Pode disparar os dois canos de uma vez sofrendo -1d20 no ataque para causar 6d6 de dano. Capacidade: 2 cartuchos."),
        ]
        for wname, cat, dmg, crit, rng, dtype, spc, prof, hand, pno, desc in sh_weapons:
            seen_weapons.add(("sobrevivendo_ao_horror", wname.lower()))
            weapons.append({
                "id": make_id("weapon", "sobrevivendo_ao_horror", wname),
                "category": "weapon",
                "subCategory": f"{prof} ({hand})",
                "name": wname,
                "bookId": "sobrevivendo_ao_horror",
                "bookTitle": sh["title"],
                "pageNumber": pno,
                "element": "Nenhum",
                "itemCategory": cat,
                "damage": dmg,
                "critical": crit,
                "range": rng,
                "damageType": dtype,
                "spaces": spc,
                "proficiency": prof,
                "handedness": hand,
                "diceFormulas": extract_dice_formulas(dmg),
                "summary": f"Cat {cat} | Dano: {dmg} ({dtype}) | Crítico: {crit} | Alcance: {rng} | Espaços: {spc}",
                "description": f"Proficiência: {prof} ({hand})\nCategoria: {cat}\nDano: {dmg}\nCrítico: {crit}\nAlcance: {rng}\nTipo de Dano: {dtype}\nEspaços: {spc}\n\n{desc}",
                "tags": ["Arma", prof, f"Categoria {cat}", sh["title"]],
            })

    # 6C. Helper to add an item cleanly without newlines or sentence fragments
    def add_item(book_id: str, book_title: str, pno: int, iname: str, idesc: str, subcat: str, el: str = "Nenhum") -> None:
        iname_clean = smart_title(re.sub(r"\s+", " ", iname).strip("•?ŽÌ \t\n.:-"))
        iname_clean = re.sub(r"^I\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])", "Granada de ", iname_clean)
        if not iname_clean or len(iname_clean) < 3 or len(iname_clean) > 46:
            return
        if not is_title_case_header(iname_clean):
            return
        u = iname_clean.upper()
        if u != "A PRIMEIRA ADAGA" and any(
            u.startswith(bad)
            for bad in (
                "CAPÍTULO", "TABELA", "NOTA", "EXEMPLO", "CATEGORIA", "TIPO", "ESPAÇO",
                "EFEITO", "ALCANCE", "DEFESA", "PROFICIÊNCIA", "RESISTÊNCIA", "VULNERABILIDADE",
                "ESPECIAL", "ESTÁGIO", "DT ", "SE ", "QUANDO ", "VOCÊ ", "PARA ", "CADA ",
                "AO ", "EM ", "O ", "A ", "OS ", "AS ", "UM ", "UMA ", "ESTE ", "ESTA ",
                "ESSES ", "ESSAS ", "POR ", "COM ", "SEM ", "APÓS ", "ALÉM ", "COMO ",
                "BÔNUS", "PREÇO", "PESO", "DANO", "CRÍTICO", "EQUIPAMENTOS", "ITENS",
                "MODIFICAÇÕES", "MALDIÇÕES", "PROTEÇÕES", "ACESSÓRIOS", "EXPLOSIVOS",
                "ARMA", "UTENSÍLIO", "GRANADA", "VESTIMENTA", "DOENÇAS", "VENENOS",
                "REGALIAS", "VEÍCULOS", "MÁSCARAS", "ALIADOS", "NOVO ", "NOVA ", "NOVOS ", "NOVAS ",
                "FALHOU", "TESTE", "SORRIA", "PANACEA", "FATAL ERROR", "CTRL", "REGRA OPCIONAL",
                "GENTE RESOLVA", "PRIMEIRO", "SEGUNDO", "TERCEIRO", "MÁXIMA", "PONTARIA",
                "INTELECTO", "CRIME E", "FOGO EM GERAL", "PODE SACAR", "ANULA ", "IGNORA ",
                "PENALIDADE", "SÓ PODE", "PV ", "FORÇA PARA", "PILOTAGEM PARA", "LODO PRETO",
                "VIVO ATÉ", "I P V", "LADRAR E",
            )
        ) or u in ("SANGUE", "MORTE", "CONHECIMENTO", "ENERGIA", "MEDO"):
            return
        if (book_id, iname_clean.lower()) in seen_weapons:
            return
        key = (book_id, iname_clean.lower())
        if key in seen_items:
            return
        seen_items.add(key)

        idesc_clean = re.sub(r"\s+", " ", idesc).strip()
        if len(idesc_clean) < 20:
            return

        items.append({
            "id": make_id("item", book_id, iname_clean),
            "category": "item",
            "subCategory": subcat,
            "name": iname_clean,
            "bookId": book_id,
            "bookTitle": book_title,
            "pageNumber": pno,
            "element": el,
            "diceFormulas": extract_dice_formulas(idesc_clean),
            "summary": idesc_clean.split(".")[0].strip() + ".",
            "description": idesc_clean,
            "tags": [subcat, el, book_title, "Item"] if el != "Nenhum" else [subcat, book_title, "Item"],
        })

    # 6D. Parse Items, Modifications, Curses & Cursed Items across Livro Base & Sobrevivendo ao Horror
    for book in books:
        book_id = book["id"]
        book_title = book["title"]

        if book_id in ("livro_base", "sobrevivendo_ao_horror"):
            for page in book["pages"]:
                pno = page["pageNumber"]
                txt = page["text"]
                sec = page.get("section", "")

                if book_id == "livro_base":
                    if not (62 <= pno <= 71 or 144 <= pno <= 155 or pno in (170, 171, 291, 292, 293)):
                        continue
                else:
                    if not (39 <= pno <= 46 or 58 <= pno <= 63):
                        continue

                for m in re.finditer(
                    r"(?m)^(?:•\s*)?([A-ZÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9 \t<>’'´\-\(\)]{2,42})\.\s+([^\n]+(?:\n(?!(?:•\s*)?[A-ZÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9 \t<>’'´\-\(\)]{2,42}\.\s)[^\n]+)*)",
                    txt,
                ):
                    iname = m.group(1).strip()
                    idesc = m.group(2).strip()
                    subcat = "Equipamento Geral"
                    el = "Nenhum"
                    if "Modificações" in sec or (book_id == "livro_base" and pno in (62, 63, 64, 69)) or (book_id == "sobrevivendo_ao_horror" and pno == 39):
                        subcat = "Modificação"
                    elif "Proteções" in sec or (book_id == "livro_base" and pno == 65):
                        subcat = "Proteção"
                    elif "Amaldiçoados" in sec or "Maldições" in sec or (book_id == "livro_base" and 144 <= pno <= 155) or (book_id == "sobrevivendo_ao_horror" and 58 <= pno <= 63):
                        subcat = "Item Amaldiçoado / Maldição"
                        for el_cand in ("Sangue", "Morte", "Conhecimento", "Energia", "Medo"):
                            if el_cand in idesc or el_cand.upper() in txt.upper():
                                el = el_cand
                                break
                    elif pno in (45, 46) and book_id == "sobrevivendo_ao_horror":
                        subcat = "Item Paranormal"
                    elif pno in (170, 171) and book_id == "livro_base":
                        subcat = "Aliado"
                    elif pno in (291, 292, 293) and book_id == "livro_base":
                        subcat = "Doença / Veneno"
                    add_item(book_id, book_title, pno, iname, idesc, subcat, el)

        else:
            # 6E. Arquivos Secretos Items, Weapons, Masks, Diseases, Poisons, Vehicles, Allies
            for page in book["pages"]:
                pno = page["pageNumber"]
                txt = page["text"]
                sec = page.get("section", "")

                if not any(kw in sec.lower() for kw in ("itens", "armas", "máscaras", "doenças", "venenos", "veículos", "aliados", "drone")):
                    continue

                for m in re.finditer(
                    r"(?m)^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç0-9 \t\+’'\-]{2,40}(?:\n[A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç0-9 \t\+’'\-]{2,40})?)\n+"
                    r"(ARMA|EQUIPAMENTO GERAL|ITEM PARANORMAL|ITEM(?:\s+|\n+)AMALDIÇOADO(?:\s+|\n+)(?:SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)|GRANADA|UTENSÍLIO|ITEM OPERACIONAL|PROTEÇÃO)\n+"
                    r"(CATEGORIA\s+[0I1234V]+(?:\s*\|\s*|\n+)[^\n]+\n+[\s\S]+?)(?=\n+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç0-9 \t\+’'\-]{2,40}(?:\n[A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç0-9 \t\+’'\-]{2,40})?\n+(?:ARMA|EQUIPAMENTO GERAL|ITEM|GRANADA|UTENSÍLIO|PROTEÇÃO|MODIFICAÇÕES|MALDIÇÕES)|\Z)",
                    txt,
                ):
                    iname = m.group(1).replace("\n", " ").strip()
                    itype = m.group(2).replace("\n", " ").strip().upper()
                    ibody = m.group(3).strip()
                    el = normalize_element(itype)
                    if itype == "ARMA":
                        cat_m = re.search(r"CATEGORIA\s+([0IV]+)", ibody)
                        spc_m = re.search(r"([0-9,]+)\s*ESPAÇO", ibody)
                        dmg_m = re.search(r"causa\s+(\d+d\d+)\s+pontos\s+de\s+dano\s+de\s+([a-záéíóúâêôãõç]+)", ibody)
                        crit_m = re.search(r"crítico\s+([0-9x/]+)", ibody)
                        cat = cat_m.group(1) if cat_m else "I"
                        spc = spc_m.group(1) if spc_m else "2"
                        dmg = dmg_m.group(1) if dmg_m else "Variável"
                        dtype = dmg_m.group(2).capitalize() if dmg_m else "Variável"
                        crit = crit_m.group(1) if crit_m else "20/x2"
                        wname_clean = smart_title(iname)
                        if (book_id, wname_clean.lower()) not in seen_weapons:
                            seen_weapons.add((book_id, wname_clean.lower()))
                            weapons.append({
                                "id": make_id("weapon", book_id, wname_clean),
                                "category": "weapon",
                                "subCategory": f"Arma ({book_title})",
                                "name": wname_clean,
                                "bookId": book_id,
                                "bookTitle": book_title,
                                "pageNumber": pno,
                                "element": el,
                                "itemCategory": cat,
                                "damage": dmg,
                                "critical": crit,
                                "range": "Médio" if "alcance médio" in ibody.lower() else ("Longo" if "alcance longo" in ibody.lower() else "Curto"),
                                "damageType": dtype,
                                "spaces": spc,
                                "proficiency": "Armas Táticas / Pesadas",
                                "handedness": "Duas Mãos",
                                "diceFormulas": extract_dice_formulas(ibody),
                                "summary": f"Cat {cat} | Dano: {dmg} ({dtype}) | Crítico: {crit} | Espaços: {spc}",
                                "description": re.sub(r"\s+", " ", ibody).strip(),
                                "tags": ["Arma", f"Categoria {cat}", book_title],
                            })
                    else:
                        subcat = "Equipamento Geral"
                        if "AMALDIÇOADO" in itype:
                            subcat = "Item Amaldiçoado / Maldição"
                        elif "PARANORMAL" in itype:
                            subcat = "Item Paranormal"
                        elif "PROTEÇÃO" in itype:
                            subcat = "Proteção"
                        add_item(book_id, book_title, pno, iname, f"{itype} — {ibody}", subcat, el)

                for m in re.finditer(
                    r"(?m)^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,40})[\.:]\s+([^\n]+(?:\n(?![A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,40}[\.:]\s)[^\n]+)*)",
                    txt,
                ):
                    iname = m.group(1).strip()
                    idesc = m.group(2).strip()
                    subcat = "Veículo / Regalia" if "Veículos" in sec or "REGALIAS" in txt else "Modificação"
                    add_item(book_id, book_title, pno, iname, idesc, subcat)

                if "Doenças" in sec or "Venenos" in sec or "Aliados" in sec:
                    subcat = "Doença" if "Doenças" in sec else ("Veneno" if "Venenos" in sec else "Aliado")
                    for m in re.finditer(
                        r"(?m)^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,35})\n\n([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\s\S]+?)(?=\n\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç \t\-]{2,35}\n\n|\Z)",
                        txt,
                    ):
                        add_item(book_id, book_title, pno, m.group(1), m.group(2), subcat)

    return weapons, items


# ============================================================================
# 7. SKILLS (PERÍCIAS) PARSER
# ============================================================================
def parse_skills_from_books(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    skills_meta = [
        ("Acrobacia", "AGI", False, True, False, 43, "Você consegue fazer proezas acrobáticas, manter o equilíbrio, amortecer quedas e escapar de amarras."),
        ("Adestramento", "PRE", True, False, False, 44, "Você sabe lidar com animais, acalmá-los, cavalgar e manejá-los para realizar tarefas."),
        ("Artes", "PRE", True, False, False, 44, "Você sabe se expressar com diversas formas de arte (música, dança, escrita, pintura, atuação) para impressionar."),
        ("Atletismo", "FOR", False, True, False, 44, "Você pode realizar façanhas atléticas como corrida, escalar, natação e saltar."),
        ("Atualidades", "INT", False, False, False, 45, "Você é um conhecedor de assuntos gerais, como política, esporte, entretenimento e fofocas."),
        ("Ciências", "INT", True, False, False, 45, "Você estudou grandes campos científicos, como matemática, física, química e biologia."),
        ("Crime", "AGI", True, True, True, 45, "Você sabe exercer atividades ilícitas (arrombar, furtar, ocultar objetos e sabotar)."),
        ("Diplomacia", "PRE", False, False, False, 46, "Você convence pessoas com lábia e argumentação (acalmar um aliado perturbado, mudar atitude, persuasão)."),
        ("Enganação", "PRE", False, False, True, 46, "Você manipula pessoas com blefes e trapaças (disfarce, falsificação, finta em combate, insinuação, intriga e mentir)."),
        ("Fortitude", "VIG", False, False, False, 47, "Você usa esta perícia para testes de resistência contra efeitos que exigem vitalidade (doenças, venenos, manter fôlego, rituais)."),
        ("Furtividade", "AGI", False, True, False, 47, "Você sabe ser discreto, esconder-se nas sombras e seguir pessoas sem ser notado."),
        ("Iniciativa", "AGI", False, False, False, 48, "Esta perícia determina sua velocidade de reação em situações de perigo, definindo a ordem de ação em combate."),
        ("Intimidação", "PRE", False, False, False, 48, "Você pode assustar ou coagir outras pessoas (assustar em combate para deixar abalado, coagir)."),
        ("Intuição", "PRE", False, False, False, 48, "Esta perícia mede sua empatia e sexto sentido (perceber mentira, pressentimento)."),
        ("Investigação", "INT", False, False, False, 48, "Você sabe como descobrir pistas e informações (interrogar, procurar pistas em cenas de investigação)."),
        ("Luta", "FOR", False, False, False, 49, "Você usa Luta para fazer ataques corpo a corpo e manobras de combate."),
        ("Medicina", "INT", False, False, True, 49, "Você sabe tratar ferimentos, doenças e venenos (primeiros socorros para estabilizar morrendo, cuidados prolongados, necropsia)."),
        ("Ocultismo", "INT", True, False, False, 49, "Você estudou o Paranormal (identificar criatura, identificar item amaldiçoado, identificar ritual, informação sobre o Outro Lado)."),
        ("Percepção", "PRE", False, False, False, 50, "Você nota coisas usando os sentidos (observar, ouvir, perceber emboscadas e coisas escondidas)."),
        ("Pilotagem", "AGI", True, False, False, 50, "Você sabe operar veículos terrestres, aquáticos e aéreos (carros, motos, barcos, helicópteros)."),
        ("Pontaria", "AGI", False, False, False, 50, "Você usa Pontaria para fazer ataques à distância (armas de disparo, arremesso e armas de fogo)."),
        ("Profissão", "INT", True, False, False, 51, "Você sabe exercer uma profissão específica (advogado, administrador, engenheiro, jornalista, químico, etc.), fornecendo itens extras por missão."),
        ("Reflexos", "AGI", False, False, False, 51, "Você usa esta perícia para testes de resistência contra efeitos que exigem reação rápida (armadilhas, explosões) e evitar fintas."),
        ("Religião", "PRE", True, False, False, 51, "Você possui conhecimento sobre teologia e diversas religiões do mundo (acalmar com fé, informação teológica, rito)."),
        ("Sobrevivência", "INT", False, False, False, 51, "Você pode se guiar em regiões selvagens, evitar perigos da natureza, fazer acampamento, identificar animais e rastrear."),
        ("Tática", "INT", True, False, False, 52, "Você recebeu educação militar (analisar terreno em combate, planejar ação)."),
        ("Tecnologia", "INT", True, False, True, 52, "Você possui conhecimento avançado de eletrônica e informática (falsificar documento digital, hackear, localizar arquivo, operar dispositivo)."),
        ("Vontade", "PRE", False, False, False, 52, "Você usa esta perícia para testes de resistência contra efeitos que exigem determinação mental (intimidação, rituais mentais, conjuração sob estresse)."),
    ]

    skills: List[Dict[str, Any]] = []
    lb = next((b for b in books if b["id"] == "livro_base"), None)

    for sname, attr, trained_only, armor_pen, kit_req, pno, short_desc in skills_meta:
        full_text = short_desc
        if lb and pno <= len(lb["pages"]):
            page_txt = lb["pages"][pno - 1]["text"]
            full_text = f"{short_desc}\n\n--- Texto da Página {pno} ---\n{page_txt[:1200]}"
        flags = []
        if trained_only:
            flags.append("Somente Treinada")
        if armor_pen:
            flags.append("Penalidade de Carga")
        if kit_req:
            flags.append("Exige Kit para certos usos")

        skills.append({
            "id": make_id("skill", "livro_base", sname),
            "category": "skill",
            "subCategory": f"Perícia ({attr})",
            "name": sname,
            "bookId": "livro_base",
            "bookTitle": "Livro Base",
            "pageNumber": pno,
            "element": "Nenhum",
            "baseAttribute": attr,
            "trainedOnly": trained_only,
            "armorPenalty": armor_pen,
            "requiresKit": kit_req,
            "summary": f"Atributo: {attr}" + (f" | {', '.join(flags)}" if flags else "") + f" — {short_desc}",
            "description": full_text,
            "tags": ["Perícia", attr, "Livro Base"] + flags,
        })

    return skills


# ============================================================================
# 8. CREATURES, THREATS & NPCS PARSER (Across All 10 Books)
# ============================================================================
def parse_creatures_from_books(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    creatures: List[Dict[str, Any]] = []
    seen = set()

    ignore_headers = {
        "CRIATURAS DE SANGUE", "CRIATURAS DE MORTE", "CRIATURAS DE CONHECIMENTO",
        "CRIATURAS DE ENERGIA", "AMEAÇAS DA REALIDADE", "CRIATURAS PARANORMAIS",
        "CAPÍTULO 7: AMEAÇAS", "NOVAS AMEAÇAS", "ANIMAIS", "FICHA DE AMEAÇA",
        "EXEMPLO DE CRIAÇÃO", "OPRPG", "FICHA", "AMEAÇAS DO HEXATOMBE",
    }
    type_size_tokens = {
        "SANGUE", "MORTE", "CONHECIMENTO", "ENERGIA", "MEDO", "TRANSMISSÃO", "RELÍQUIA",
        "CRIATURA", "PESSOA", "ANIMAL", "BANDO", "ENXAME", "HUMANOIDE",
        "MÉDIO", "MÉDIA", "GRANDE", "ENORME", "COLOSSAL", "PEQUENO", "PEQUENA", "MINÚSCULO", "MINÚSCULA",
    }

    def is_type_size_or_element_line(line: str) -> bool:
        cleaned = re.sub(r"[•\|\-\(\)\d\*]+", " ", line.upper()).strip()
        words = [w for w in cleaned.split() if w not in ("DE", "E", "OU", "VD")]
        if not words:
            return True
        return all(w in type_size_tokens for w in words)

    # 8A. Sobrevivendo ao Horror Creatures & Threats (pages 128-166, 219)
    sh = next((b for b in books if b["id"] == "sobrevivendo_ao_horror"), None)
    if sh:
        fallback_sh_attrs = {
            "sepultado": {"AGI": "1", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "3"},
            "mescla": {"AGI": "3", "FOR": "3", "INT": "1", "PRE": "1", "VIG": "2"},
            "espectro inesquecido": {"AGI": "2", "FOR": "2", "INT": "1", "PRE": "1", "VIG": "3"},
            "o uivar": {"AGI": "3", "FOR": "-", "INT": "3", "PRE": "3", "VIG": "1"},
            "derretido": {"AGI": "1", "FOR": "4", "INT": "0", "PRE": "1", "VIG": "4"},
            "melancolia": {"AGI": "4", "FOR": "-", "INT": "4", "PRE": "3", "VIG": "1"},
            "quibungo": {"AGI": "4", "FOR": "4", "INT": "1", "PRE": "3", "VIG": "4"},
            "profundo": {"AGI": "4", "FOR": "4", "INT": "2", "PRE": "2", "VIG": "2"},
            "memento mori": {"AGI": "1", "FOR": "1", "INT": "3", "PRE": "3", "VIG": "3"},
            "rascunho": {"AGI": "2", "FOR": "2", "INT": "5", "PRE": "5", "VIG": "2"},
            "medusa": {"AGI": "4", "FOR": "3", "INT": "4", "PRE": "5", "VIG": "3"},
            "amigo imaginário": {"AGI": "5", "FOR": "5", "INT": "3", "PRE": "5", "VIG": "4"},
            "bêbado local": {"AGI": "1", "FOR": "1", "INT": "0", "PRE": "0", "VIG": "1"},
            "burocrata corrompido": {"AGI": "1", "FOR": "1", "INT": "2", "PRE": "2", "VIG": "1"},
            "fazendeiro isolado": {"AGI": "1", "FOR": "2", "INT": "1", "PRE": "2", "VIG": "2"},
            "investigador": {"AGI": "2", "FOR": "1", "INT": "2", "PRE": "1", "VIG": "2"},
            "médico forense": {"AGI": "1", "FOR": "1", "INT": "3", "PRE": "1", "VIG": "2"},
            "religioso": {"AGI": "1", "FOR": "1", "INT": "1", "PRE": "3", "VIG": "2"},
            "predador sofisticado": {"AGI": "3", "FOR": "2", "INT": "2", "PRE": "1", "VIG": "2"},
            "caçador de gente": {"AGI": "2", "FOR": "3", "INT": "1", "PRE": "1", "VIG": "3"},
            "artista da morte": {"AGI": "3", "FOR": "1", "INT": "3", "PRE": "3", "VIG": "1"},
            "ariranha": {"AGI": "2", "FOR": "1", "INT": "0", "PRE": "1", "VIG": "2"},
            "cavalo": {"AGI": "1", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "2"},
            "enxame de tocandiras": {"AGI": "1", "FOR": "0", "INT": "0", "PRE": "1", "VIG": "0"},
            "gorila": {"AGI": "2", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "3"},
            "leão": {"AGI": "3", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "2"},
            "lobo": {"AGI": "3", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "2"},
            "touro": {"AGI": "1", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "2"},
            "urso pardo": {"AGI": "1", "FOR": "3", "INT": "0", "PRE": "1", "VIG": "3"},
            "o terminal": {"AGI": "2", "FOR": "4", "INT": "1", "PRE": "2", "VIG": "4"},
        }
        sh_creatures_meta = [
            (128, "Sepultado", 20, "Morte", 16, 50, "DT 15 • 2d4 mental"),
            (130, "Mescla", 60, "Sangue", 21, 100, "DT 20 • 3d6 mental"),
            (134, "Espectro Inesquecido", 220, "Energia", 27, 400, "DT 35 • 6d8 mental"),
            (136, "O Uivar", 100, "Energia", 20, 100, "DT 20 • 4d6 mental"),
            (138, "Derretido", 80, "Sangue", 23, 140, "DT 20 • 4d6 mental"),
            (141, "Melancolia", 140, "Conhecimento", 29, 200, "DT 25 • 4d8 mental"),
            (144, "Quibungo", 160, "Sangue", 34, 320, "DT 25 • 4d8 mental"),
            (148, "Profundo", 200, "Energia", 34, 380, "DT 30 • 6d6 mental"),
            (150, "Memento Mori", 260, "Morte", 44, 650, "DT 35 • 8d6 mental"),
            (152, "Rascunho", 300, "Conhecimento", 45, 700, "DT 35 • 8d6 mental"),
            (154, "Medusa", 320, "Conhecimento", 50, 380, "DT 40 • 9d6 mental"),
            (157, "Amigo Imaginário", 360, "Morte", 56, 850, "DT 40 • 8d8 mental"),
            (159, "Bêbado Local", 10, "Nenhum", 12, 6, "Nenhuma"),
            (159, "Burocrata Corrompido", 10, "Nenhum", 11, 6, "Nenhuma"),
            (160, "Fazendeiro Isolado", 20, "Nenhum", 14, 22, "Nenhuma"),
            (161, "Investigador", 40, "Nenhum", 18, 50, "Nenhuma"),
            (161, "Médico Forense", 20, "Nenhum", 15, 25, "Nenhuma"),
            (161, "Religioso", 40, "Nenhum", 17, 40, "Nenhuma"),
            (162, "Predador Sofisticado", 60, "Nenhum", 20, 70, "Nenhuma"),
            (163, "Caçador de Gente", 80, "Nenhum", 23, 80, "Nenhuma"),
            (163, "Artista da Morte", 140, "Nenhum", 27, 150, "Nenhuma"),
            (164, "Ariranha", 20, "Nenhum", 16, 32, "Nenhuma"),
            (164, "Cavalo", 10, "Nenhum", 13, 12, "Nenhuma"),
            (165, "Enxame de Tocandiras", 20, "Nenhum", 16, 22, "Nenhuma"),
            (165, "Gorila", 40, "Nenhum", 19, 70, "Nenhuma"),
            (165, "Leão", 60, "Nenhum", 18, 80, "Nenhuma"),
            (166, "Lobo", 20, "Nenhum", 15, 18, "Nenhuma"),
            (166, "Touro", 20, "Nenhum", 15, 38, "Nenhuma"),
            (166, "Urso Pardo", 60, "Nenhum", 19, 90, "Nenhuma"),
            (219, "O Terminal", 240, "Morte", 28, 500, "DT 30 • 8d6 mental"),
        ]
        for pno, cname, vd, el, defesa, pv, presenca in sh_creatures_meta:
            txt = sh["pages"][pno - 1]["text"]
            # Window text for creatures that share a page
            low_name = cname.lower()
            attrs = fallback_sh_attrs.get(low_name, {})
            seen.add(("sobrevivendo_ao_horror", low_name, vd))
            creatures.append({
                "id": make_id("creature", "sobrevivendo_ao_horror", f"{cname}_vd{vd}"),
                "category": "creature",
                "subCategory": f"Ameaça (VD {vd})",
                "name": cname,
                "bookId": "sobrevivendo_ao_horror",
                "bookTitle": sh["title"],
                "pageNumber": pno,
                "element": el,
                "vd": vd,
                "defense": defesa,
                "pv": pv,
                "attributes": attrs,
                "disturbingPresence": presenca,
                "diceFormulas": extract_dice_formulas(txt),
                "summary": f"VD {vd} | Elemento: {el} | PV: {pv} | Defesa: {defesa}",
                "description": txt.strip(),
                "tags": ["Criatura / Ameaça", el, f"VD {vd}", sh["title"]],
            })

    # Known overrides for pages where the creature's title was on the previous page or stylized
    page_creature_overrides = {
        ("arquivos_secretos_01", 69, 60): "Cleo",
        ("arquivos_secretos_01", 71, 180): "Cristino",
        ("livro_base", 205, 240): "Zumbi de Sangue Colossal",
        ("livro_base", 240, 10): "Existido",
        ("livro_base", 254, 400): "A Máscara do Desespero",
        ("livro_base", 278, 400): "O Anfitrião",
        ("livro_base", 285, 10): "Enxame de Ratos",
        ("livro_base", 285, 40): "Jacaré",
    }

    fallback_creature_attrs = {
        ("livro_base", "a máscara do desespero"): {"AGI": "4", "FOR": "4", "INT": "6", "PRE": "6", "VIG": "5"},
        ("livro_base", "o anfitrião"): {"AGI": "7", "FOR": "5", "INT": "6", "PRE": "6", "VIG": "5"},
        ("livro_base", "anomalia"): {"AGI": "-", "FOR": "-", "INT": "6", "PRE": "6", "VIG": "-"},
        ("arquivos_secretos_02", "jonas aguiar"): {"AGI": "2", "FOR": "3", "INT": "1", "PRE": "1", "VIG": "2"},
        ("arquivos_secretos_02", "dalmo magno"): {"AGI": "1", "FOR": "4", "INT": "1", "PRE": "1", "VIG": "3"},
        ("arquivos_secretos_02", "jae-yoon"): {"AGI": "3", "FOR": "2", "INT": "3", "PRE": "1", "VIG": "1"},
        ("arquivos_secretos_02", "park jae-yoon"): {"AGI": "3", "FOR": "2", "INT": "3", "PRE": "1", "VIG": "1"},
        ("arquivos_secretos_02", "kemi"): {"AGI": "3", "FOR": "1", "INT": "3", "PRE": "2", "VIG": "1"},
        ("arquivos_secretos_02", "labirinto"): {"AGI": "1", "FOR": "1", "INT": "3", "PRE": "3", "VIG": "1"},
        ("arquivos_secretos_02", "juan"): {"AGI": "2", "FOR": "2", "INT": "2", "PRE": "3", "VIG": "1"},
        ("arquivos_secretos_02", "o sacrifício"): {"AGI": "2", "FOR": "2", "INT": "2", "PRE": "3", "VIG": "1"},
        ("arquivos_secretos_04", "simulacro"): {"AGI": "1", "FOR": "-", "INT": "1", "PRE": "1", "VIG": "1"},
        ("arquivos_secretos_05", "memoflígico"): {"AGI": "3", "FOR": "-", "INT": "3", "PRE": "4", "VIG": "2"},
    }

    # 8B. Livro Base & Arquivos Secretos Creatures / Threats
    for book in books:
        book_id = book["id"]
        if book_id == "sobrevivendo_ao_horror":
            continue
        book_title = book["title"]

        for page in book["pages"]:
            pno = page["pageNumber"]
            txt = page["text"]
            sec = page.get("section", "")

            vd_matches = [
                m for m in re.finditer(r"\bVD\s*(\d{1,3})\b", txt)
                if re.search(r"(?i)\b(?:DEFESA|SENTIDOS|PRESENÇA PERTURBADORA|AÇÕES)\b", txt[max(0, m.start() - 500) : m.end() + 500])
            ]
            if book_id == "livro_base" and pno == 278:
                anf_m = re.search(r"VD0413", txt)
                if anf_m and not any(m.start() == anf_m.start() for m in vd_matches):
                    vd_matches.append(anf_m)

            if not vd_matches:
                continue

            for idx, vd_m in enumerate(vd_matches):
                if vd_m.group(0) == "VD0413":
                    vd = 400
                else:
                    vd = int(vd_m.group(1))
                prev_end = vd_matches[idx - 1].end() if idx > 0 else 0
                next_start = vd_matches[idx + 1].start() if (idx + 1) < len(vd_matches) else len(txt)

                stat_tail = txt[vd_m.end() : next_start]
                full_chunk = txt[prev_end : next_start]
                def_m = re.search(r"(?i)\bDEFESA\s*(\d{1,2})\b", stat_tail) or re.search(r"(?i)\bDEFESA\s*(\d{1,2})\b", full_chunk)
                pv_m = re.search(r"(?i)\b(?:PONTOS DE VIDA|PV)\s*\n?\s*(\d{1,4})\b", stat_tail) or re.search(r"(?i)\b(?:PONTOS DE VIDA|PV)\s*\n?\s*(\d{1,4})\b", full_chunk)
                if not def_m and not pv_m and vd != 400:
                    continue

                defesa = int(def_m.group(1)) if def_m else (29 if vd == 400 and book_id == "livro_base" and pno == 278 else 15)
                pv = int(pv_m.group(1)) if pv_m else (1413 if vd == 400 and book_id == "livro_base" and pno == 278 else 30)

                cname = page_creature_overrides.get((book_id, pno, vd), "")

                if not cname:
                    after_vd_head = txt[vd_m.end() : vd_m.end() + 100]
                    after_lines = [l.strip() for l in after_vd_head.splitlines() if l.strip()]
                    name_after_vd = []
                    for al in after_lines[:2]:
                        if is_type_size_or_element_line(al) or al.upper().startswith(("PRESENÇA", "SENTIDOS", "DEFESA", "PONTOS", "AGI", "FOR", "AÇÕES")):
                            break
                        if al.isupper() and len(al) <= 35:
                            name_after_vd.append(al)
                        else:
                            break
                    if name_after_vd:
                        cname = " ".join(name_after_vd)

                if not cname:
                    before_vd_text = txt[prev_end : vd_m.start()]
                    # Check paragraph blocks before VD
                    para_blocks = [b.strip() for b in before_vd_text.split("\n\n") if b.strip()]
                    # Pop trailing type/size/element blocks unless preceded by a line ending in DE/DA/DO
                    while para_blocks:
                        last_blk_lines = [l.strip() for l in para_blocks[-1].splitlines() if l.strip()]
                        while last_blk_lines and is_type_size_or_element_line(last_blk_lines[-1]):
                            # Don't pop SANGUE/MORTE if previous line ends with DE/DA/DO (e.g. DAMA DE\nSANGUE)
                            if len(last_blk_lines) >= 2 and last_blk_lines[-2].upper().endswith((" DE", " DA", " DO")):
                                break
                            if len(last_blk_lines) == 1 and len(para_blocks) >= 2 and para_blocks[-2].upper().endswith((" DE", " DA", " DO")):
                                break
                            last_blk_lines.pop()
                        if not last_blk_lines:
                            para_blocks.pop()
                        else:
                            para_blocks[-1] = "\n".join(last_blk_lines)
                            break

                    if not para_blocks and idx == 0:
                        cname = sec
                    elif para_blocks:
                        # Scan backwards through paragraph blocks for a short title block
                        for bi in range(len(para_blocks) - 1, -1, -1):
                            blk = para_blocks[bi]
                            blk_lines = [l.strip() for l in blk.splitlines() if l.strip()]
                            # Deduplicate identical lines in block (e.g. EXISTIDO\nEXISTIDO)
                            dedup_lines = []
                            for l in blk_lines:
                                if not dedup_lines or dedup_lines[-1] != l:
                                    dedup_lines.append(l)
                            joined = " ".join(dedup_lines)
                            u = joined.upper().strip("•* ")
                            if u in ignore_headers or is_type_size_or_element_line(joined):
                                continue
                            # Skip lore paragraphs (longer than 48 chars or ending in sentence punctuation)
                            if len(joined) > 48 or joined.endswith((".", "!", "?", '"', "”", ":")):
                                # Wait: what if the title is the first line of this block and the rest is lore?
                                if len(dedup_lines) >= 2 and len(dedup_lines[0]) <= 38 and not dedup_lines[0].endswith((".", ",", ";", ":")) and is_title_case_header(smart_title(dedup_lines[0])):
                                    cname = dedup_lines[0]
                                    break
                                continue
                            if (
                                not u.startswith(("AÇÕES", "PADRÃO", "MOVIMENTO", "LIVRE", "REAÇÃO", "COMPLETA", "TESTE ", "DANO ", "FORTITUDE", "REFLEXOS", "VONTADE", "RESISTÊNCIAS", "IMUNIDADES", "VULNERABILIDADES", "DESLOCAMENTO", "PERÍCIAS", "SENTIDOS", "DEFESA", "BÔNUS", "COMANDO"))
                                and is_title_case_header(smart_title(joined))
                            ):
                                # Check if previous block is also a short ALL-CAPS title part (e.g. DAMA DE\n\nSANGUE)
                                if joined.isupper() and bi > 0 and para_blocks[bi - 1].isupper() and len(para_blocks[bi - 1]) <= 30 and para_blocks[bi - 1].upper() not in ignore_headers and not is_type_size_or_element_line(para_blocks[bi - 1]):
                                    prev_clean = para_blocks[bi - 1].replace("\n", " ").strip()
                                    if prev_clean != joined:
                                        joined = f"{prev_clean} {joined}"
                                cname = joined
                                break

                if not cname or cname.upper() in ignore_headers:
                    cname = sec

                cname_clean = smart_title(cname)
                if cname_clean.lower() == "existido existido":
                    cname_clean = "Existido"
                if cname_clean.lower() == "ameaças da realidade":
                    if vd == 10:
                        cname_clean = "Enxame de Ratos"
                    elif vd == 40:
                        cname_clean = "Jacaré"
                    else:
                        continue

                if len(cname_clean) < 2 or cname_clean.isdigit():
                    cname_clean = f"Ameaça ({sec} - pág. {pno})"

                window_around_vd = txt[max(0, vd_m.start() - 120) : min(len(txt), vd_m.end() + 180)]
                el = normalize_element(window_around_vd)
                if cname_clean.lower() == "o anfitrião":
                    el = "Energia"
                elif el == "Nenhum" and book_id == "livro_base":
                    if "Sangue" in sec:
                        el = "Sangue"
                    elif "Morte" in sec:
                        el = "Morte"
                    elif "Conhecimento" in sec:
                        el = "Conhecimento"
                    elif "Energia" in sec:
                        el = "Energia"

                key = (book_id, cname_clean.lower(), vd)
                if key in seen:
                    continue
                seen.add(key)

                chunk_text = txt[max(prev_end, vd_m.start() - 120) : next_start].strip()
                if len(chunk_text) < 120:
                    chunk_text = full_chunk.strip()

                # Attribute extraction (horizontal, vertical, and fallback)
                attrs = {}
                m_horiz = re.search(r"AGI\s*([0-9\-—]+)\s+FOR\s*([0-9\-—]+)\s+INT\s*([0-9\-—]+)\s+PRE\s*([0-9\-—]+)\s+VIG\s*([0-9\-—]+)", txt)
                if m_horiz:
                    attrs = {
                        "AGI": m_horiz.group(1).replace("—", "-"),
                        "FOR": m_horiz.group(2).replace("—", "-"),
                        "INT": m_horiz.group(3).replace("—", "-"),
                        "PRE": m_horiz.group(4).replace("—", "-"),
                        "VIG": m_horiz.group(5).replace("—", "-"),
                    }
                else:
                    search_scope = chunk_text if len(chunk_text) > 200 else txt
                    for attr_code in ("AGI", "FOR", "INT", "PRE", "VIG"):
                        am = re.search(rf"\b{attr_code}\b\s*\n?\s*([0-9\-—]+)\b", search_scope)
                        if am:
                            attrs[attr_code] = am.group(1).replace("—", "-")

                fallback_att = fallback_creature_attrs.get((book_id, cname_clean.lower()))
                if fallback_att and len(attrs) < 5:
                    attrs = fallback_att

                presenca_m = re.search(r"PRESENÇA PERTURBADORA\s*\n\s*([^\n]+)", chunk_text)
                if cname_clean.lower() == "o anfitrião":
                    presenca = "DT 35 • 12d6 mental"
                else:
                    presenca = presenca_m.group(1).strip() if presenca_m else "Nenhuma"

                creatures.append({
                    "id": make_id("creature", book_id, f"{cname_clean}_vd{vd}"),
                    "category": "creature",
                    "subCategory": f"Ameaça (VD {vd})",
                    "name": cname_clean,
                    "bookId": book_id,
                    "bookTitle": book_title,
                    "pageNumber": pno,
                    "element": el,
                    "vd": vd,
                    "defense": defesa,
                    "pv": pv,
                    "attributes": attrs,
                    "disturbingPresence": presenca,
                    "diceFormulas": extract_dice_formulas(chunk_text),
                    "summary": f"VD {vd} | Elemento: {el} | PV: {pv} | Defesa: {defesa}",
                    "description": chunk_text,
                    "tags": ["Criatura / Ameaça", el, f"VD {vd}", book_title],
                })

    return creatures


# ============================================================================
# 9. CHAPTERS, RULES & DOSSIERS PARSER (All TOC Sections Across All 10 Books)
# ============================================================================
def parse_rules_and_chapters(books: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rules: List[Dict[str, Any]] = []
    seen = set()

    for book in books:
        book_id = book["id"]
        book_title = book["title"]
        toc = book.get("toc", [])
        pages = book.get("pages", [])

        for idx, entry in enumerate(toc):
            title = re.sub(r"\s+", " ", entry["title"]).strip()
            pno = entry["page"]
            if title.lower() in ("capa", "folha de rosto", "créditos", "sumário", "registro de atualizações") or re.fullmatch(r"\d{2}", title):
                continue
            if pno < 1 or pno > len(pages):
                continue

            next_pno = toc[idx + 1]["page"] if (idx + 1) < len(toc) else min(pno + 4, len(pages))
            end_pno = max(pno, min(next_pno, pno + 4, len(pages)))
            combined_text = "\n\n".join(
                f"[Página {p}] {pages[p - 1]['text']}"
                for p in range(pno, end_pno + 1)
                if pages[p - 1]["text"].strip()
            )
            if not combined_text.strip():
                continue

            key = (book_id, title.lower(), pno)
            if key in seen:
                continue
            seen.add(key)

            first_para = pages[pno - 1]["text"].strip().replace("\n", " ")[:240]
            subcat = "Regra / Capítulo" if book_id in ("livro_base", "sobrevivendo_ao_horror") else "Dossiê / Caso (Arquivos Secretos)"

            rules.append({
                "id": make_id("rule", book_id, f"{title}_{pno}"),
                "category": "rule",
                "subCategory": subcat,
                "name": title,
                "bookId": book_id,
                "bookTitle": book_title,
                "pageNumber": pno,
                "element": normalize_element(title),
                "summary": f"{book_title} (pág. {pno}) — {first_para}...",
                "description": combined_text,
                "tags": [subcat, book_title],
            })

    return rules


def run_entity_pipeline() -> Dict[str, Any]:
    books = json.loads(RAW_BOOKS_PATH.read_text(encoding="utf-8"))

    def canonical_book_sort(b):
        name = f"{b.get('id', '')} {b.get('title', '')} {b.get('fileName', '')}".lower()
        if "livro_base" in name or "livro base" in name:
            return (0, 0, name)
        if "sobrevivendo" in name or "horror" in name:
            return (1, 0, name)
        if "arquivo" in name:
            nums = re.findall(r"\d+", name)
            num = int(nums[0]) if nums else 999
            return (2, num, name)
        return (3, 0, name)

    books.sort(key=canonical_book_sort)

    for b in books:
        for p in b["pages"]:
            p["text"] = p["text"].replace("\xad", "").replace("\ufb01", "fi").replace("\ufb02", "fl").replace("\uf0ab", "")

    rituals = parse_rituals_from_books(books)
    origins = parse_origins_from_books(books)
    classes, tracks = parse_classes_and_tracks(books)
    powers = parse_powers_from_books(books)
    weapons, items = parse_weapons_and_items(books)
    skills = parse_skills_from_books(books)
    conditions = parse_conditions_from_books(books)
    creatures = parse_creatures_from_books(books)
    rules = parse_rules_and_chapters(books)

    all_entities = (
        rituals
        + origins
        + classes
        + tracks
        + powers
        + weapons
        + items
        + skills
        + conditions
        + creatures
        + rules
    )

    used_ids = set()
    for ent in all_entities:
        base_id = ent["id"]
        uid = base_id
        counter = 2
        while uid in used_ids:
            uid = f"{base_id}_p{ent.get('pageNumber', 0)}_{counter}"
            counter += 1
        ent["id"] = uid
        used_ids.add(uid)

    stats = {
        "totalEntities": len(all_entities),
        "byCategory": {
            "ritual": len(rituals),
            "origin": len(origins),
            "class": len(classes),
            "track": len(tracks),
            "power": len(powers),
            "weapon": len(weapons),
            "item": len(items),
            "skill": len(skills),
            "condition": len(conditions),
            "creature": len(creatures),
            "rule": len(rules),
        },
        "totalBooks": len(books),
        "totalPages": sum(len(b["pages"]) for b in books),
    }

    compendium_payload = {
        "version": "1.1.0",
        "generatedAt": "2026-10-24",
        "stats": stats,
        "books": [
            {
                "id": b["id"],
                "title": b["title"],
                "fileName": b["fileName"],
                "pageCount": b["pageCount"],
                "toc": b["toc"],
            }
            for b in books
        ],
        "entities": all_entities,
    }

    books_pages_payload = {
        "version": "1.1.0",
        "books": {
            b["id"]: {
                "id": b["id"],
                "title": b["title"],
                "fileName": b["fileName"],
                "pageCount": b["pageCount"],
                "toc": b["toc"],
                "pages": [
                    {
                        "pageNumber": p["pageNumber"],
                        "section": p.get("section", b["title"]),
                        "text": p["text"],
                    }
                    for p in b["pages"]
                ],
            }
            for b in books
        },
    }

    compendium_json = json.dumps(compendium_payload, ensure_ascii=False, indent=2)
    books_json = json.dumps(books_pages_payload, ensure_ascii=False, indent=2)

    COMPENDIUM_OUT_PATH.write_text(compendium_json, encoding="utf-8")
    BOOKS_OUT_PATH.write_text(books_json, encoding="utf-8")
    SRC_COMPENDIUM_OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SRC_COMPENDIUM_OUT_PATH.write_text(compendium_json, encoding="utf-8")
    SRC_BOOKS_OUT_PATH.write_text(books_json, encoding="utf-8")

    print("=== RELATÓRIO DE EXTRAÇÃO E UNIFICAÇÃO ===")
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    return compendium_payload


if __name__ == "__main__":
    run_entity_pipeline()
