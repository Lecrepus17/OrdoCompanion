import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMaxStats,
  calculateStatIncreases,
  getEffortCurrent,
  getEffortMax,
  getEffortResourceLabel,
  isUsingDeterminationPoints,
} from '../src/utils/progression';
import { CharacterSheet } from '../src/types/compendium';
import { snapshotFromSheet } from '../src/types/virtualTable';
import {
  encodeAgentShareCode,
  formatAgentSummary,
  parseAgentShareCode,
} from '../src/utils/agentSharing';
import { generateSheetHtml, resolveSheetPrintSkillsAndStats } from '../src/utils/sheetPrinter';

function makeBaseSheet(overrides?: Partial<CharacterSheet>): CharacterSheet {
  return {
    id: 'char_pd_test',
    name: 'Agente Determinado',
    player: 'Tester',
    nex: 5,
    rank: 'Recruta',
    originId: '',
    classId: 'class__livro_base__especialista',
    trackId: '',
    affinity: 'Nenhum',
    attributes: { AGI: 2, FOR: 1, INT: 2, PRE: 2, VIG: 1 },
    pvCurrent: 17,
    pvMax: 17,
    peCurrent: 5,
    peMax: 5,
    sanCurrent: 16,
    sanMax: 16,
    useDeterminationPoints: true,
    pdCurrent: 10,
    pdMax: 10,
    defenseBonus: 0,
    skills: {},
    entityIds: [],
    notes: '',
    updatedAt: '2026-11-23T00:00:00.000Z',
    ...overrides,
  };
}

test('Pontos de Determinação (SH p. 105): fórmulas iniciais e por avanço para todas as classes', () => {
  const attrs = { AGI: 1, FOR: 1, INT: 1, PRE: 2, VIG: 1 };

  // Combatente: 6 + PRE inicial (8), +3 + PRE por NEX (+5)
  const comb5 = calculateMaxStats('Combatente', 5, attrs, { useDeterminationPoints: true });
  const comb20 = calculateMaxStats('Combatente', 20, attrs, { useDeterminationPoints: true });
  const combInc = calculateStatIncreases('Combatente', attrs);
  assert.equal(comb5.pdMax, 8);
  assert.equal(combInc.pdGain, 5);
  assert.equal(comb20.pdMax, 8 + 3 * 5); // 23

  // Especialista: 8 + PRE inicial (10), +4 + PRE por NEX (+6)
  const esp5 = calculateMaxStats('Especialista', 5, attrs, { useDeterminationPoints: true });
  const esp20 = calculateMaxStats('Especialista', 20, attrs, { useDeterminationPoints: true });
  const espInc = calculateStatIncreases('Especialista', attrs);
  assert.equal(esp5.pdMax, 10);
  assert.equal(espInc.pdGain, 6);
  assert.equal(esp20.pdMax, 10 + 3 * 6); // 28

  // Ocultista: 10 + PRE inicial (12), +5 + PRE por NEX (+7)
  const ocu5 = calculateMaxStats('Ocultista', 5, attrs, { useDeterminationPoints: true });
  const ocu20 = calculateMaxStats('Ocultista', 20, attrs, { useDeterminationPoints: true });
  const ocuInc = calculateStatIncreases('Ocultista', attrs);
  assert.equal(ocu5.pdMax, 12);
  assert.equal(ocuInc.pdGain, 7);
  assert.equal(ocu20.pdMax, 12 + 3 * 7); // 33

  // Sobrevivente: 4 + PRE inicial (6), +2 fixo por estágio
  const sob0 = calculateMaxStats('Sobrevivente', 0, attrs, { useDeterminationPoints: true });
  const sobInc = calculateStatIncreases('Sobrevivente', attrs);
  assert.equal(sob0.pdMax, 6);
  assert.equal(sobInc.pdGain, 2);
});

test('Pontos de Determinação (SH p. 105): poderes de PE aplicam em PD; Vítima e Cultista Arrependido não alteram PD', () => {
  const attrs = { AGI: 1, FOR: 1, INT: 1, PRE: 2, VIG: 1 };

  // Universitário (+1 PD por 5% NEX) + Potencial Aprimorado (+1 PD por 5% NEX) em NEX 20% (4 passos)
  const withPePowers = calculateMaxStats('Especialista', 20, attrs, {
    useDeterminationPoints: true,
    hasUniversitario: true,
    hasPotencialAprimorado: true,
  });
  // Base Especialista NEX 20% com PRE 2 = 28; +4 (Universitário) +4 (Potencial) = 36
  assert.equal(withPePowers.pdMax, 36);
  assert.equal(withPePowers.peRound, 5); // 4 + 1 de Universitário

  // Vítima (Cicatrizes Psicológicas) e Cultista Arrependido NÃO alteram PD
  const withSanOrigins = calculateMaxStats('Especialista', 20, attrs, {
    useDeterminationPoints: true,
    hasVitima: true,
    hasCultistaArrependido: true,
  });
  assert.equal(withSanOrigins.pdMax, 28);
});

test('Helpers de recurso, snapshot da mesa, compartilhamento e impressão SH respeitam Modo PD', () => {
  const pdChar = makeBaseSheet({ pdCurrent: 4, pdMax: 10, pdTemp: 2 });
  assert.equal(isUsingDeterminationPoints(pdChar), true);
  assert.equal(getEffortResourceLabel(pdChar), 'PD');
  assert.equal(getEffortCurrent(pdChar), 4);
  assert.equal(getEffortMax(pdChar), 10);

  // Snapshot da mesa: 4 < 10/2 -> Determinação Baixa (não Enlouquecendo automático)
  const snap = snapshotFromSheet(pdChar);
  assert.equal(snap.useDeterminationPoints, true);
  assert.equal(snap.pdCurrent, 4);
  assert.equal(snap.pdMax, 10);
  assert.ok(snap.conditions.includes('Determinação Baixa'));
  assert.ok(!snap.conditions.includes('Enlouquecendo'));

  // Compartilhamento preserva flags de PD
  const code = encodeAgentShareCode(pdChar);
  const decoded = parseAgentShareCode(code);
  assert.ok(decoded);
  assert.equal(decoded?.useDeterminationPoints, true);
  assert.equal(decoded?.pdCurrent, 4);
  assert.equal(decoded?.pdMax, 10);
  assert.equal(decoded?.pdTemp, 2);
  assert.ok(formatAgentSummary(pdChar).includes('PD 4/10'));
  assert.ok(!formatAgentSummary(pdChar).includes('SAN '));

  // Impressão SH preenche PD e omite PE/SAN no modo PD
  const resolved = resolveSheetPrintSkillsAndStats(pdChar);
  assert.equal(resolved.effectivePdMax, 10);
  const htmlShPd = generateSheetHtml({ character: pdChar, sheetType: 'sobrevivendo_horror' });
  assert.ok(htmlShPd.includes('color: #9333ea;">10</div>'));
  assert.ok(htmlShPd.includes('color: #d97706;"></div>'));
  assert.ok(htmlShPd.includes('color: #0284c7;"></div>'));

  // Impressão SH no modo padrão preenche PE/SAN e deixa PD em branco
  const stdChar = makeBaseSheet({ useDeterminationPoints: false });
  const htmlShStd = generateSheetHtml({ character: stdChar, sheetType: 'sobrevivendo_horror' });
  assert.ok(htmlShStd.includes('color: #9333ea;"></div>'));
  assert.ok(htmlShStd.includes('color: #d97706;">5</div>'));
  assert.ok(htmlShStd.includes('color: #0284c7;">16</div>'));
});
