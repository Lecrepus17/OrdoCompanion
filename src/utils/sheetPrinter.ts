import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { CharacterSheet, CompendiumEntity } from '../types/compendium';
import {
  BASE_FRONT_B64,
  BASE_BACK_B64,
  SH_FRONT_B64,
  SH_BACK_B64,
} from '../assets/sheetTemplates';

export type SheetType = 'livro_base' | 'sobrevivendo_horror';

export interface GenerateSheetOptions {
  character: CharacterSheet;
  sheetType?: SheetType;
  pages?: 'all' | 'front' | 'back';
  originEntity?: CompendiumEntity | null;
  classEntity?: CompendiumEntity | null;
  trackEntity?: CompendiumEntity | null;
}

export const OFFICIAL_SKILLS_PRINT: Array<{
  name: string;
  attr: 'AGI' | 'FOR' | 'INT' | 'PRE' | 'VIG';
  topPctBase: number;
  topPctSH: number;
  trainedOnly?: boolean;
  hasCustomName?: boolean;
}> = [
  { name: 'Acrobacia', attr: 'AGI', topPctBase: 19.80, topPctSH: 20.30 },
  { name: 'Adestramento', attr: 'PRE', topPctBase: 21.91, topPctSH: 22.41, trainedOnly: true },
  { name: 'Artes', attr: 'PRE', topPctBase: 24.02, topPctSH: 24.52, trainedOnly: true },
  { name: 'Atletismo', attr: 'FOR', topPctBase: 26.13, topPctSH: 26.63 },
  { name: 'Atualidades', attr: 'INT', topPctBase: 28.24, topPctSH: 28.74 },
  { name: 'Ciências', attr: 'INT', topPctBase: 30.35, topPctSH: 30.85, trainedOnly: true },
  { name: 'Crime', attr: 'AGI', topPctBase: 32.46, topPctSH: 32.96, trainedOnly: true },
  { name: 'Diplomacia', attr: 'PRE', topPctBase: 34.57, topPctSH: 35.07 },
  { name: 'Enganação', attr: 'PRE', topPctBase: 36.68, topPctSH: 37.18 },
  { name: 'Fortitude', attr: 'VIG', topPctBase: 38.79, topPctSH: 39.29 },
  { name: 'Furtividade', attr: 'AGI', topPctBase: 40.90, topPctSH: 41.40 },
  { name: 'Iniciativa', attr: 'AGI', topPctBase: 43.01, topPctSH: 43.51 },
  { name: 'Intimidação', attr: 'PRE', topPctBase: 45.12, topPctSH: 45.62 },
  { name: 'Intuição', attr: 'PRE', topPctBase: 47.23, topPctSH: 47.73 },
  { name: 'Investigação', attr: 'INT', topPctBase: 49.34, topPctSH: 49.84 },
  { name: 'Luta', attr: 'FOR', topPctBase: 51.45, topPctSH: 51.95 },
  { name: 'Medicina', attr: 'INT', topPctBase: 53.56, topPctSH: 54.06 },
  { name: 'Ocultismo', attr: 'INT', topPctBase: 55.67, topPctSH: 56.17, trainedOnly: true },
  { name: 'Percepção', attr: 'PRE', topPctBase: 57.78, topPctSH: 58.28 },
  { name: 'Pilotagem', attr: 'AGI', topPctBase: 59.89, topPctSH: 60.39, trainedOnly: true },
  { name: 'Pontaria', attr: 'AGI', topPctBase: 62.00, topPctSH: 62.50 },
  { name: 'Profissão', attr: 'INT', topPctBase: 64.11, topPctSH: 64.61, trainedOnly: true, hasCustomName: true },
  { name: 'Reflexos', attr: 'AGI', topPctBase: 66.22, topPctSH: 66.72 },
  { name: 'Religião', attr: 'PRE', topPctBase: 68.33, topPctSH: 68.83, trainedOnly: true },
  { name: 'Sobrevivência', attr: 'INT', topPctBase: 70.44, topPctSH: 70.94 },
  { name: 'Tática', attr: 'INT', topPctBase: 72.55, topPctSH: 73.05, trainedOnly: true },
  { name: 'Tecnologia', attr: 'INT', topPctBase: 74.66, topPctSH: 75.16, trainedOnly: true },
  { name: 'Vontade', attr: 'PRE', topPctBase: 76.77, topPctSH: 77.27 },
];

