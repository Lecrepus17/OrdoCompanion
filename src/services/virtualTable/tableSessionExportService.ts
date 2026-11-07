import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import {
  TableCombatState,
  TableParticipant,
  TableRollEvent,
  TableSceneBroadcast,
  VirtualTableRoomState,
} from '../../types/virtualTable';

interface FileSystemCompat {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  Paths?: {
    cache?: { uri?: string };
    document?: { uri?: string };
  };
  writeAsStringAsync?: (
    uri: string,
    contents: string,
    options?: any
  ) => Promise<void>;
}

const fs = FileSystem as unknown as FileSystemCompat;

function getCacheDirectory(): string | null {
  return fs.cacheDirectory || fs.Paths?.cache?.uri || null;
}

function getDocumentDirectory(): string | null {
  return fs.documentDirectory || fs.Paths?.document?.uri || null;
}

export interface TableSessionLogExport {
  exportMetadata: {
    formatVersion: '1.0';
    appVersion: string;
    exportedAt: string;
    roomId: string;
    sessionTitle: string;
    campaignTitle?: string;
    master: {
      userId: string;
      userName: string;
    };
  };
  metrics: {
    totalRolls: number;
    criticalHits: number;
    fumbles: number;
    totalDamageDealt: number;
    totalDamageSufferedByAgents: number;
    totalCombatants: number;
    activeRound: number;
    cluesFound: number;
    totalClues: number;
  };
  squadStatus: Array<{
    userId: string;
    userName: string;
    role: string;
    isOnline: boolean;
    agent?: {
      id: string;
      name: string;
      player: string;
      classTitle: string;
      nex: number;
      rank: string;
      pvCurrent: number;
      pvMax: number;
      damageSuffered: number;
      peCurrent: number;
      peMax: number;
      sanCurrent: number;
      sanMax: number;
      defense: number;
      conditions: string[];
    };
  }>;
  combatTrack: {
    isActive: boolean;
    round: number;
    currentTurnIndex: number;
    currentTurnCombatant?: string;
    entries: Array<{
      id: string;
      name: string;
      type: 'agent' | 'monster' | 'custom';
      initiative: number;
      pvCurrent?: number;
      pvMax?: number;
      damageSuffered?: number;
      isDefeated?: boolean;
      isHidden?: boolean;
      notes?: string;
    }>;
  };
  sceneEvents: {
    activeScene?: {
      id: string;
      title: string;
      summary: string;
      details?: string;
      broadcastedAt: string;
      clues: Array<{
        id: string;
        text: string;
        isFound: boolean;
      }>;
    };
  };
  rollLogs: Array<{
    id: string;
    timestamp: string;
    senderId: string;
    senderName: string;
    characterName?: string;
    actionType: string;
    label: string;
    formula: string;
    diceResults: number[];
    chosenDie?: number;
    bonus: number;
    total: number;
    isCritical?: boolean;
    isFumble?: boolean;
    isSecret?: boolean;
    details?: string;
  }>;
}

/**
 * Constrói o objeto estruturado de exportação da sessão da Mesa Virtual
 */
