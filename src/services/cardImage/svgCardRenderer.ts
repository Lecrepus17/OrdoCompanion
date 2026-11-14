import { CardThemeDefinition, ExportCardOptions, RecordCardData } from './types';

function escapeXml(unsafe?: string | number | null): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Quebra texto em linhas com limite aproximado de caracteres por linha
 */
function wrapTextToLines(text: string, maxCharsPerLine = 48): string[] {
  if (!text) return [];
  const max = Math.max(4, maxCharsPerLine);
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      // Linha em branco entre parágrafos (evita duplicadas)
      if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }
    let currentLine = '';
    for (let word of words) {
      // Palavras maiores que a linha (URLs, códigos) são quebradas à força
      while (word.length > max) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        lines.push(word.slice(0, max));
        word = word.slice(max);
      }
      if (!word) continue;
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= max) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Gera os elementos vetoriais procedurais de fundo dependendo do elemento ou tipo
 */
function renderPatternSvg(patternType: string, colors: CardThemeDefinition['colors'], width: number, height: number): string {
  switch (patternType) {
    case 'blood_veins':
      return `
        <!-- Padrão Sangue: Linhas orgânicas viscerais e veias -->
        <g stroke="${colors.primary}" stroke-opacity="0.18" stroke-width="2.5" fill="none">
          <path d="M-50,${height * 0.15} Q${width * 0.3},${height * 0.3} ${width * 0.5},${height * 0.2} T${width + 50},${height * 0.4}" />
          <path d="M${width * 0.3},${height * 0.3} Q${width * 0.4},${height * 0.55} ${width * 0.15},${height * 0.8}" />
          <path d="M${width * 0.5},${height * 0.2} Q${width * 0.8},${height * 0.35} ${width * 0.75},${height * 0.7}" />
          <path d="M-20,${height * 0.65} Q${width * 0.45},${height * 0.75} ${width + 50},${height * 0.85}" />
        </g>
        <circle cx="${width * 0.85}" cy="${height * 0.18}" r="160" fill="${colors.glowColor}" filter="url(#blur-glow)" opacity="0.35" />
        <circle cx="${width * 0.15}" cy="${height * 0.85}" r="220" fill="${colors.glowColor}" filter="url(#blur-glow)" opacity="0.25" />
      `;

    case 'death_spirals':
      return `
        <!-- Padrão Morte: Espirais e partículas de lodo e tempo -->
        <g stroke="${colors.borderColor}" stroke-opacity="0.14" stroke-width="2" fill="none">
          <circle cx="${width * 0.5}" cy="${height * 0.45}" r="120" stroke-dasharray="8 6" />
          <circle cx="${width * 0.5}" cy="${height * 0.45}" r="220" stroke-dasharray="14 10" />
          <circle cx="${width * 0.5}" cy="${height * 0.45}" r="340" stroke-dasharray="20 14" />
          <circle cx="${width * 0.5}" cy="${height * 0.45}" r="480" stroke-dasharray="30 20" />
        </g>
        <circle cx="${width * 0.5}" cy="${height * 0.45}" r="280" fill="${colors.glowColor}" filter="url(#blur-glow)" opacity="0.18" />
      `;

    case 'knowledge_runes':
      return `
        <!-- Padrão Conhecimento: Geometria sagrada, sigilos e anéis de runas -->
        <g stroke="${colors.accent}" stroke-opacity="0.16" stroke-width="2" fill="none">
          <circle cx="${width * 0.82}" cy="${height * 0.22}" r="140" />
          <circle cx="${width * 0.82}" cy="${height * 0.22}" r="100" stroke-dasharray="6 4" />
          <polygon points="${width * 0.82},${height * 0.22 - 90} ${width * 0.82 + 78},${height * 0.22 + 45} ${width * 0.82 - 78},${height * 0.22 + 45}" />
          <polygon points="${width * 0.82},${height * 0.22 + 90} ${width * 0.82 + 78},${height * 0.22 - 45} ${width * 0.82 - 78},${height * 0.22 - 45}" />
          <circle cx="${width * 0.18}" cy="${height * 0.78}" r="110" stroke-dasharray="10 8" />
        </g>
        <circle cx="${width * 0.82}" cy="${height * 0.22}" r="160" fill="${colors.glowColor}" filter="url(#blur-glow)" opacity="0.30" />
      `;

    case 'energy_chaos':
      return `
        <!-- Padrão Energia: Raios caóticos e spikes neon -->
        <g stroke="${colors.accent}" stroke-opacity="0.22" stroke-width="2.5" fill="none">
          <path d="M-10,${height * 0.2} L${width * 0.3},${height * 0.24} L${width * 0.22},${height * 0.38} L${width * 0.55},${height * 0.42} L${width * 0.48},${height * 0.6} L${width + 30},${height * 0.65}" />
          <path d="M${width * 0.6},0 L${width * 0.72},${height * 0.18} L${width * 0.65},${height * 0.28} L${width * 0.85},${height * 0.45} L${width * 0.78},${height * 0.58} L${width * 0.92},${height}" />
        </g>
        <circle cx="${width * 0.75}" cy="${height * 0.25}" r="180" fill="${colors.glowColor}" filter="url(#blur-glow)" opacity="0.32" />
        <circle cx="${width * 0.25}" cy="${height * 0.75}" r="160" fill="${colors.primary}" filter="url(#blur-glow)" opacity="0.25" />
      `;

    case 'fear_mist':
      return `
        <!-- Padrão Medo: Ondas de névoa abissal e silhuetas fantasmagóricas -->
        <g stroke="${colors.borderColor}" stroke-opacity="0.14" stroke-width="3" fill="none">
          <path d="M-40,${height * 0.3} Q${width * 0.25},${height * 0.18} ${width * 0.5},${height * 0.32} T${width + 40},${height * 0.25}" />
          <path d="M-40,${height * 0.5} Q${width * 0.3},${height * 0.65} ${width * 0.6},${height * 0.48} T${width + 40},${height * 0.62}" />
          <path d="M-40,${height * 0.75} Q${width * 0.2},${height * 0.88} ${width * 0.55},${height * 0.72} T${width + 40},${height * 0.82}" />
        </g>
        <circle cx="${width * 0.5}" cy="${height * 0.35}" r="260" fill="${colors.glowColor}" filter="url(#blur-glow)" opacity="0.22" />
      `;

    case 'tactical_grid':
      return `
        <!-- Padrão Tático: Grade milimétrica e miras -->
        <defs>
          <pattern id="tgrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="${colors.borderColor}" stroke-width="0.8" stroke-opacity="0.12" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#tgrid)" />
        <g stroke="${colors.primary}" stroke-opacity="0.30" stroke-width="1.8" fill="none">
          <circle cx="${width * 0.88}" cy="${height * 0.16}" r="32" />
          <line x1="${width * 0.88 - 40}" y1="${height * 0.16}" x2="${width * 0.88 + 40}" y2="${height * 0.16}" />
          <line x1="${width * 0.88}" y1="${height * 0.16 - 40}" x2="${width * 0.88}" y2="${height * 0.16 + 40}" />
        </g>
      `;

    case 'parchment_dossier':
      return `
        <!-- Padrão Dossiê: Marcação confidencial e carimbos -->
        <g transform="rotate(-18 ${width * 0.8} ${height * 0.18})" opacity="0.12">
          <rect x="${width * 0.65}" y="${height * 0.12}" width="220" height="52" rx="6" fill="none" stroke="${colors.primary}" stroke-width="3" stroke-dasharray="10 4" />
          <text x="${width * 0.76}" y="${height * 0.155}" fill="${colors.primary}" font-family="monospace" font-size="22" font-weight="900" text-anchor="middle">ORDO REALITAS</text>
        </g>
      `;

    default:
      return `
        <!-- Padrão Padrão: Brasão discreto Ordo Realitas -->
        <circle cx="${width * 0.5}" cy="${height * 0.4}" r="220" stroke="${colors.borderColor}" stroke-opacity="0.10" stroke-width="2" fill="none" />
        <circle cx="${width * 0.5}" cy="${height * 0.4}" r="140" stroke="${colors.borderColor}" stroke-opacity="0.08" stroke-width="1.5" fill="none" stroke-dasharray="8 6" />
      `;
  }
}

