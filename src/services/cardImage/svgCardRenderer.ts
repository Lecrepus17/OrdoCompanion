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
  const words = text.replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n \n').split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (word === '\n') {
      if (currentLine) lines.push(currentLine);
      lines.push('');
      currentLine = '';
      continue;
    }
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
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
 * Renderizador de SVG de alta definição para Cartões de Registro do Compêndio
 */
export function generateCardSvg(
  data: RecordCardData,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): string {
  const width = options.width || 1080;
  const height = options.height || 1350;
  const { colors } = theme;

  const pad = 48;
  const contentWidth = width - pad * 2;
  const contentX = pad;

  // Quebra título
  const titleLines = wrapTextToLines(data.name, 28);
  const titleFontSize = titleLines.length > 2 ? 38 : titleLines.length === 2 ? 44 : 52;

  // Quebra descrição
  const descLines = wrapTextToLines(data.description, 54);
  const maxDescLines = 14;
  const visibleDescLines = descLines.slice(0, maxDescLines);
  const hasTruncated = descLines.length > maxDescLines;

  // Estatísticas (layout dinâmico)
  const statsList = data.stats.slice(0, 6);
  const statColumns = statsList.length > 3 ? 3 : statsList.length === 0 ? 1 : statsList.length;
  const statBoxWidth = Math.floor((contentWidth - (statColumns - 1) * 16) / statColumns);

  // Posições verticais calculadas
  let currentY = pad + 40;

  // Header badges (Categoria + Elemento + Fonte)
  const headerBadgesY = currentY;
  currentY += 46;

  // Título
  const titleStartY = currentY + titleFontSize * 0.9;
  currentY += titleLines.length * (titleFontSize * 1.15) + 16;

  // Linha divisória de acento
  const dividerY = currentY;
  currentY += 26;

  // Estatísticas Grid
  const statsStartY = currentY;
  const statRowsCount = Math.ceil(statsList.length / statColumns);
  const statRowHeight = 68;
  if (statsList.length > 0) {
    currentY += statRowsCount * (statRowHeight + 12) + 16;
  }

  // Resumo (se houver)
  const summaryLines = data.summary ? wrapTextToLines(data.summary, 50).slice(0, 3) : [];
  const summaryStartY = currentY;
  if (summaryLines.length > 0) {
    currentY += summaryLines.length * 24 + 32;
  }

  // Descrição
  const descStartY = currentY;
  const descLineHeight = 26;
  currentY += visibleDescLines.length * descLineHeight + 20;

  // Seções Extras (Discente, Atributos, etc.)
  const extraSections = (data.extraSections || []).slice(0, 2);
  const extraSectionStartY = currentY;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Gradiente de Fundo do Tema -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%" stop-color="${colors.bgGradientStart}" />
      <stop offset="100%" stop-color="${colors.bgGradientEnd}" />
    </linearGradient>

    <!-- Gradiente de Brilho Sutil no Topo -->
    <linearGradient id="header-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="${colors.accent}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${colors.secondary}" stop-opacity="0.8" />
    </linearGradient>

    <!-- Gradiente de Cards e Caixas de Estatísticas -->
    <linearGradient id="box-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${colors.surfaceBg}" />
      <stop offset="100%" stop-color="rgba(10, 10, 15, 0.85)" />
    </linearGradient>

    <!-- Filtro de Glow -->
    <filter id="blur-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="70" result="blur" />
    </filter>

    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- 1. FUNDO BASE -->
  <rect width="${width}" height="${height}" fill="url(#bg-grad)" />

  <!-- 2. PADRÃO PROCEDURAL DO ELEMENTO / TEMA -->
  ${renderPatternSvg(theme.patternType, colors, width, height)}

  <!-- 3. MOLDURA DUPLA DE SEGURANÇA -->
  <rect
    x="${pad - 12}"
    y="${pad - 12}"
    width="${width - (pad - 12) * 2}"
    height="${height - (pad - 12) * 2}"
    rx="18"
    fill="none"
    stroke="${colors.borderColor}"
    stroke-width="1.8"
    stroke-opacity="0.45"
  />
  <rect
    x="${pad}"
    y="${pad}"
    width="${contentWidth}"
    height="${height - pad * 2}"
    rx="12"
    fill="none"
    stroke="${colors.borderColor}"
    stroke-width="2.5"
    stroke-opacity="0.85"
  />

  <!-- 4. CANTONEIRAS ESTILIZADAS -->
  ${renderCornerBrackets(theme.cornerStyle, colors.accent, pad + 10, width, height)}

  <!-- 5. CABEÇALHO COM BADGES -->
  <g id="header-badges">
    <!-- Badge da Categoria -->
    <rect
      x="${contentX + 10}"
      y="${headerBadgesY}"
      width="170"
      height="34"
      rx="6"
      fill="${colors.badgeBg}"
      stroke="${colors.borderColor}"
      stroke-width="1.5"
    />
    <text
      x="${contentX + 95}"
      y="${headerBadgesY + 22}"
      fill="${colors.badgeText}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="13"
      font-weight="800"
      letter-spacing="1.2"
      text-anchor="middle"
    >${escapeXml((data.categoryLabel || data.category).toUpperCase())}</text>

    <!-- Badge de Elemento (se houver) -->
    ${
      data.element
        ? `
      <rect
        x="${contentX + 192}"
        y="${headerBadgesY}"
        width="155"
        height="34"
        rx="6"
        fill="${colors.badgeBg}"
        stroke="${colors.accent}"
        stroke-width="1.5"
      />
      <text
        x="${contentX + 270}"
        y="${headerBadgesY + 22}"
        fill="${colors.accent}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="13"
        font-weight="800"
        letter-spacing="1"
        text-anchor="middle"
      >${theme.elementGlyph} ${escapeXml(data.element.toUpperCase())}</text>
    `
        : ''
    }

    <!-- Fonte / Livro no Canto Superior Direito -->
    <text
      x="${width - pad - 16}"
      y="${headerBadgesY + 22}"
      fill="${colors.textMuted}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="14"
      font-weight="600"
      text-anchor="end"
      opacity="0.9"
    >${escapeXml(data.bookTitle || 'Compêndio Paranormal')}${data.pageNumber ? ` • Pág. ${data.pageNumber}` : ''}</text>
  </g>

  <!-- 6. TÍTULO DO REGISTRO -->
  <g id="card-title">
    ${titleLines
      .map(
        (line, idx) => `
      <text
        x="${contentX + 12}"
        y="${titleStartY + idx * (titleFontSize * 1.15)}"
        fill="${colors.textColor}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${titleFontSize}"
        font-weight="900"
        letter-spacing="0.5"
        filter="url(#shadow)"
      >${escapeXml(line)}</text>
    `
      )
      .join('')}

    ${
      data.subCategory && data.subCategory !== data.name
        ? `
      <text
        x="${contentX + 14}"
        y="${titleStartY + titleLines.length * (titleFontSize * 1.15) - 4}"
        fill="${colors.accent}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="16"
        font-weight="700"
        letter-spacing="1"
        opacity="0.9"
      >${escapeXml(data.subCategory.toUpperCase())}</text>
    `
        : ''
    }
  </g>

  <!-- 7. DIVISÓRIA COM GRADIENTE -->
  <line
    x1="${contentX + 10}"
    y1="${dividerY}"
    x2="${width - pad - 10}"
    y2="${dividerY}"
    stroke="url(#header-glow)"
    stroke-width="2.5"
    stroke-linecap="round"
  />

  <!-- 8. GRID DE ESTATÍSTICAS -->
  ${
    statsList.length > 0
      ? `
    <g id="stats-grid">
      ${statsList
        .map((st, i) => {
          const col = i % statColumns;
          const row = Math.floor(i / statColumns);
          const bx = contentX + 10 + col * (statBoxWidth + 16);
          const by = statsStartY + row * (statRowHeight + 12);
          const isHl = st.highlight;

          return `
          <g>
            <rect
              x="${bx}"
              y="${by}"
              width="${statBoxWidth}"
              height="${statRowHeight}"
              rx="8"
              fill="url(#box-grad)"
              stroke="${isHl ? colors.accent : colors.borderColor}"
              stroke-width="${isHl ? 1.8 : 1}"
              stroke-opacity="${isHl ? 0.9 : 0.4}"
            />
            <text
              x="${bx + 14}"
              y="${by + 24}"
              fill="${colors.textMuted}"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="12"
              font-weight="700"
              letter-spacing="0.8"
            >${escapeXml(st.label.toUpperCase())}</text>
            <text
              x="${bx + 14}"
              y="${by + 52}"
              fill="${isHl ? colors.accent : colors.textColor}"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="17"
              font-weight="800"
            >${escapeXml(st.value)}</text>
          </g>
        `;
        })
        .join('')}
    </g>
  `
      : ''
  }

  <!-- 9. RESUMO (ITÁLICO / DESTAQUE) -->
  ${
    summaryLines.length > 0
      ? `
    <g id="summary-box">
      <rect
        x="${contentX + 10}"
        y="${summaryStartY}"
        width="${contentWidth - 20}"
        height="${summaryLines.length * 24 + 20}"
        rx="6"
        fill="${colors.surfaceBg}"
        stroke="${colors.borderColor}"
        stroke-width="1"
        stroke-opacity="0.3"
      />
      <line
        x1="${contentX + 10}"
        y1="${summaryStartY}"
        x2="${contentX + 10}"
        y2="${summaryStartY + summaryLines.length * 24 + 20}"
        stroke="${colors.accent}"
        stroke-width="4"
        stroke-linecap="round"
      />
      ${summaryLines
        .map(
          (sLine, sIdx) => `
        <text
          x="${contentX + 26}"
          y="${summaryStartY + 24 + sIdx * 24}"
          fill="${colors.textSecondary}"
          font-family="system-ui, -apple-system, sans-serif"
          font-style="italic"
          font-size="15"
          font-weight="500"
        >${escapeXml(sLine)}</text>
      `
        )
        .join('')}
    </g>
  `
      : ''
  }

  <!-- 10. DESCRIÇÃO E CORPO -->
  <g id="description-body">
    ${visibleDescLines
      .map(
        (dLine, dIdx) => `
      <text
        x="${contentX + 12}"
        y="${descStartY + dIdx * descLineHeight}"
        fill="${colors.textColor}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="16"
        font-weight="400"
        line-height="24"
        opacity="0.94"
      >${escapeXml(dLine)}</text>
    `
      )
      .join('')}
    ${
      hasTruncated
        ? `
      <text
        x="${contentX + 12}"
        y="${descStartY + visibleDescLines.length * descLineHeight + 4}"
        fill="${colors.accent}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="14"
        font-weight="600"
      >[...] Ver texto completo no registro do compêndio</text>
    `
        : ''
    }
  </g>

  <!-- 11. SEÇÕES EXTRAS (Discente, Verdadeiro, etc.) -->
  ${
    extraSections.length > 0
      ? `
    <g id="extra-sections">
      ${extraSections
        .map((sec, secIdx) => {
          const secY = extraSectionStartY + secIdx * 64;
          const secLines = wrapTextToLines(sec.content, 54).slice(0, 2);
          return `
          <g>
            <text
              x="${contentX + 12}"
              y="${secY + 18}"
              fill="${sec.accentColor || colors.accent}"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="15"
              font-weight="800"
            >${escapeXml(sec.title)}</text>
            ${secLines
              .map(
                (sl, sli) => `
              <text
                x="${contentX + 12}"
                y="${secY + 38 + sli * 20}"
                fill="${colors.textSecondary}"
                font-family="system-ui, -apple-system, sans-serif"
                font-size="14"
              >${escapeXml(sl)}</text>
            `
              )
              .join('')}
          </g>
        `;
        })
        .join('')}
    </g>
  `
      : ''
  }

  <!-- 12. RODAPÉ INSTITUCIONAL ORDO REALITAS -->
  <g id="footer-branding">
    <!-- Linha Divisória Inferior -->
    <line
      x1="${contentX + 10}"
      y1="${height - pad - 68}"
      x2="${width - pad - 10}"
      y2="${height - pad - 68}"
      stroke="${colors.borderColor}"
      stroke-width="1.2"
      stroke-opacity="0.4"
    />

    <!-- Lema Temático do Fundo -->
    <text
      x="${contentX + 14}"
      y="${height - pad - 42}"
      fill="${colors.textMuted}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="13"
      font-style="italic"
      font-weight="500"
    >"${escapeXml(theme.motto)}"</text>

    <!-- Selo Ordo Realitas -->
    <text
      x="${contentX + 14}"
      y="${height - pad - 18}"
      fill="${colors.primary}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="12"
      font-weight="900"
      letter-spacing="1.5"
    >ORDO REALITAS • COMPÊNDIO OFICIAL</text>

    <!-- Marca d'água App -->
    <text
      x="${width - pad - 14}"
      y="${height - pad - 18}"
      fill="${colors.textMuted}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="12"
      font-weight="700"
      letter-spacing="0.8"
      text-anchor="end"
      opacity="0.7"
    >ORDO COMPANION</text>
  </g>
</svg>
  `.trim();
}