export function buildTableSessionExportData(
  roomState: VirtualTableRoomState,
  rollEvents: TableRollEvent[],
  campaignTitle?: string
): TableSessionLogExport {
  const participants = Object.values(roomState.participants || {});
  const rolls = rollEvents || roomState.recentRolls || [];

  // Métricas de rolagens
  let criticalHits = 0;
  let fumbles = 0;
  let totalDamageDealt = 0;

  rolls.forEach((r) => {
    if (r.isCritical) criticalHits++;
    if (r.isFumble) fumbles++;
    if (r.actionType === 'damage' || r.label.toLowerCase().includes('dano')) {
      totalDamageDealt += Math.max(0, r.total || 0);
    }
  });

  // Métricas de dano sofrido pelos agentes
  let totalDamageSufferedByAgents = 0;
  const squadStatus = participants.map((p) => {
    if (!p.agent) {
      return {
        userId: p.userId,
        userName: p.userName,
        role: p.role,
        isOnline: p.isOnline,
      };
    }

    const ag = p.agent;
    const damageSuffered = Math.max(0, (ag.pvMax || 0) - (ag.pvCurrent || 0));
    totalDamageSufferedByAgents += damageSuffered;

    return {
      userId: p.userId,
      userName: p.userName,
      role: p.role,
      isOnline: p.isOnline,
      agent: {
        id: ag.id,
        name: ag.name,
        player: ag.player,
        classTitle: ag.classTitle,
        nex: ag.nex,
        rank: ag.rank,
        pvCurrent: ag.pvCurrent,
        pvMax: ag.pvMax,
        damageSuffered,
        peCurrent: ag.peCurrent,
        peMax: ag.peMax,
        sanCurrent: ag.sanCurrent,
        sanMax: ag.sanMax,
        defense: ag.defense,
        conditions: ag.conditions || [],
      },
    };
  });

  // Trilha de combate e combatente ativo
  const combatEntries = (roomState.combat?.entries || []).map((entry) => {
    const damageSuffered =
      entry.pvMax !== undefined && entry.pvCurrent !== undefined
        ? Math.max(0, entry.pvMax - entry.pvCurrent)
        : undefined;

    return {
      id: entry.id,
      name: entry.name,
      type: entry.type,
      initiative: entry.initiative,
      pvCurrent: entry.pvCurrent,
      pvMax: entry.pvMax,
      damageSuffered,
      isDefeated: entry.isDefeated,
      isHidden: entry.isHidden,
      notes: entry.notes,
    };
  });

  const activeTurnIndex = roomState.combat?.currentTurnIndex ?? 0;
  const currentTurnCombatant = combatEntries[activeTurnIndex]?.name;

  // Pistas e Cenas
  const activeScene = roomState.activeScene;
  const clues = activeScene?.clues || [];
  const cluesFound = clues.filter((c) => c.isFound).length;

  return {
    exportMetadata: {
      formatVersion: '1.0',
      appVersion: '1.1.0',
      exportedAt: new Date().toISOString(),
      roomId: roomState.roomId,
      sessionTitle: roomState.title || `Mesa ${roomState.roomId}`,
      campaignTitle: campaignTitle || undefined,
      master: {
        userId: roomState.masterId,
        userName: roomState.masterName,
      },
    },
    metrics: {
      totalRolls: rolls.length,
      criticalHits,
      fumbles,
      totalDamageDealt,
      totalDamageSufferedByAgents,
      totalCombatants: combatEntries.length,
      activeRound: roomState.combat?.round || 1,
      cluesFound,
      totalClues: clues.length,
    },
    squadStatus,
    combatTrack: {
      isActive: roomState.combat?.isActive || false,
      round: roomState.combat?.round || 1,
      currentTurnIndex: activeTurnIndex,
      currentTurnCombatant,
      entries: combatEntries,
    },
    sceneEvents: {
      activeScene: activeScene
        ? {
            id: activeScene.id,
            title: activeScene.title,
            summary: activeScene.summary,
            details: activeScene.details,
            broadcastedAt: activeScene.broadcastedAt,
            clues: clues.map((c) => ({
              id: c.id,
              text: c.text,
              isFound: c.isFound,
            })),
          }
        : undefined,
    },
    rollLogs: rolls.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      senderId: r.senderId,
      senderName: r.senderName,
      characterName: r.characterName,
      actionType: r.actionType,
      label: r.label,
      formula: r.formula,
      diceResults: r.diceResults || [],
      chosenDie: r.chosenDie,
      bonus: r.bonus || 0,
      total: r.total,
      isCritical: r.isCritical,
      isFumble: r.isFumble,
      isSecret: r.isSecret,
      details: r.details,
    })),
  };
}

/**
 * Gera documento HTML tático estilizado para exportação em PDF
 */
