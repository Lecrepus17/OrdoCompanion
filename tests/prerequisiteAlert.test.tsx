import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import LevelUpModal from '../src/components/LevelUpModal';
import CreateAgentModal from '../src/components/CreateAgentModal';
import { renderWithProviders, cleanup, fireClick, changeInputText } from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { CharacterSheet, CompendiumEntity } from '../src/types/compendium';

describe('Validação permissiva de pré-requisitos (LevelUpModal / CreateAgentModal)', () => {
  let all: CompendiumEntity[] = [];
  let combatente: CompendiumEntity | undefined;
  let aniquilador: CompendiumEntity | undefined;

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.initialize();
    all = await defaultRepository.getAllEntities();
    combatente = all.find((e) => e.category === 'class' && e.name === 'Combatente');
    aniquilador = all.find((e) => e.category === 'track' && e.name.includes('Aniquilador'));
  });

  afterEach(async () => {
    await cleanup();
  });

  const makeChar = (): CharacterSheet => ({
    id: 'char_prereq',
    name: 'Agente Novato',
    player: 'Pedro',
    originId: 'origin__livro_base__militar',
    classId: combatente?.id || 'class__livro_base__combatente',
    trackId: aniquilador?.id || '',
    rank: 'Operador',
    affinity: 'Nenhum',
    nex: 40,
    attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
    pvCurrent: 40,
    pvMax: 40,
    sanCurrent: 24,
    sanMax: 24,
    peCurrent: 18,
    peMax: 18,
    defenseBonus: 12,
    skills: {},
    attacks: [],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  });

  const powerId = 'power__livro_base__armamento_pesado'; // Pré-requisito: For 2

  const renderLevelUp = (onApply: (s: CharacterSheet) => void) =>
    renderWithProviders(
      <LevelUpModal
        visible={true}
        character={makeChar()}
        classEntity={combatente}
        trackEntity={aniquilador}
        allTracksList={all.filter((e) => e.category === 'track')}
        allPowersList={all.filter((e) => e.category === 'power')}
        allRitualsList={all.filter((e) => e.category === 'ritual')}
        onClose={() => {}}
        onApplyLevelUp={onApply}
      />
    );

  test('LevelUp: alerta aparece e "Cancelar" NÃO adiciona o poder', async () => {
    let applied: CharacterSheet | null = null;
    const { getByText, getByTestId, queryByTestId, queryByText } = await renderLevelUp((s) => {
      applied = s;
    });
    await fireClick(getByText(/^Poderes de Classe \(/));
    await fireClick(getByTestId(`levelup-power-${powerId}`));

    assert.ok(queryByText(/Pré-requisitos Não Atendidos/i), 'Alerta explicativo deve aparecer');
    assert.ok(getByText('Adicionar mesmo assim'));

    await fireClick(getByTestId('btn-cancel-prereq'));
    assert.strictEqual(queryByTestId('btn-confirm-permissive-prereq'), null);

    await fireClick(getByText(/Confirmar Evolução/i));
    assert.ok(applied);
    assert.ok(!(applied as CharacterSheet).entityIds.includes(powerId));
  });

  test('LevelUp: "Adicionar mesmo assim" inclui o poder na ficha', async () => {
    let applied: CharacterSheet | null = null;
    const { getByText, getByTestId } = await renderLevelUp((s) => {
      applied = s;
    });
    await fireClick(getByText(/^Poderes de Classe \(/));
    await fireClick(getByTestId(`levelup-power-${powerId}`));
    await fireClick(getByTestId('btn-confirm-permissive-prereq'));
    await fireClick(getByText(/Confirmar Evolução/i));
    assert.ok(applied);
    assert.ok((applied as CharacterSheet).entityIds.includes(powerId));
  });

  test('CreateAgent: ritual de círculo superior exibe alerta; confirmar adiciona e cancelar não', async () => {
    const origins = all.filter((e) => e.category === 'origin');
    const classes = all.filter((e) => e.category === 'class');
    const rituals = all.filter((e) => e.category === 'ritual');
    const circle2 = rituals.find((r) => (r.circle || 1) === 2);
    assert.ok(circle2, 'Deve existir ritual de 2º círculo');

    const { getByText, getByTestId, queryByTestId, queryByText, getByPlaceholder } =
      await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={origins}
          classesList={classes}
          ritualsList={rituals}
        />
      );

    await fireClick(getByText('Próximo')); // 2
    await fireClick(getByText('Próximo')); // 3
    await fireClick(getByText('Ocultista'));
    await fireClick(getByText('Próximo')); // 4
    await fireClick(getByText('Modo Livre'));
    await fireClick(getByText('Próximo')); // 5
    for (const sk of ['Diplomacia', 'Iniciativa', 'Medicina', 'Percepção']) {
      await fireClick(getByText(sk));
    }
    await fireClick(getByText('Próximo')); // 6

    await changeInputText(getByPlaceholder(/Pesquisar rituais/i), circle2!.name);
    await fireClick(getByTestId(`ritual-card-${circle2!.id}`));

    assert.ok(queryByText(/Pré-requisitos Não Atendidos/i), 'Alerta deve aparecer para ritual de 2º círculo');

    await fireClick(getByTestId('btn-cancel-prereq'));
    assert.strictEqual(queryByTestId('btn-confirm-permissive-prereq'), null);
    assert.ok(queryByText(/\(0 \/ 3\)/), 'Ritual não deve ser selecionado após cancelar');

    await fireClick(getByTestId(`ritual-card-${circle2!.id}`));
    await fireClick(getByTestId('btn-confirm-permissive-prereq'));
    assert.ok(queryByText(/\(1 \/ 3\)/), 'Ritual deve ser selecionado após "Adicionar mesmo assim"');
  });
});
