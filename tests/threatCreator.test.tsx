import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ThreatCreatorModal, {
  ThreatCreatorSavePayload,
  formatStructuredAttacksSummary,
  generateThreatStatsForVd,
} from '../src/components/ThreatCreatorModal';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';

describe('Criador Completo de Ameaças (Estilo C.R.I.S. - #ORD-913969)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('generateThreatStatsForVd gera atributos e estatísticas balanceadas crescentes por VD', () => {
    const low = generateThreatStatsForVd(20);
    const mid = generateThreatStatsForVd(100);
    const high = generateThreatStatsForVd(400);

    assert.ok(low.pv > 0 && mid.pv > low.pv && high.pv > mid.pv);
    assert.ok(low.defense > 10 && mid.defense > low.defense && high.defense > mid.defense);
    assert.ok(mid.saves.fortitude > low.saves.fortitude);
    assert.ok(high.saves.vontade > mid.saves.vontade);
    assert.ok(mid.attackBonus > low.attackBonus);
    assert.ok(high.rdSuggestion.length > 0);
  });

  test('formatStructuredAttacksSummary formata múltiplos ataques estruturados corretamente', () => {
    const text = formatStructuredAttacksSummary([
      {
        id: 'atk_1',
        name: 'Garras Dilacerantes',
        actionType: 'Padrão',
        testFormula: '3d20+15',
        damageFormula: '2d10+8',
        damageType: 'Corte',
        critical: '19/x2',
      },
    ]);
    assert.ok(text.includes('[Padrão] Garras Dilacerantes'));
    assert.ok(text.includes('3d20+15'));
    assert.ok(text.includes('2d10+8 Corte'));
  });

  test('ThreatCreatorModal permite aplicar preset de VD, adicionar ataque e salvar com exportação ao Compêndio', async () => {
    let savedPayload: ThreatCreatorSavePayload | null = null;

    const { getByTestId } = await renderWithProviders(
      <ThreatCreatorModal
        visible={true}
        onClose={() => {}}
        mode="campaign"
        onSave={async (payload) => {
          savedPayload = payload;
        }}
      />,
      { mobile: 'android' }
    );

    await fireClick(getByTestId('threat-vd-preset-100'));
    await changeInputText(getByTestId('input-threat-name') as HTMLInputElement, 'Aberração Alfa');
    await changeInputText(getByTestId('input-threat-attack-name') as HTMLInputElement, 'Mordida Brutal');
    await fireClick(getByTestId('btn-add-threat-attack'));
    await fireClick(getByTestId('toggle-threat-save-compendium'));
    await fireClick(getByTestId('btn-save-threat-creator'));

    assert.ok(savedPayload, 'Deve disparar callback onSave');
    const payload = savedPayload as ThreatCreatorSavePayload;
    assert.strictEqual(payload.monster.name, 'Aberração Alfa');
    assert.strictEqual(payload.monster.vd, 100);
    assert.strictEqual(payload.monster.structuredAttacks?.length, 1);
    assert.strictEqual(payload.monster.structuredAttacks?.[0].name, 'Mordida Brutal');
    assert.strictEqual(payload.alsoSaveToCompendium, true);
    assert.strictEqual(payload.compendiumEntity.category, 'creature');
    assert.strictEqual(payload.compendiumEntity.vd, 100);
    assert.ok((payload.compendiumEntity.diceFormulas?.length ?? 0) >= 2);
  });

  test('Preserva atributo 0 ao editar ameaça e omite imunidade NEX em Presença Perturbadora VD 360+', async () => {
    const high360 = generateThreatStatsForVd(360);
    const high400 = generateThreatStatsForVd(400);
    assert.ok(!high360.disturbingPresence.toLowerCase().includes('imune'));
    assert.ok(!high400.disturbingPresence.toLowerCase().includes('imune'));
    const low80 = generateThreatStatsForVd(80);
    assert.ok(low80.disturbingPresence.includes('imune'));

    let savedPayload: ThreatCreatorSavePayload | null = null;
    const { getByTestId } = await renderWithProviders(
      <ThreatCreatorModal
        visible={true}
        onClose={() => {}}
        mode="campaign"
        initialMonster={{
          id: 'mon_zero_attr',
          name: 'Zumbi Lento',
          vd: 20,
          pvMax: 45,
          pvCurrent: 45,
          defense: 14,
          attributes: { AGI: '0', FOR: '3', INT: '0', PRE: '1', VIG: '2' },
        }}
        onSave={async (payload) => {
          savedPayload = payload;
        }}
      />,
      { mobile: 'android' }
    );

    await fireClick(getByTestId('btn-save-threat-creator'));
    assert.ok(savedPayload);
    const result = savedPayload as ThreatCreatorSavePayload;
    assert.strictEqual(result.monster.attributes?.AGI, '0');
    assert.strictEqual(result.monster.attributes?.INT, '0');
  });
});