function escapeHtml(text?: string | number | null): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatPageRef(
  originPage?: string | null,
  fallbackBookId?: string,
  fallbackPage?: number
): string {
  if (fallbackPage) {
    const book = (fallbackBookId || '').toLowerCase().includes('horror') ? 'SH' : 'LB';
    return `${book} p. ${fallbackPage}`;
  }
  if (!originPage) return '';
  const text = originPage.trim();
  if (!text) return '';

  // Match existing references like "LB p. 24", "SH p. 30", "p. 45", "Página 120"
  const pageMatch = text.match(/(?:p(?:[áa]g(?:ina)?)?\.?\s*|#\s*)(\d+)/i) || text.match(/\b(\d+)\b/);
  if (pageMatch) {
    let book = 'LB';
    const lower = text.toLowerCase();
    if (lower.includes('horror') || lower.includes('sh')) book = 'SH';
    else if (lower.includes('arquivo') || lower.includes('as')) book = 'AS';
    return `${book} p. ${pageMatch[1]}`;
  }

  // If text mentions Origem, Trilha, Classe
  const lower = text.toLowerCase();
  if (lower.includes('origem')) return 'Origem';
  if (lower.includes('trilha')) return 'Trilha';
  if (lower.includes('classe')) return 'Classe';

  // Truncate to 7 chars max so it fits in the column
  return text.length > 7 ? text.slice(0, 7) : text;
}

export function getSkillTrainingRoman(rawDegree: unknown): string {
  if (rawDegree === null || rawDegree === undefined || rawDegree === '' || rawDegree === 0 || rawDegree === '0') {
    return '';
  }
  const num = typeof rawDegree === 'number' ? rawDegree : parseInt(String(rawDegree).replace(/[^\d]/g, ''), 10);
  if (num === 15 || num === 3) return 'III';
  if (num === 10 || num === 2) return 'II';
  if (num === 5 || num === 1) return 'I';

  const str = String(rawDegree).trim().toUpperCase();
  if (str === 'III' || str.includes('EXPERT')) return 'III';
  if (str === 'II' || str.includes('VETERANO')) return 'II';
  if (str === 'I' || str.includes('TREINADO')) return 'I';

  return '';
}

export function getSkillTotalBonus(rawDegree: unknown, otherBonus: number = 0): number {
  const num = typeof rawDegree === 'number' ? rawDegree : parseInt(String(rawDegree).replace(/[^\d]/g, ''), 10);
  let degreeVal = 0;
  if (num === 15 || num === 3) degreeVal = 15;
  else if (num === 10 || num === 2) degreeVal = 10;
  else if (num === 5 || num === 1) degreeVal = 5;
  return degreeVal + (otherBonus || 0);
}

export function generateSheetHtml(options: GenerateSheetOptions): string {
  const {
    character: char,
    sheetType = 'livro_base',
    pages = 'all',
    originEntity,
    classEntity,
    trackEntity,
  } = options;

  const isSH = sheetType === 'sobrevivendo_horror';
  const frontBg = isSH ? SH_FRONT_B64 : BASE_FRONT_B64;
  const backBg = isSH ? SH_BACK_B64 : BASE_BACK_B64;

  const originName = originEntity?.name || char.originId || '';
  const className = (classEntity?.name || char.classId || '').trim();
  let trackName = (trackEntity?.name || char.trackId || '').trim();

  // Strip duplicate class name from track (e.g., "Piloto de Drone (Especialista)" -> "Piloto de Drone")
  if (className && trackName) {
    trackName = trackName
      .replace(new RegExp(`\\s*\\(${className}\\)$`, 'i'), '')
      .trim();
    if (trackName.toLowerCase() === className.toLowerCase()) {
      trackName = '';
    }
  }
  trackName = trackName.replace(/\s*\((Combatente|Especialista|Ocultista|Sobrevivente)\)$/i, '').trim();

  const classDisplay = className ? (trackName ? `${className} (${trackName})` : className) : trackName;

  const peRodada = char.peRound || Math.max(1, Math.floor(char.nex / 5));
  const nivelCalculado = Math.max(1, Math.floor(char.nex / 5));
  const dtRitual = char.dtRituals || (10 + peRodada + (char.attributes?.PRE || 0));
  const totalDef =
    10 +
    (char.attributes?.AGI || 0) +
    (char.defenseEquip || 0) +
    (char.defenseOther || 0);

  const baseFor = char.attributes?.FOR || 0;
  const maxLoad = (baseFor <= 0 ? 2 : baseFor * 5) + (char.maxLoadBonus || 0);
  const curLoad = (char.inventory || []).reduce((acc, it) => acc + (it.spaces || 0), 0);

  // Collect abilities & rituals to display
  const allAbilities = [...(char.abilities || [])];

  // If origin has a power not yet listed in abilities, include it
  if (
    originEntity?.powerName &&
    !allAbilities.some((a) => a.name.toLowerCase() === originEntity.powerName?.toLowerCase())
  ) {
    const originBook = originEntity.bookId?.toLowerCase().includes('horror') ? 'SH' : 'LB';
    const originPageText = originEntity.pageNumber ? `${originBook} p. ${originEntity.pageNumber}` : 'Origem';
    allAbilities.unshift({
      id: 'origin_power',
      name: originEntity.powerName,
      cost: 'Passiva',
      originPage: originPageText,
      description: originEntity.powerDescription || originEntity.summary || '',
      type: 'poder',
    });
  }

  // Attacks list (up to 5)
  const attacksList = (char.attacks || []).slice(0, 5);

  // Inventory list (up to 22 items across 2 columns)
  const invList = char.inventory || [];
  const col1Items = invList.slice(0, 11);
  const col2Items = invList.slice(11, 22);

  // HTML content for Front Page
  const renderFrontPage = () => {
    if (isSH) {
      // SOBREVIVENDO AO HORROR - FRENTE
      return `
        <div class="sheet-page front-page" style="background-image: url('${frontBg}');">
          <!-- Personagem & Jogador (Posicionados precisamente dentro dos colchetes) -->
          <div class="field" style="left: 12.0%; top: 3.8%; width: 27.0%; height: 2.5%; font-weight: bold; font-size: 13px;">
            ${escapeHtml(char.name)}
          </div>
          <div class="field" style="left: 42.6%; top: 3.8%; width: 13.0%; height: 2.5%; font-size: 12px;">
            ${escapeHtml(char.player)}
          </div>

          <!-- Atributos Hexagonais (Centralizados na metade superior branca de cada hexágono) -->
          <div class="attr-val" style="left: 31.0%; top: 13.0%; width: 7.6%; height: 3.4%;">${char.attributes.AGI}</div>
          <div class="attr-val" style="left: 17.4%; top: 19.8%; width: 7.6%; height: 3.4%;">${char.attributes.FOR}</div>
          <div class="attr-val" style="left: 44.7%; top: 19.8%; width: 7.6%; height: 3.4%;">${char.attributes.INT}</div>
          <div class="attr-val" style="left: 21.2%; top: 32.2%; width: 7.6%; height: 3.4%;">${char.attributes.PRE}</div>
          <div class="attr-val" style="left: 40.6%; top: 32.2%; width: 7.6%; height: 3.4%;">${char.attributes.VIG}</div>

          <!-- Origem & Classe -->
          <div class="field" style="left: 21.5%; top: 44.3%; width: 32.5%; font-weight: 600; font-size: 12px;">
            ${escapeHtml(originName)}
          </div>
          <div class="field" style="left: 20.0%; top: 48.5%; width: 33.5%; font-weight: 600; font-size: 12px;">
            ${escapeHtml(classDisplay)}
          </div>

          <!-- Status Vitais Sobrevivendo ao Horror (Totais/Máximos preenchidos nos quadrados, Atuais vazios para anotação a lápis) -->
          <!-- Linha 1: PV e PD -->
          <div class="stat-box" style="left: 12.5%; top: 52.5%; width: 7.4%; height: 4.4%; color: #dc2626;">${char.pvMax}</div>
          <div class="stat-box" style="left: 35.4%; top: 52.5%; width: 6.9%; height: 4.4%; color: #9333ea;">${char.peMax}</div>

          <!-- Linha 2: PE e SAN -->
          <div class="stat-box" style="left: 12.5%; top: 60.5%; width: 7.3%; height: 4.4%; color: #d97706;">${char.peMax}</div>
          <div class="stat-box" style="left: 37.8%; top: 60.5%; width: 7.1%; height: 4.4%; color: #0284c7;">${char.sanMax}</div>

          <!-- Defesa (no escudo) e Decomposição (alinhado com as linhas) -->
          <div class="field center" style="left: 12.5%; top: 68.5%; width: 7.2%; height: 4.8%; font-weight: bold; font-size: 19px;">
            ${totalDef}
          </div>
          <div class="field center" style="left: 28.8%; top: 72.5%; width: 2.8%; font-size: 11px; font-weight: bold;">
            ${char.defenseEquip || 0}
          </div>
          <div class="field center" style="left: 32.8%; top: 72.5%; width: 2.8%; font-size: 11px; font-weight: bold;">
            ${char.defenseOther || 0}
          </div>

          <!-- Deslocamento (DESL ao lado da Defesa) -->
          <div class="field center" style="left: 44.7%; top: 68.6%; width: 9.0%; height: 3.7%; font-weight: bold; font-size: 12px;">
            ${escapeHtml(char.displacement || '9m (6□)')}
          </div>

          <!-- Proteção e Resistências -->
          <div class="field" style="left: 18.8%; top: 76.5%; width: 37.0%; font-size: 10.5px;">
            ${escapeHtml(char.protection || '')}
          </div>
          <div class="field" style="left: 21.3%; top: 78.8%; width: 34.5%; font-size: 10.5px;">
            ${escapeHtml(char.resistances || '')}
          </div>

          <!-- 28 Perícias Preenchidas (BÔNUS numérico, Treino I/II/III, Outros) -->
          ${OFFICIAL_SKILLS_PRINT.map((sk) => {
            const entry = char.skills?.[sk.name];
            const otherBonus = entry?.bonus || 0;
            const treinoText = getSkillTrainingRoman(entry?.degree);
            const totalBonus = getSkillTotalBonus(entry?.degree, otherBonus);

            const bonusText = totalBonus !== 0 ? String(totalBonus) : '';
            const outrosText = otherBonus !== 0 ? (otherBonus > 0 ? `+${otherBonus}` : `${otherBonus}`) : '';

            return `
              ${
                sk.hasCustomName && entry?.customName
                  ? `<div class="field" style="left: 67.5%; top: ${sk.topPctSH - 0.2}%; width: 6.8%; font-size: 8.5px; font-weight: 600;">
                      ${escapeHtml(entry.customName)}
                    </div>`
                  : ''
              }
              <!-- BÔNUS NUMÉRICO (ao lado do + impresso) -->
              ${
                bonusText
                  ? `<div class="field center" style="left: 78.8%; top: ${sk.topPctSH - 0.2}%; width: 3.4%; font-weight: bold; font-size: 10.5px; color: #0f172a;">
                      ${bonusText}
                    </div>`
                  : ''
              }
              <!-- TREINO (I, II ou III) -->
              ${
                treinoText
                  ? `<div class="field center" style="left: 83.0%; top: ${sk.topPctSH - 0.2}%; width: 3.6%; font-weight: bold; font-size: 11px; letter-spacing: 0.5px;">
                      ${treinoText}
                    </div>`
                  : ''
              }
              <!-- OUTROS -->
              ${
                outrosText
                  ? `<div class="field center" style="left: 87.5%; top: ${sk.topPctSH - 0.2}%; width: 3.6%; font-size: 10.5px; font-weight: 600;">
                      ${outrosText}
                    </div>`
                  : ''
              }
            `;
          }).join('')}

          <!-- Ataques (5 linhas) -->
          ${attacksList
            .map((atk, idx) => {
              const top = 84.6 + idx * 2.06;
              const critSpec = [atk.critical, atk.range, atk.special].filter(Boolean).join(' • ');
              return `
                <div class="field" style="left: 10.6%; top: ${top}%; width: 28.5%; font-weight: 600; font-size: 11px;">
                  ${escapeHtml(atk.name)}
                </div>
                <div class="field center" style="left: 40.2%; top: ${top}%; width: 10.4%; font-size: 10.5px;">
                  ${escapeHtml(atk.test)}
                </div>
                <div class="field center" style="left: 51.8%; top: ${top}%; width: 10.8%; font-weight: bold; font-size: 11px;">
                  ${escapeHtml(atk.damage)}
                </div>
                <div class="field" style="left: 63.9%; top: ${top}%; width: 29.5%; font-size: 9.5px;">
                  ${escapeHtml(critSpec)}
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    // LIVRO BASE - FRENTE
    return `
      <div class="sheet-page front-page" style="background-image: url('${frontBg}');">
        <!-- Personagem & Jogador (Posicionados dentro dos colchetes) -->
        <div class="field" style="left: 13.0%; top: 3.8%; width: 26.5%; height: 2.5%; font-weight: bold; font-size: 13px;">
          ${escapeHtml(char.name)}
        </div>
        <div class="field" style="left: 43.0%; top: 3.8%; width: 12.5%; height: 2.5%; font-size: 12px;">
          ${escapeHtml(char.player)}
        </div>

        <!-- Atributos Hexagonais (Centralizados na metade superior branca de cada hexágono) -->
        <div class="attr-val" style="left: 31.0%; top: 13.0%; width: 7.6%; height: 3.4%;">${char.attributes.AGI}</div>
        <div class="attr-val" style="left: 17.4%; top: 19.8%; width: 7.6%; height: 3.4%;">${char.attributes.FOR}</div>
        <div class="attr-val" style="left: 44.7%; top: 19.8%; width: 7.6%; height: 3.4%;">${char.attributes.INT}</div>
        <div class="attr-val" style="left: 21.2%; top: 32.2%; width: 7.6%; height: 3.4%;">${char.attributes.PRE}</div>
        <div class="attr-val" style="left: 40.6%; top: 32.2%; width: 7.6%; height: 3.4%;">${char.attributes.VIG}</div>

        <!-- Origem & Classe -->
        <div class="field" style="left: 23.5%; top: 44.1%; width: 33.0%; font-weight: 600; font-size: 12px;">
          ${escapeHtml(originName)}
        </div>
        <div class="field" style="left: 22.2%; top: 48.9%; width: 34.0%; font-weight: 600; font-size: 12px;">
          ${escapeHtml(classDisplay)}
        </div>

        <!-- NEX, PE / Rodada, Deslocamento -->
        <div class="field center" style="left: 18.0%; top: 53.5%; width: 4.2%; font-weight: bold; font-size: 14px;">
          ${char.nex}
        </div>
        <div class="field center" style="left: 26.0%; top: 53.5%; width: 6.5%; font-weight: bold; font-size: 14px;">
          ${peRodada}
        </div>
        <div class="field center" style="left: 42.0%; top: 53.5%; width: 14.0%; font-weight: 600; font-size: 12px;">
          ${escapeHtml(char.displacement || '9m (6□)')}
        </div>

        <!-- Status Vitais Livro Base (Totais/Máximos preenchidos nos quadrados, Atuais vazios para anotação a lápis) -->
        <div class="stat-box" style="left: 14.5%; top: 59.2%; width: 6.8%; height: 4.2%; color: #dc2626;">${char.pvMax}</div>
        <div class="stat-box" style="left: 36.8%; top: 59.2%; width: 6.4%; height: 4.2%; color: #d97706;">${char.peMax}</div>
        <div class="stat-box" style="left: 41.7%; top: 68.3%; width: 7.5%; height: 4.2%; color: #0284c7;">${char.sanMax}</div>

        <!-- Defesa (no escudo) e Decomposição (alinhado com as linhas) -->
        <div class="field center" style="left: 14.0%; top: 68.5%; width: 7.2%; height: 4.8%; font-weight: bold; font-size: 19px;">
          ${totalDef}
        </div>
        <div class="field center" style="left: 30.5%; top: 72.1%; width: 2.8%; font-size: 11px; font-weight: bold;">
          ${char.defenseEquip || 0}
        </div>
        <div class="field center" style="left: 34.5%; top: 72.1%; width: 2.8%; font-size: 11px; font-weight: bold;">
          ${char.defenseOther || 0}
        </div>

        <!-- Proteção e Resistências -->
        <div class="field" style="left: 20.5%; top: 76.1%; width: 36.5%; font-size: 10.5px;">
          ${escapeHtml(char.protection || '')}
        </div>
        <div class="field" style="left: 23.0%; top: 78.4%; width: 34.0%; font-size: 10.5px;">
          ${escapeHtml(char.resistances || '')}
        </div>

        <!-- 28 Perícias Preenchidas (BÔNUS numérico, Treino I/II/III, Outros) -->
        ${OFFICIAL_SKILLS_PRINT.map((sk) => {
          const entry = char.skills?.[sk.name];
          const otherBonus = entry?.bonus || 0;
          const treinoText = getSkillTrainingRoman(entry?.degree);
          const totalBonus = getSkillTotalBonus(entry?.degree, otherBonus);

          const bonusText = totalBonus !== 0 ? String(totalBonus) : '';
          const outrosText = otherBonus !== 0 ? (otherBonus > 0 ? `+${otherBonus}` : `${otherBonus}`) : '';

          return `
            ${
              sk.hasCustomName && entry?.customName
                ? `<div class="field" style="left: 69.5%; top: ${sk.topPctBase - 0.2}%; width: 6.8%; font-size: 8.5px; font-weight: 600;">
                    ${escapeHtml(entry.customName)}
                  </div>`
                : ''
            }
            <!-- BÔNUS NUMÉRICO (ao lado do + impresso) -->
            ${
              bonusText
                ? `<div class="field center" style="left: 82.0%; top: ${sk.topPctBase - 0.2}%; width: 3.4%; font-weight: bold; font-size: 10.5px; color: #0f172a;">
                    ${bonusText}
                  </div>`
                : ''
            }
            <!-- TREINO (I, II ou III) -->
            ${
              treinoText
                ? `<div class="field center" style="left: 86.6%; top: ${sk.topPctBase - 0.2}%; width: 3.6%; font-weight: bold; font-size: 11px; letter-spacing: 0.5px;">
                    ${treinoText}
                  </div>`
                : ''
            }
            <!-- OUTROS -->
            ${
              outrosText
                ? `<div class="field center" style="left: 91.1%; top: ${sk.topPctBase - 0.2}%; width: 3.6%; font-size: 10.5px; font-weight: 600;">
                    ${outrosText}
                  </div>`
                : ''
            }
          `;
        }).join('')}

        <!-- Ataques (5 linhas) -->
        ${attacksList
          .map((atk, idx) => {
            const top = 84.1 + idx * 2.06;
            const critSpec = [atk.critical, atk.range, atk.special].filter(Boolean).join(' • ');
            return `
              <div class="field" style="left: 12.3%; top: ${top}%; width: 28.5%; font-weight: 600; font-size: 11px;">
                ${escapeHtml(atk.name)}
              </div>
              <div class="field center" style="left: 41.8%; top: ${top}%; width: 10.5%; font-size: 10.5px;">
                ${escapeHtml(atk.test)}
              </div>
              <div class="field center" style="left: 53.5%; top: ${top}%; width: 10.8%; font-weight: bold; font-size: 11px;">
                ${escapeHtml(atk.damage)}
              </div>
              <div class="field" style="left: 65.6%; top: ${top}%; width: 29.5%; font-size: 9.5px;">
                ${escapeHtml(critSpec)}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  };

  // HTML content for Back Page
  const renderBackPage = () => {
    if (isSH) {
      // SOBREVIVENDO AO HORROR - VERSO
      return `
        <div class="sheet-page back-page" style="background-image: url('${backBg}');">
          <!-- Topo Esquerdo: EVOLUÇÃO DO PERSONAGEM -->
          <!-- NEX % -->
          <div class="field center" style="left: 13.8%; top: 7.2%; width: 7.2%; height: 3.6%; font-weight: bold; font-size: 13px;">
            ${char.nex}%
          </div>
          <!-- NÍVEL / NEX -->
          <div class="field center" style="left: 20.9%; top: 11.5%; width: 7.2%; height: 3.6%; font-weight: bold; font-size: 13px;">
            ${nivelCalculado}
          </div>
          <div class="field center" style="left: 30.2%; top: 11.5%; width: 7.2%; height: 3.6%; font-weight: bold; font-size: 13px;">
            ${char.nex}%
          </div>
          <!-- LIMITE DE PE / PD (Hexágono) -->
          <div class="field center" style="left: 40.9%; top: 7.2%; width: 8.9%; height: 7.7%; font-weight: 800; font-size: 18px;">
            ${peRodada}
          </div>
          <!-- PATENTE -->
          <div class="field center" style="left: 18.6%; top: 15.8%; width: 31.4%; height: 3.6%; font-weight: bold; font-size: 12px;">
            ${escapeHtml(char.rank || 'Recruta')}
          </div>

          <!-- Topo Direito: ANOTAÇÕES (Alinhado com as linhas pautadas) -->
          <div class="ruled-notes" style="left: 53.0%; top: 7.2%; width: 35.5%; height: 12.0%; line-height: 5.94mm; font-size: 9px;">
            ${escapeHtml(char.notes || [char.appearance, char.personality, char.history, char.objective].filter(Boolean).join(' • '))}
          </div>

          <!-- Seção Central: HABILIDADES & RITUAIS -->
          <!-- DT de Rituais (ao lado do título da seção) -->
          <div class="field center" style="left: 81.35%; top: 20.1%; width: 6.6%; height: 2.9%; font-weight: bold; font-size: 14.5px;">
            ${dtRitual}
          </div>

          <!-- Lista de Habilidades e Rituais (até 20 linhas centralizadas) -->
          ${allAbilities
            .slice(0, 20)
            .map((ab, idx) => {
              const top = 22.9 + idx * 2.00;
              return `
                <div class="field" style="left: 6.8%; top: ${top}%; width: 27.5%; font-weight: bold; font-size: 10px;">
                  ${escapeHtml(ab.name)}
                </div>
                <div class="field center" style="left: 34.6%; top: ${top}%; width: 6.8%; font-size: 9.5px;">
                  ${escapeHtml(ab.cost || '')}
                </div>
                <div class="field center" style="left: 41.9%; top: ${top}%; width: 5.5%; font-size: 8.5px;">
                  ${escapeHtml(formatPageRef(ab.originPage))}
                </div>
                <div class="field" style="left: 47.9%; top: ${top}%; width: 40.5%; font-size: 9.5px;">
                  ${escapeHtml(ab.description || '')}
                </div>
              `;
            })
            .join('')}

          <!-- Seção Inferior: INVENTÁRIO -->
          <!-- Pontos de Prestígio e Patente -->
          <div class="field center" style="left: 42.9%; top: 64.2%; width: 6.6%; height: 2.9%; font-weight: bold; font-size: 13px;">
            ${char.prestige || 0}
          </div>
          <div class="field center" style="left: 56.5%; top: 64.2%; width: 31.4%; height: 2.9%; font-weight: bold; font-size: 12px;">
            ${escapeHtml(char.rank || 'Recruta')}
          </div>

          <!-- Limites de Itens (I, II, III, IV) -->
          <div class="field center" style="left: 13.2%; top: 68.1%; width: 5.6%; height: 2.8%; font-weight: bold; font-size: 13px;">
            ${char.itemLimits?.cat1 ?? 2}
          </div>
          <div class="field center" style="left: 19.9%; top: 68.1%; width: 5.6%; height: 2.8%; font-weight: bold; font-size: 13px;">
            ${char.itemLimits?.cat2 ?? 0}
          </div>
          <div class="field center" style="left: 26.6%; top: 68.1%; width: 5.6%; height: 2.8%; font-weight: bold; font-size: 13px;">
            ${char.itemLimits?.cat3 ?? 0}
          </div>
          <div class="field center" style="left: 33.4%; top: 68.1%; width: 5.6%; height: 2.8%; font-weight: bold; font-size: 13px;">
            ${char.itemLimits?.cat4 ?? 0}
          </div>

          <!-- Limite de Crédito -->
          <div class="field center" style="left: 48.1%; top: 68.1%; width: 24.1%; height: 2.8%; font-weight: bold; font-size: 12px;">
            ${escapeHtml(char.creditLimit || 'Baixo')}
          </div>

          <!-- Carga Atual e Máxima -->
          <div class="field center" style="left: 78.4%; top: 68.1%; width: 5.0%; height: 2.8%; font-weight: bold; font-size: 12px;">
            ${curLoad}
          </div>
          <div class="field center" style="left: 84.1%; top: 68.1%; width: 5.0%; height: 2.8%; font-weight: bold; font-size: 12px;">
            ${maxLoad}
          </div>

          <!-- Itens do Inventário em 2 Colunas (até 11 por coluna) -->
          ${col1Items
            .map((it, idx) => {
              const top = 73.8 + idx * 2.00;
              return `
                <div class="field" style="left: 6.6%; top: ${top}%; width: 27.8%; font-size: 10px;">
                  ${escapeHtml(it.name)}
                </div>
                <div class="field center" style="left: 35.2%; top: ${top}%; width: 5.5%; font-size: 10px;">
                  ${escapeHtml(it.category || '0')}
                </div>
                <div class="field center" style="left: 41.4%; top: ${top}%; width: 5.5%; font-size: 10px;">
                  ${it.spaces || 1}
                </div>
              `;
            })
            .join('')}

          ${col2Items
            .map((it, idx) => {
              const top = 73.8 + idx * 2.00;
              return `
                <div class="field" style="left: 48.5%; top: ${top}%; width: 27.8%; font-size: 10px;">
                  ${escapeHtml(it.name)}
                </div>
                <div class="field center" style="left: 77.2%; top: ${top}%; width: 5.5%; font-size: 10px;">
                  ${escapeHtml(it.category || '0')}
                </div>
                <div class="field center" style="left: 83.4%; top: ${top}%; width: 5.5%; font-size: 10px;">
                  ${it.spaces || 1}
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    // LIVRO BASE - VERSO
    return `
      <div class="sheet-page back-page" style="background-image: url('${backBg}');">
        <!-- DT de Rituais (topo direito) -->
        <div class="field center" style="left: 80.0%; top: 3.3%; width: 6.5%; font-weight: bold; font-size: 14.5px;">
          ${dtRitual}
        </div>

        <!-- Habilidades & Rituais (até 20 linhas) -->
        ${allAbilities
          .slice(0, 20)
          .map((ab, idx) => {
            const top = 6.2 + idx * 2.00;
            return `
              <div class="field" style="left: 5.4%; top: ${top}%; width: 27.5%; font-weight: bold; font-size: 10px;">
                ${escapeHtml(ab.name)}
              </div>
              <div class="field center" style="left: 33.2%; top: ${top}%; width: 6.8%; font-size: 9.5px;">
                ${escapeHtml(ab.cost || '')}
              </div>
              <div class="field center" style="left: 40.5%; top: ${top}%; width: 5.5%; font-size: 8.5px;">
                ${escapeHtml(formatPageRef(ab.originPage))}
              </div>
              <div class="field" style="left: 46.5%; top: ${top}%; width: 41.0%; font-size: 9.5px;">
                ${escapeHtml(ab.description || '')}
              </div>
            `;
          })
          .join('')}

        <!-- Inventário Cabeçalho -->
        <div class="field center" style="left: 41.5%; top: 47.5%; width: 6.5%; font-weight: bold; font-size: 13px;">
          ${char.prestige || 0}
        </div>
        <div class="field center" style="left: 55.0%; top: 47.5%; width: 31.0%; font-weight: bold; font-size: 12px;">
          ${escapeHtml(char.rank || 'Recruta')}
        </div>

        <!-- Limite de Itens -->
        <div class="field center" style="left: 11.8%; top: 51.4%; width: 5.5%; font-weight: bold; font-size: 13px;">
          ${char.itemLimits?.cat1 ?? 2}
        </div>
        <div class="field center" style="left: 18.5%; top: 51.4%; width: 5.5%; font-weight: bold; font-size: 13px;">
          ${char.itemLimits?.cat2 ?? 0}
        </div>
        <div class="field center" style="left: 25.2%; top: 51.4%; width: 5.5%; font-weight: bold; font-size: 13px;">
          ${char.itemLimits?.cat3 ?? 0}
        </div>
        <div class="field center" style="left: 32.0%; top: 51.4%; width: 5.5%; font-weight: bold; font-size: 13px;">
          ${char.itemLimits?.cat4 ?? 0}
        </div>

        <!-- Limite de Crédito -->
        <div class="field center" style="left: 46.8%; top: 51.4%; width: 23.8%; font-weight: bold; font-size: 12px;">
          ${escapeHtml(char.creditLimit || 'Baixo')}
        </div>

        <!-- Carga Atual / Carga Máx -->
        <div class="field center" style="left: 77.0%; top: 51.4%; width: 5.0%; font-weight: bold; font-size: 12px;">
          ${curLoad}
        </div>
        <div class="field center" style="left: 82.8%; top: 51.4%; width: 5.0%; font-weight: bold; font-size: 12px;">
          ${maxLoad}
        </div>

        <!-- Inventário: Tabela 2 Colunas (até 11 itens por coluna) -->
        ${col1Items
          .map((it, idx) => {
            const top = 56.8 + idx * 2.00;
            return `
              <div class="field" style="left: 5.2%; top: ${top}%; width: 28.0%; font-size: 10px;">
                ${escapeHtml(it.name)}
              </div>
              <div class="field center" style="left: 33.8%; top: ${top}%; width: 5.5%; font-size: 10px;">
                ${escapeHtml(it.category || '0')}
              </div>
              <div class="field center" style="left: 40.0%; top: ${top}%; width: 5.5%; font-size: 10px;">
                ${it.spaces || 1}
              </div>
            `;
          })
          .join('')}

        ${col2Items
          .map((it, idx) => {
            const top = 56.8 + idx * 2.00;
            return `
              <div class="field" style="left: 47.5%; top: ${top}%; width: 28.0%; font-size: 10px;">
                ${escapeHtml(it.name)}
              </div>
              <div class="field center" style="left: 76.2%; top: ${top}%; width: 5.5%; font-size: 10px;">
                ${escapeHtml(it.category || '0')}
              </div>
              <div class="field center" style="left: 82.3%; top: ${top}%; width: 5.5%; font-size: 10px;">
                ${it.spaces || 1}
              </div>
            `;
          })
          .join('')}

        <!-- Livro Base: Descrição (Aparência, Personalidade, Histórico, Objetivo alinhados exatamente com as linhas pautadas) -->
        <div class="ruled-desc" style="left: 5.5%; width: 18.5%;">
          ${escapeHtml(char.appearance || '')}
        </div>
        <div class="ruled-desc" style="left: 25.5%; width: 21.0%;">
          ${escapeHtml(char.personality || '')}
        </div>
        <div class="ruled-desc" style="left: 48.0%; width: 21.0%;">
          ${escapeHtml(char.history || '')}
        </div>
        <div class="ruled-desc" style="left: 70.0%; width: 17.5%;">
          ${escapeHtml(char.objective || '')}
        </div>
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha de Agente - ${escapeHtml(char.name || 'Ordem Paranormal')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #111827;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .sheet-page {
      position: relative;
      width: 210mm;
      height: 297mm;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .field {
      position: absolute;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      color: #0f172a;
    }
    .center {
      justify-content: center;
      text-align: center;
    }
    .attr-val {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 24px;
      color: #09090b;
      letter-spacing: -0.5px;
    }
    .stat-box {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 17px;
    }
    .stat-box-max {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13.5px;
      color: #1e293b;
    }
    .ruled-desc {
      position: absolute;
      top: 84.1%;
      height: 11.5%;
      overflow: hidden;
      font-size: 9.5px;
      line-height: 5.94mm;
      color: #1e293b;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .ruled-notes {
      position: absolute;
      overflow: hidden;
      color: #1e293b;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media print {
      body {
        background: transparent !important;
        gap: 0 !important;
        padding: 0 !important;
      }
      .sheet-page {
        width: 100vw !important;
        height: 100vh !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .back-page {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  ${pages === 'all' || pages === 'front' ? renderFrontPage() : ''}
  ${pages === 'all' || pages === 'back' ? renderBackPage() : ''}
</body>
</html>
  `.trim();
}

/**
 * Execute native or browser printing of the sheet
 */
export async function printCharacterSheet(options: GenerateSheetOptions): Promise<void> {
  const html = generateSheetHtml(options);

  if (Platform.OS === 'web') {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Não foi possível inicializar iframe de impressão');
      }

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 3000);
      }, 500);
    } catch (e) {
      console.warn('Fallback to opening printable window:', e);
      openPrintableTab(options);
    }
  } else {
    // Native mobile (Expo Print)
    await Print.printAsync({ html });
  }
}

/**
 * Opens the printable sheet in a new browser tab
 */
export function openPrintableTab(options: GenerateSheetOptions): void {
  if (Platform.OS !== 'web') {
    printCharacterSheet(options);
    return;
  }

  const html = generateSheetHtml(options);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