/**
 * Renderiza os ornamentos de canto no estilo especificado
 */
function renderCornerBrackets(
  style: CardThemeDefinition['cornerStyle'],
  color: string,
  pad: number,
  w: number,
  h: number
): string {
  const len = 36;
  const inner = pad;
  const right = w - pad;
  const bottom = h - pad;

  if (style === 'clean') {
    return `
      <g stroke="${color}" stroke-width="2" fill="none" opacity="0.7">
        <path d="M${inner},${inner + len} L${inner},${inner} L${inner + len},${inner}" />
        <path d="M${right - len},${inner} L${right},${inner} L${right},${inner + len}" />
        <path d="M${inner},${bottom - len} L${inner},${bottom} L${inner + len},${bottom}" />
        <path d="M${right - len},${bottom} L${right},${bottom} L${right},${bottom - len}" />
      </g>
    `;
  }

  // Estilo Gótico / Rúnico / Tech com pontas duplas
  return `
    <g stroke="${color}" stroke-width="2.5" fill="none" opacity="0.85">
      <!-- Canto Superior Esquerdo -->
      <path d="M${inner},${inner + len} L${inner},${inner} L${inner + len},${inner}" />
      <circle cx="${inner + 4}" cy="${inner + 4}" r="3" fill="${color}" />

      <!-- Canto Superior Direito -->
      <path d="M${right - len},${inner} L${right},${inner} L${right},${inner + len}" />
      <circle cx="${right - 4}" cy="${inner + 4}" r="3" fill="${color}" />

      <!-- Canto Inferior Esquerdo -->
      <path d="M${inner},${bottom - len} L${inner},${bottom} L${inner + len},${bottom}" />
      <circle cx="${inner + 4}" cy="${bottom - 4}" r="3" fill="${color}" />

      <!-- Canto Inferior Direito -->
      <path d="M${right - len},${bottom} L${right},${bottom} L${right},${bottom - len}" />
      <circle cx="${right - 4}" cy="${bottom - 4}" r="3" fill="${color}" />
    </g>
  `;
}