export function generateTacticalPdfHtml(data: TableSessionLogExport): string {
  const meta = data.exportMetadata;
  const metrics = data.metrics;
  const formattedDate = new Date(meta.exportedAt).toLocaleString('pt-BR');

  // Linhas dos Agentes
  const agentsRows = data.squadStatus
    .filter((p) => p.agent)
    .map((p) => {
      const ag = p.agent!;
      const conditionsStr =
        ag.conditions.length > 0
          ? ag.conditions.map((c) => `<span class="badge badge-cond">${escapeHtml(c)}</span>`).join(' ')
          : '<span class="text-muted">Nenhuma</span>';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(ag.name)}</strong>
            <div class="subtext">Jogador: ${escapeHtml(p.userName)} • ${escapeHtml(ag.classTitle)} (${ag.nex}%)</div>
          </td>
          <td class="center font-mono">
            <span class="pv-val">${ag.pvCurrent}/${ag.pvMax}</span>
            ${ag.damageSuffered > 0 ? `<div class="subtext text-danger">-${ag.damageSuffered} sofridos</div>` : ''}
          </td>
          <td class="center font-mono text-pe">${ag.peCurrent}/${ag.peMax}</td>
          <td class="center font-mono text-san">${ag.sanCurrent}/${ag.sanMax}</td>
          <td class="center font-mono text-def">${ag.defense}</td>
          <td>${conditionsStr}</td>
        </tr>
      `;
    })
    .join('');

  // Linhas da Trilha de Combate
  const combatRows = data.combatTrack.entries
    .map((entry, idx) => {
      const isCurrent = idx === data.combatTrack.currentTurnIndex && data.combatTrack.isActive;
      const typeBadge =
        entry.type === 'monster'
          ? '<span class="badge badge-monster">AMEAÇA</span>'
          : '<span class="badge badge-agent">AGENTE</span>';

      return `
        <tr class="${isCurrent ? 'row-current' : ''}">
          <td class="center font-mono">#${idx + 1}</td>
          <td>
            <strong>${escapeHtml(entry.name)}</strong>
            ${isCurrent ? '<span class="badge badge-turn">TURNO ATUAL</span>' : ''}
          </td>
          <td class="center">${typeBadge}</td>
          <td class="center font-mono font-bold">${entry.initiative}</td>
          <td class="center font-mono">
            ${
              entry.pvMax !== undefined
                ? `${entry.pvCurrent ?? entry.pvMax}/${entry.pvMax} ${
                    (entry.damageSuffered || 0) > 0
                      ? `<span class="subtext text-danger">(-${entry.damageSuffered})</span>`
                      : ''
                  }`
                : '<span class="text-muted">—</span>'
            }
          </td>
          <td>${entry.notes ? escapeHtml(entry.notes) : '<span class="text-muted">—</span>'}</td>
        </tr>
      `;
    })
    .join('');

  // Pistas da Cena Ativa
  const scene = data.sceneEvents.activeScene;
  const cluesList = scene?.clues
    .map(
      (clue) => `
        <div class="clue-item ${clue.isFound ? 'clue-found' : 'clue-hidden'}">
          <span class="clue-icon">${clue.isFound ? '✓' : '✗'}</span>
          <span>${escapeHtml(clue.text)}</span>
          <span class="badge ${clue.isFound ? 'badge-success' : 'badge-muted'}">
            ${clue.isFound ? 'DESCOBERTA' : 'OCULTA'}
          </span>
        </div>
      `
    )
    .join('');

  // Linhas das Rolagens de Dados
  const rollsRows = data.rollLogs
    .map((roll) => {
      const isCrit = roll.isCritical;
      const isFumble = roll.isFumble;
      const resultClass = isCrit ? 'total-crit' : isFumble ? 'total-fumble' : 'total-normal';

      const tagCrit = isCrit ? '<span class="badge badge-crit">CRÍTICO</span>' : '';
      const tagFumble = isFumble ? '<span class="badge badge-fumble">DESASTRE</span>' : '';

      return `
        <tr class="${isCrit ? 'row-crit' : isFumble ? 'row-fumble' : ''}">
          <td class="font-mono text-muted subtext">${escapeHtml(roll.timestamp || '')}</td>
          <td>
            <strong>${escapeHtml(roll.characterName || roll.senderName)}</strong>
          </td>
          <td>
            <div>${escapeHtml(roll.label)}</div>
            <div class="subtext text-muted">${escapeHtml(roll.actionType.toUpperCase())}</div>
          </td>
          <td class="font-mono subtext">${escapeHtml(roll.formula)}</td>
          <td class="font-mono subtext">[${roll.diceResults.join(', ')}] ${roll.bonus ? `(${roll.bonus > 0 ? `+${roll.bonus}` : roll.bonus})` : ''}</td>
          <td class="center font-mono ${resultClass}">
            ${roll.total} ${tagCrit} ${tagFumble}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Resumo Tático da Sessão - ${escapeHtml(meta.sessionTitle)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0A0A0C;
          color: #E2E8F0;
          padding: 24px;
          line-height: 1.4;
          font-size: 12px;
        }
        .header {
          border-bottom: 2px solid #DC2626;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-title-box h1 {
          font-size: 20px;
          color: #FFFFFF;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .header-title-box h2 {
          font-size: 13px;
          color: #DC2626;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .header-meta {
          text-align: right;
          font-size: 11px;
          color: #94A3B8;
        }
        .header-meta strong { color: #FFFFFF; }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .metric-card {
          background-color: #131722;
          border: 1px solid #1E293B;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        .metric-val {
          font-size: 18px;
          font-weight: 800;
          color: #F8FAFC;
          font-family: monospace;
        }
        .metric-label {
          font-size: 9px;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 800;
          color: #F1F5F9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-left: 3px solid #DC2626;
          padding-left: 8px;
          margin: 18px 0 8px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          background-color: #131722;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #1E293B;
        }
        th {
          background-color: #1A202C;
          color: #94A3B8;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #2D3748;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #1E293B;
          font-size: 11px;
        }
        tr:last-child td { border-bottom: none; }
        
        .center { text-align: center; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 700; }
        .subtext { font-size: 10px; color: #94A3B8; }
        .text-muted { color: #64748B; }
        .text-danger { color: #EF4444; font-weight: bold; }
        .text-pe { color: #F59E0B; font-weight: bold; }
        .text-san { color: #38BDF8; font-weight: bold; }
        .text-def { color: #10B981; font-weight: bold; }
        .pv-val { color: #EF4444; font-weight: bold; }

        .badge {
          display: inline-block;
          font-size: 8px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .badge-cond { background-color: rgba(239, 68, 68, 0.2); color: #EF4444; border: 1px solid #EF4444; }
        .badge-monster { background-color: rgba(220, 38, 38, 0.2); color: #DC2626; }
        .badge-agent { background-color: rgba(59, 130, 246, 0.2); color: #60A5FA; }
        .badge-turn { background-color: #10B981; color: #FFFFFF; margin-left: 4px; }
        .badge-crit { background-color: #F59E0B; color: #000; font-weight: 900; }
        .badge-fumble { background-color: #EF4444; color: #FFFFFF; font-weight: 900; }
        .badge-success { background-color: rgba(16, 185, 129, 0.2); color: #10B981; }
        .badge-muted { background-color: rgba(100, 116, 139, 0.2); color: #94A3B8; }

        .row-current { background-color: rgba(16, 185, 129, 0.08); }
        .row-crit { background-color: rgba(245, 158, 11, 0.06); }
        .row-fumble { background-color: rgba(239, 68, 68, 0.06); }

        .total-crit { color: #F59E0B; font-weight: 900; }
        .total-fumble { color: #EF4444; font-weight: 900; }
        .total-normal { color: #F8FAFC; font-weight: 800; }

        .scene-box {
          background-color: #131722;
          border: 1px solid #1E293B;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .scene-title { font-size: 13px; font-weight: 800; color: #A78BFA; margin-bottom: 4px; }
        .scene-summary { font-size: 11px; color: #CBD5E1; margin-bottom: 8px; font-style: italic; }
        .scene-details { font-size: 11px; color: #94A3B8; line-height: 1.5; margin-bottom: 10px; }

        .clue-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 4px;
          background-color: #1A202C;
          margin-top: 4px;
          font-size: 11px;
        }
        .clue-found { border-left: 3px solid #10B981; }
        .clue-hidden { border-left: 3px solid #64748B; opacity: 0.7; }
        .clue-icon { font-weight: bold; width: 14px; text-align: center; }

        .footer {
          margin-top: 24px;
          border-top: 1px solid #1E293B;
          padding-top: 12px;
          text-align: center;
          font-size: 10px;
          color: #64748B;
        }
      </style>
    </head>
    <body>
      <!-- CABEÇALHO TÁTICO -->
      <div class="header">
        <div class="header-title-box">
          <h1>ORDO REALITAS • DOSSIÊ DE MISSÃO</h1>
          <h2>MESA VIRTUAL [${escapeHtml(meta.roomId)}] — ${escapeHtml(meta.sessionTitle)}</h2>
        </div>
        <div class="header-meta">
          <div>Mestre: <strong>${escapeHtml(meta.master.userName)}</strong></div>
          ${meta.campaignTitle ? `<div>Campanha: <strong>${escapeHtml(meta.campaignTitle)}</strong></div>` : ''}
          <div>Exportado em: <strong>${formattedDate}</strong></div>
        </div>
      </div>

      <!-- PAINEL DE MÉTRICAS -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-val">${metrics.totalRolls}</div>
          <div class="metric-label">Rolagens de Dados</div>
        </div>
        <div class="metric-card">
          <div class="metric-val text-pe">${metrics.criticalHits} / ${metrics.fumbles}</div>
          <div class="metric-label">Críticos / Desastres</div>
        </div>
        <div class="metric-card">
          <div class="metric-val text-danger">-${metrics.totalDamageSufferedByAgents} PV</div>
          <div class="metric-label">Dano Sofrido (Agentes)</div>
        </div>
        <div class="metric-card">
          <div class="metric-val text-san">${metrics.cluesFound}/${metrics.totalClues}</div>
          <div class="metric-label">Pistas Encontradas</div>
        </div>
      </div>

      <!-- SEÇÃO 1: ESQUADRÃO DE AGENTES -->
      <div class="section-title">Status do Esquadrão & Agentes</div>
      ${
        agentsRows.length > 0
          ? `
            <table>
              <thead>
                <tr>
                  <th>Agente / Jogador</th>
                  <th class="center">PV (Vida)</th>
                  <th class="center">PE (Esforço)</th>
                  <th class="center">SAN (Sanidade)</th>
                  <th class="center">DEF</th>
                  <th>Condições Ativas</th>
                </tr>
              </thead>
              <tbody>
                ${agentsRows}
              </tbody>
            </table>
          `
          : '<p class="text-muted" style="margin-bottom: 14px;">Nenhum agente vinculado aos participantes na sessão.</p>'
      }

      <!-- SEÇÃO 2: TRILHA DE INICIATIVA & COMBATE -->
      <div class="section-title">Trilha de Iniciativa & Combate (Rodada ${data.combatTrack.round})</div>
      ${
        combatRows.length > 0
          ? `
            <table>
              <thead>
                <tr>
                  <th class="center" style="width: 35px;">Ordem</th>
                  <th>Combatente</th>
                  <th class="center" style="width: 70px;">Tipo</th>
                  <th class="center" style="width: 50px;">Iniciativa</th>
                  <th class="center" style="width: 100px;">Pontos de Vida</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                ${combatRows}
              </tbody>
            </table>
          `
          : '<p class="text-muted" style="margin-bottom: 14px;">Nenhuma trilha de iniciativa ativa registrada nesta sessão.</p>'
      }

      <!-- SEÇÃO 3: CENAS & INVESTIGAÇÃO -->
      ${
        scene
          ? `
            <div class="section-title">Cena Ativa & Pistas Investigadas</div>
            <div class="scene-box">
              <div class="scene-title">${escapeHtml(scene.title)}</div>
              <div class="scene-summary">${escapeHtml(scene.summary)}</div>
              ${scene.details ? `<div class="scene-details">${escapeHtml(scene.details)}</div>` : ''}
              ${
                cluesList && cluesList.length > 0
                  ? `<div style="margin-top: 8px;"><strong>Pistas Mapeadas:</strong>${cluesList}</div>`
                  : ''
              }
            </div>
          `
          : ''
      }

      <!-- SEÇÃO 4: HISTÓRICO DE ROLAGENS (LOGS) -->
      <div class="section-title">Registro Cronológico de Rolagens & Ações (${data.rollLogs.length})</div>
      ${
        rollsRows.length > 0
          ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 65px;">Horário</th>
                  <th style="width: 120px;">Remetente</th>
                  <th>Ação / Teste</th>
                  <th style="width: 80px;">Fórmula</th>
                  <th style="width: 120px;">Dados Rolados</th>
                  <th class="center" style="width: 80px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rollsRows}
              </tbody>
            </table>
          `
          : '<p class="text-muted">Nenhuma rolagem registrada nesta sessão.</p>'
      }

      <!-- RODAPÉ DE AUTENTICAÇÃO -->
      <div class="footer">
        Dossiê confidencial gerado pelo Ordo Companion • Arquivos Oficiais da Ordo Realitas • Uso exclusivo do Mestre da Sessão
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Exporta os dados da sessão como arquivo JSON e compartilha via Expo Sharing
 */
export async function exportSessionToJsonFile(
  exportData: TableSessionLogExport
): Promise<{ success: boolean; uri?: string; filename: string; error?: string }> {
  const jsonString = JSON.stringify(exportData, null, 2);
  const roomId = exportData.exportMetadata.roomId || 'SESSAO';
  const cleanDate = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ordo_sessao_${roomId}_${cleanDate}.json`;

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    const baseDir = getCacheDirectory() || getDocumentDirectory() || 'file:///mock-cache/';
    const fileUri = `${baseDir}${filename}`;

    if (fs.writeAsStringAsync && baseDir) {
      await fs.writeAsStringAsync(fileUri, jsonString, {
        encoding: 'utf8',
      });
    }

    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `Exportar Histórico da Sessão ${roomId}`,
        UTI: 'public.json',
      });
      return { success: true, uri: fileUri, filename };
    }

    // Fallback Web: se não houver Sharing nativo disponível, dispara download direto via Blob
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return { success: true, uri: blobUrl, filename };
    }

    return { success: true, uri: fileUri, filename };
  } catch (err: any) {
    console.error('[tableSessionExportService] Erro ao exportar JSON:', err);
    return { success: false, filename, error: err?.message || 'Falha ao exportar JSON' };
  }
}

/**
 * Gera o resumo tático em PDF via Expo Print e compartilha via Expo Sharing
 */
export async function exportSessionToPdfFile(
  exportData: TableSessionLogExport
): Promise<{ success: boolean; uri?: string; filename: string; error?: string }> {
  const html = generateTacticalPdfHtml(exportData);
  const roomId = exportData.exportMetadata.roomId || 'SESSAO';
  const cleanDate = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ordo_resumo_tatico_${roomId}_${cleanDate}.pdf`;

  try {
    const printResult = await Print.printToFileAsync({ html });
    const pdfUri = printResult.uri;

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Resumo Tático da Sessão ${roomId} (PDF)`,
        UTI: 'com.adobe.pdf',
      });
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(pdfUri, '_blank');
    } else {
      await Share.share({ url: pdfUri, title: `Resumo Tático da Sessão ${roomId}` });
    }

    return { success: true, uri: pdfUri, filename };
  } catch (err: any) {
    console.error('[tableSessionExportService] Erro ao exportar PDF:', err);
    return { success: false, filename, error: err?.message || 'Falha ao gerar PDF' };
  }
}