/**
 * Largura base do layout (unidades internas). Larguras maiores apenas escalam o
 * desenho via transform, mantendo proporções e evitando textos minúsculos.
 */
export const BASE_CARD_WIDTH = 800;
/** Largura padrão de exportação: suficiente para Discord/WhatsApp sem arquivos pesados. */
export const DEFAULT_CARD_WIDTH = 800;
const MIN_AUTO_HEIGHT = 480;
const MAX_AUTO_DESC_LINES = 28;

const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Estima quantos caracteres cabem em uma largura (px) para um tamanho de fonte. */
function charsFor(widthPx: number, fontSize: number, factor: number): number {
  return Math.max(6, Math.floor(widthPx / (fontSize * factor)));
}

/** Estima largura (px) de um texto em caixa alta com letter-spacing. */
function estimateTextWidth(text: string, fontSize: number, factor: number, letterSpacing = 0): number {
  return text.length * (fontSize * factor + letterSpacing);
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

/** Extrai largura/altura reais do SVG gerado (altura pode ser automática). */
export function getSvgDimensions(svg: string): { width: number; height: number } {
  const w = svg.match(/<svg[^>]*\bwidth="(\d+(?:\.\d+)?)"/);
  const h = svg.match(/<svg[^>]*\bheight="(\d+(?:\.\d+)?)"/);
  return {
    width: w ? Math.round(parseFloat(w[1])) : DEFAULT_CARD_WIDTH,
    height: h ? Math.round(parseFloat(h[1])) : Math.round(DEFAULT_CARD_WIDTH * 1.25),
  };
}

/**
 * Renderizador de SVG para Cartões de Registro do Compêndio.
 * - Quebra de texto calculada pela largura útil real (sem estourar a moldura).
 * - Altura automática ajustada ao conteúdo quando `options.height` não é informado.
 */
export function generateCardSvg(
  data: RecordCardData,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): string {
  const width = Math.round(options.width || DEFAULT_CARD_WIDTH);
  const scale = width / BASE_CARD_WIDTH;
  const W = BASE_CARD_WIDTH;
  const { colors } = theme;

  const pad = 36;
  const contentX = pad + 20;
  const innerW = W - contentX * 2;
  const footerReserve = 70; // altura da faixa de rodapé acima da moldura interna

  // ---------- Cabeçalho (badges) ----------
  let y = pad + 28;
  const headerBadgesY = y;
  const badgeH = 32;
  const catLabel = truncateText(String(data.categoryLabel || data.category || 'REGISTRO').toUpperCase(), 22);
  const catBadgeW = Math.ceil(estimateTextWidth(catLabel, 12, 0.68, 1.2) + 28);
  const elementLabel = data.element ? truncateText(`${theme.elementGlyph} ${data.element.toUpperCase()}`, 18) : '';
  const elemBadgeX = contentX + catBadgeW + 10;
  const elemBadgeW = elementLabel ? Math.ceil(estimateTextWidth(elementLabel, 12, 0.68, 1) + 28) : 0;
  const badgesEnd = elementLabel ? elemBadgeX + elemBadgeW : contentX + catBadgeW;
  const sourceRaw = `${data.bookTitle || 'Compêndio Paranormal'}${data.pageNumber ? ` • Pág. ${data.pageNumber}` : ''}`;
  const sourceAvail = W - contentX - badgesEnd - 16;
  const sourceText = sourceAvail > 40 ? truncateText(sourceRaw, charsFor(sourceAvail, 13, 0.55)) : '';
  y += badgeH + 24;

  // ---------- Título ----------
  let titleFontSize = 44;
  let titleLines = wrapTextToLines(data.name || 'Registro', charsFor(innerW, titleFontSize, 0.6));
  if (titleLines.length > 2) {
    titleFontSize = 36;
    titleLines = wrapTextToLines(data.name || 'Registro', charsFor(innerW, titleFontSize, 0.6));
  }
  if (titleLines.length > 2) {
    titleFontSize = 30;
    const maxC = charsFor(innerW, titleFontSize, 0.6);
    titleLines = wrapTextToLines(data.name || 'Registro', maxC);
    if (titleLines.length > 3) {
      titleLines = [...titleLines.slice(0, 2), truncateText(titleLines.slice(2).join(' '), maxC)];
    }
  }
  const titleLineH = titleFontSize * 1.15;
  const titleStartY = y + titleFontSize * 0.85;
  y += titleLines.length * titleLineH + 4;

  // ---------- Subcategoria ----------
  const hasSubCategory = Boolean(data.subCategory && data.subCategory !== data.name);
  let subCategoryY = 0;
  const subCategoryText = hasSubCategory
    ? truncateText(data.subCategory!.toUpperCase(), charsFor(innerW, 15, 0.68))
    : '';
  if (hasSubCategory) {
    subCategoryY = y + 18;
    y += 30;
  }

  // ---------- Divisória ----------
  y += 8;
  const dividerY = y;
  y += 22;

  // ---------- Estatísticas ----------
  const statsList = (data.stats || []).slice(0, 6);
  const statColumns = Math.max(1, Math.min(3, statsList.length));
  const statGap = 12;
  const statBoxWidth = Math.floor((innerW - (statColumns - 1) * statGap) / statColumns);
  const statRowHeight = 60;
  const statsStartY = y;
  const statRowsCount = Math.ceil(statsList.length / statColumns);
  if (statsList.length > 0) {
    y += statRowsCount * (statRowHeight + statGap) - statGap + 24;
  }
  const statLabelChars = charsFor(statBoxWidth - 24, 11, 0.7);
  const statValueChars = charsFor(statBoxWidth - 24, 16, 0.6);

  // ---------- Resumo ----------
  const summaryLines = data.summary ? wrapTextToLines(data.summary, charsFor(innerW - 32, 15, 0.52)).slice(0, 3) : [];
  const summaryLineH = 22;
  const summaryBoxH = summaryLines.length * summaryLineH + 18;
  const summaryStartY = y;
  if (summaryLines.length > 0) {
    y += summaryBoxH + 20;
  }

  // ---------- Descrição + Seções extras ----------
  const descFontSize = 17;
  const descLineHeight = 26;
  const allDescLines = wrapTextToLines(data.description, charsFor(innerW, descFontSize, 0.5));
  const descStartY = y;

  const extraFont = 14;
  const extraLineH = 20;
  const extraChars = charsFor(innerW, extraFont, 0.5);
  let extraSections = (data.extraSections || []).slice(0, 3).map((sec) => {
    const lines = wrapTextToLines(sec.content, extraChars);
    const visible = lines.slice(0, 4);
    if (lines.length > 4) visible[3] = truncateText(`${visible[3]} …`, extraChars);
    return { ...sec, lines: visible, height: 26 + visible.length * extraLineH + 14 };
  });
  const extrasHeight = () => extraSections.reduce((acc, s) => acc + s.height, 0);

  let height: number;
  let maxDescLines: number;
  if (options.height) {
    // Altura fixa solicitada: ajusta o conteúdo para caber dentro da moldura
    height = Math.round(options.height);
    const baseH = height / scale;
    const limitY = baseH - pad - footerReserve - 14;
    const fitDesc = () => Math.floor((limitY - descStartY - extrasHeight() - 10) / descLineHeight);
    while (extraSections.length > 0 && fitDesc() < Math.min(3, allDescLines.length)) {
      extraSections = extraSections.slice(0, -1);
    }
    maxDescLines = Math.max(0, fitDesc());
  } else {
    maxDescLines = MAX_AUTO_DESC_LINES;
    height = 0; // calculado abaixo
  }

  const hasTruncated = allDescLines.length > maxDescLines;
  const visibleDescLines = hasTruncated
    ? allDescLines.slice(0, Math.max(0, maxDescLines - 1))
    : allDescLines;
  const descBlockH = (visibleDescLines.length + (hasTruncated ? 1 : 0)) * descLineHeight;
  y += descBlockH + (descBlockH > 0 ? 10 : 0);

  const extraSectionStartY = y;
  y += extrasHeight();

  if (!options.height) {
    const baseH = Math.max(MIN_AUTO_HEIGHT, Math.ceil(y + 14 + footerReserve + pad));
    height = Math.round(baseH * scale);
  }
  const H = height / scale; // altura no sistema de coordenadas base

  const textAttrs = `font-family="${FONT_FAMILY}"`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%" stop-color="${colors.bgGradientStart}" />
      <stop offset="100%" stop-color="${colors.bgGradientEnd}" />
    </linearGradient>
    <linearGradient id="header-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="${colors.accent}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${colors.secondary}" stop-opacity="0.8" />
    </linearGradient>
    <linearGradient id="box-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${colors.surfaceBg}" />
      <stop offset="100%" stop-color="rgba(10, 10, 15, 0.85)" />
    </linearGradient>
    <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="60" result="blur" />
    </filter>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.6" />
    </filter>
    <clipPath id="card-clip">
      <rect width="${W}" height="${H}" />
    </clipPath>
  </defs>

  <g transform="scale(${scale})" clip-path="url(#card-clip)">
  <!-- 1. FUNDO BASE -->
  <rect width="${W}" height="${H}" fill="url(#bg-grad)" />

  <!-- 2. PADRÃO PROCEDURAL DO ELEMENTO / TEMA -->
  ${renderPatternSvg(theme.patternType, colors, W, H)}

  <!-- 3. MOLDURA DUPLA -->
  <rect x="${pad - 12}" y="${pad - 12}" width="${W - (pad - 12) * 2}" height="${H - (pad - 12) * 2}" rx="18" fill="none" stroke="${colors.borderColor}" stroke-width="1.8" stroke-opacity="0.45" />
  <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="12" fill="none" stroke="${colors.borderColor}" stroke-width="2.5" stroke-opacity="0.85" />

  <!-- 4. CANTONEIRAS -->
  ${renderCornerBrackets(theme.cornerStyle, colors.accent, pad + 8, W, H)}

  <!-- 5. CABEÇALHO COM BADGES -->
  <g id="header-badges">
    <rect x="${contentX}" y="${headerBadgesY}" width="${catBadgeW}" height="${badgeH}" rx="6" fill="${colors.badgeBg}" stroke="${colors.borderColor}" stroke-width="1.5" />
    <text x="${contentX + catBadgeW / 2}" y="${headerBadgesY + 21}" fill="${colors.badgeText}" ${textAttrs} font-size="12" font-weight="800" letter-spacing="1.2" text-anchor="middle">${escapeXml(catLabel)}</text>
    ${
      elementLabel
        ? `<rect x="${elemBadgeX}" y="${headerBadgesY}" width="${elemBadgeW}" height="${badgeH}" rx="6" fill="${colors.badgeBg}" stroke="${colors.accent}" stroke-width="1.5" />
    <text x="${elemBadgeX + elemBadgeW / 2}" y="${headerBadgesY + 21}" fill="${colors.accent}" ${textAttrs} font-size="12" font-weight="800" letter-spacing="1" text-anchor="middle">${escapeXml(elementLabel)}</text>`
        : ''
    }
    ${
      sourceText
        ? `<text x="${W - contentX}" y="${headerBadgesY + 21}" fill="${colors.textMuted}" ${textAttrs} font-size="13" font-weight="600" text-anchor="end" opacity="0.9">${escapeXml(sourceText)}</text>`
        : ''
    }
  </g>

  <!-- 6. TÍTULO DO REGISTRO -->
  <g id="card-title">
    ${titleLines
      .map(
        (line, idx) =>
          `<text x="${contentX}" y="${(titleStartY + idx * titleLineH).toFixed(1)}" fill="${colors.textColor}" ${textAttrs} font-size="${titleFontSize}" font-weight="900" letter-spacing="0.3" filter="url(#shadow)">${escapeXml(line)}</text>`
      )
      .join('\n    ')}
    ${
      hasSubCategory
        ? `<text x="${contentX + 2}" y="${subCategoryY.toFixed(1)}" fill="${colors.accent}" ${textAttrs} font-size="15" font-weight="700" letter-spacing="1" opacity="0.9">${escapeXml(subCategoryText)}</text>`
        : ''
    }
  </g>

  <!-- 7. DIVISÓRIA COM GRADIENTE -->
  <line x1="${contentX}" y1="${dividerY.toFixed(1)}" x2="${W - contentX}" y2="${dividerY.toFixed(1)}" stroke="url(#header-glow)" stroke-width="2.5" stroke-linecap="round" />

  <!-- 8. GRID DE ESTATÍSTICAS -->
  ${
    statsList.length > 0
      ? `<g id="stats-grid">
    ${statsList
      .map((st, i) => {
        const col = i % statColumns;
        const row = Math.floor(i / statColumns);
        const bx = contentX + col * (statBoxWidth + statGap);
        const by = statsStartY + row * (statRowHeight + statGap);
        const isHl = st.highlight;
        return `<g>
      <rect x="${bx}" y="${by.toFixed(1)}" width="${statBoxWidth}" height="${statRowHeight}" rx="8" fill="url(#box-grad)" stroke="${isHl ? colors.accent : colors.borderColor}" stroke-width="${isHl ? 1.8 : 1}" stroke-opacity="${isHl ? 0.9 : 0.4}" />
      <text x="${bx + 12}" y="${(by + 22).toFixed(1)}" fill="${colors.textMuted}" ${textAttrs} font-size="11" font-weight="700" letter-spacing="0.8">${escapeXml(truncateText(String(st.label || 'INFO').toUpperCase(), statLabelChars))}</text>
      <text x="${bx + 12}" y="${(by + 46).toFixed(1)}" fill="${isHl ? colors.accent : colors.textColor}" ${textAttrs} font-size="16" font-weight="800">${escapeXml(truncateText(String(st.value ?? '—'), statValueChars))}</text>
    </g>`;
      })
      .join('\n    ')}
  </g>`
      : ''
  }

  <!-- 9. RESUMO -->
  ${
    summaryLines.length > 0
      ? `<g id="summary-box">
    <rect x="${contentX}" y="${summaryStartY.toFixed(1)}" width="${innerW}" height="${summaryBoxH}" rx="6" fill="${colors.surfaceBg}" stroke="${colors.borderColor}" stroke-width="1" stroke-opacity="0.3" />
    <line x1="${contentX}" y1="${summaryStartY.toFixed(1)}" x2="${contentX}" y2="${(summaryStartY + summaryBoxH).toFixed(1)}" stroke="${colors.accent}" stroke-width="4" stroke-linecap="round" />
    ${summaryLines
      .map(
        (sLine, sIdx) =>
          `<text x="${contentX + 16}" y="${(summaryStartY + 24 + sIdx * summaryLineH).toFixed(1)}" fill="${colors.textSecondary}" ${textAttrs} font-style="italic" font-size="15" font-weight="500">${escapeXml(sLine)}</text>`
      )
      .join('\n    ')}
  </g>`
      : ''
  }

  <!-- 10. DESCRIÇÃO -->
  <g id="description-body">
    ${visibleDescLines
      .map(
        (dLine, dIdx) =>
          `<text x="${contentX}" y="${(descStartY + 18 + dIdx * descLineHeight).toFixed(1)}" fill="${colors.textColor}" ${textAttrs} font-size="${descFontSize}" font-weight="400" opacity="0.94">${escapeXml(dLine)}</text>`
      )
      .join('\n    ')}
    ${
      hasTruncated
        ? `<text x="${contentX}" y="${(descStartY + 18 + visibleDescLines.length * descLineHeight).toFixed(1)}" fill="${colors.accent}" ${textAttrs} font-size="14" font-weight="600">[...] Ver texto completo no registro do compêndio</text>`
        : ''
    }
  </g>

  <!-- 11. SEÇÕES EXTRAS (Discente, Verdadeiro, etc.) -->
  ${
    extraSections.length > 0
      ? `<g id="extra-sections">
    ${(() => {
      let secY = extraSectionStartY;
      return extraSections
        .map((sec) => {
          const top = secY;
          secY += sec.height;
          return `<g>
      <text x="${contentX}" y="${(top + 18).toFixed(1)}" fill="${sec.accentColor || colors.accent}" ${textAttrs} font-size="15" font-weight="800">${escapeXml(truncateText(sec.title, charsFor(innerW, 15, 0.6)))}</text>
      ${sec.lines
        .map(
          (sl, sli) =>
            `<text x="${contentX}" y="${(top + 40 + sli * extraLineH).toFixed(1)}" fill="${colors.textSecondary}" ${textAttrs} font-size="${extraFont}">${escapeXml(sl)}</text>`
        )
        .join('\n      ')}
    </g>`;
        })
        .join('\n    ');
    })()}
  </g>`
      : ''
  }

  <!-- 12. RODAPÉ INSTITUCIONAL ORDO REALITAS -->
  <g id="footer-branding">
    <line x1="${contentX}" y1="${(H - pad - footerReserve).toFixed(1)}" x2="${W - contentX}" y2="${(H - pad - footerReserve).toFixed(1)}" stroke="${colors.borderColor}" stroke-width="1.2" stroke-opacity="0.4" />
    <text x="${contentX}" y="${(H - pad - 42).toFixed(1)}" fill="${colors.textMuted}" ${textAttrs} font-size="13" font-style="italic" font-weight="500">"${escapeXml(truncateText(theme.motto, charsFor(innerW, 13, 0.5) - 2))}"</text>
    <text x="${contentX}" y="${(H - pad - 18).toFixed(1)}" fill="${colors.primary}" ${textAttrs} font-size="12" font-weight="900" letter-spacing="1.5">ORDO REALITAS • COMPÊNDIO OFICIAL</text>
    <text x="${W - contentX}" y="${(H - pad - 18).toFixed(1)}" fill="${colors.textMuted}" ${textAttrs} font-size="12" font-weight="700" letter-spacing="0.8" text-anchor="end" opacity="0.7">ORDO COMPANION</text>
  </g>
  </g>
</svg>
  `.trim();
}

