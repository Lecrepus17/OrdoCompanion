import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { EntityCard } from '../src/components/EntityCard';
import CreateAgentModal from '../src/components/CreateAgentModal';
import LevelUpModal from '../src/components/LevelUpModal';
import WeaponsScreen from '../src/app/(tabs)/weapons';
import CharactersScreen from '../src/app/(tabs)/characters';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { CharacterSheet, CompendiumEntity } from '../src/types/compendium';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  fireLongPress,
  changeInputText,
  mockRouter,
} from './frontendTestUtils';

const MOCK_CHARACTER: CharacterSheet = {
  id: 'char_test_preview',
  name: 'Arthur Cervero',
  player: 'Guaxinim',
  originId: 'origem_agente_saude',
  classId: 'classe_especialista',
  trackId: '',
  affinity: 'Nenhum',
  nex: 5,
  rank: 'Recruta',
  attributes: { AGI: 2, FOR: 1, INT: 3, PRE: 2, VIG: 2 },
  pvCurrent: 20,
  pvMax: 20,
  peCurrent: 8,
  peMax: 8,
  sanCurrent: 20,
  sanMax: 20,
  defenseBonus: 0,
  defenseEquip: 0,
  defenseOther: 0,
  skills: {
    Luta: { degree: 5, bonus: 0 },
    Medicina: { degree: 5, bonus: 2 },
  },
  attacks: [
    {
      id: 'atk_1',
      name: 'Faca Tática',
      test: 'Luta (2d20+5)',
      skillName: 'Luta',
      damage: '1d4+1',
      critical: '19/x2',
      range: 'Curto',
      special: 'Corte • Arma leve discreta.',
      attackBonus: 0,
    },
  ],
  abilities: [
    {
      id: 'ab_1',
      name: 'Paramédico',
      cost: '2 PE',
      originPage: 'Trilha Médico de Campo',
      description: 'Você pode usar uma ação padrão e 2 PE para curar 2d10 PV.',
      type: 'habilidade',
    },
  ],
  inventory: [
    {
      id: 'inv_1',
      name: 'Cicatrizante',
      spaces: 1,
      category: 'I',
      equipped: true,
      details: 'Cura 2d8+2 PV.',
    },
  ],
  entityIds: [],
  notes: '',
  updatedAt: new Date().toISOString(),
};

describe('RecordPreviewModal - Padronização de Pré-visualização (Long-Press & Botão Info)', () => {
  let allEntities: CompendiumEntity[] = [];
  let originsList: CompendiumEntity[] = [];
  let classesList: CompendiumEntity[] = [];
  let tracksList: CompendiumEntity[] = [];
  let powersList: CompendiumEntity[] = [];
  let ritualsList: CompendiumEntity[] = [];

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.initialize();
    allEntities = await defaultRepository.getAllEntities();
    originsList = allEntities.filter((e) => e.category === 'origin');
    classesList = allEntities.filter((e) => e.category === 'class');
    tracksList = allEntities.filter((e) => e.category === 'track');
    powersList = allEntities.filter((e) => e.category === 'power');
    ritualsList = allEntities.filter((e) => e.category === 'ritual');
  });

  afterEach(async () => {
    await cleanup();
  });

  test('EntityCard deve abrir RecordPreviewModal ao segurar (onLongPress) sem navegar para a página do registro', async () => {
    const ritualEntity = ritualsList[0];
    assert.ok(ritualEntity, 'Ritual deve existir no banco de dados');

    const { getByTestId, queryByTestId, queryByText } = await renderWithProviders(
      <EntityCard entity={ritualEntity} />
    );

    const card = getByTestId(`entity-card-${ritualEntity.id}`);

    // Ao segurar (longPress), abre a modal e NÃO navega no router
    await fireLongPress(card);

    assert.equal(mockRouter.history.length, 0, 'Não deve navegar ao segurar o card');
    assert.ok(queryByTestId('record-preview-modal'), 'Modal de pré-visualização deve abrir');
    assert.ok(queryByText(ritualEntity.description), 'Descrição completa deve aparecer na modal');

    // Clicar em "Abrir Registro" dentro da modal navega para a página completa
    const openBtn = getByTestId('popup-open-entity-btn');
    await fireClick(openBtn);

    assert.ok(
      mockRouter.history.some(
        (h) => h.action === 'push' && h.href?.pathname === '/entity/[id]'
      ),
      'Botão Abrir Registro deve navegar para /entity/[id]'
    );
  });

  test('EntityCard deve abrir RecordPreviewModal ao clicar no botão discreto (i)', async () => {
    const weaponEntity = allEntities.find((e) => e.category === 'weapon')!;
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <EntityCard entity={weaponEntity} />
    );

    const infoBtn = getByTestId(`entity-info-${weaponEntity.id}`);
    await fireClick(infoBtn);

    assert.equal(mockRouter.history.length, 0, 'Clicar no botão (i) não deve navegar');
    assert.ok(queryByTestId('record-preview-modal'), 'Modal de detalhes deve abrir');

    // Fecha pelo botão Fechar
    await fireClick(getByTestId('popup-dismiss-btn'));
    assert.equal(queryByTestId('record-preview-modal'), null, 'Modal deve fechar');
  });

  test('CreateAgentModal deve abrir pré-visualização ao segurar Classe (Passo 3), Perícia (Passo 5) e Ritual (Passo 6)', async () => {
    const { getByText, getByTestId, queryByTestId, queryByText, getByPlaceholder } =
      await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

    // Passo 1 -> 2 -> 3
    await changeInputText(getByPlaceholder(/Ex: Arthur Cervero/i), 'Kaiser');
    await fireClick(getByText('Próximo'));
    await fireClick(getByText('Próximo'));

    // Passo 3: Segurar card de Ocultista abre a modal com detalhes da classe
    const ocultistaCard = getByTestId('class-card-ocultista');
    await fireLongPress(ocultistaCard);

    assert.ok(queryByTestId('record-preview-modal'), 'Modal de classe deve abrir no longPress');
    assert.ok(queryByText(/Escolhido pelo Outro Lado/i), 'Poder inicial de Ocultista deve aparecer');

    // Seleciona a classe pelo botão primário da modal
    await fireClick(getByTestId('popup-select-btn'));
    assert.equal(queryByTestId('record-preview-modal'), null, 'Modal deve fechar após selecionar');

    // Passo 3 -> 4 (Atributos)
    await fireClick(getByText('Próximo'));
    await fireClick(getByText('Modo Livre'));
    await fireClick(getByText('Próximo')); // Passo 4 -> 5 (Perícias)

    // Segurar perícia Luta abre detalhes da perícia
    const lutaPill = getByTestId('skill-pill-Luta');
    await fireLongPress(lutaPill);

    assert.ok(queryByTestId('record-preview-modal'), 'Modal de perícia deve abrir no longPress');
    assert.ok(queryByText(/corpo a corpo/i), 'Descrição da perícia Luta deve aparecer');
    await fireClick(getByTestId('popup-dismiss-btn'));

    // Seleciona 4 perícias para cumprir cota de Ocultista
    const skillsToSelect = ['Diplomacia', 'Iniciativa', 'Medicina', 'Percepção'];
    for (const sk of skillsToSelect) {
      await fireClick(getByText(sk));
    }
    // Passo 5 -> 6 (Rituais de Ocultista)
    await fireClick(getByText('Próximo'));
    
    const ritual1st = ritualsList.find((e) => e.circle === 1)!;
    const ritualCard = getByTestId(`ritual-card-${ritual1st.id}`);
    await fireLongPress(ritualCard);

    assert.ok(queryByTestId('record-preview-modal'), 'Modal de ritual deve abrir no longPress');
    assert.ok(queryByText(ritual1st.description), 'Descrição do ritual deve aparecer');
  });

  test('LevelUpModal deve abrir pré-visualização ao segurar Trilha', async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={MOCK_CHARACTER}
        onClose={() => {}}
        onApplyLevelUp={async () => {}}
        allTracksList={tracksList}
        allPowersList={powersList}
        allRitualsList={ritualsList}
      />
    );

    const trackEntity = tracksList.find(
      (e) => e.className === 'Especialista'
    )!;
    assert.ok(trackEntity, 'Trilha de Especialista deve existir');
    const trackCard = getByTestId(`levelup-track-card-${trackEntity.id}`);
    await fireLongPress(trackCard);

    assert.ok(queryByTestId('record-preview-modal'), 'Modal de trilha deve abrir no LevelUpModal');
    await fireClick(getByTestId('popup-dismiss-btn'));
  });

  test('Armaria (weapons.tsx) deve abrir pré-visualização ao segurar modificações na oficina', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderWithProviders(
      <WeaponsScreen />
    );

    // Abre modal de forjar nova arma
    await fireClick(getByText(/Nova Arma|Forjar Nova Arma/i));

    // Segurar uma modificação (ex: mod_certeira)
    const modCard = getByTestId('mod-select-card-mod_certeira');
    await fireLongPress(modCard);

    assert.ok(queryByTestId('record-preview-modal'), 'Modal de modificação deve abrir no longPress');
    await fireClick(getByTestId('popup-dismiss-btn'));
  });

  test('Fichas de Agentes (characters.tsx) deve abrir pré-visualização ao segurar perícia na ficha', async () => {
    const { getByText, getByTestId, queryByTestId, getByPlaceholder } =
      await renderWithProviders(<CharactersScreen />);

    // Cria um agente rápido para testar na ficha
    await fireClick(getByText(/Criar Assistido/i));
    await changeInputText(getByPlaceholder(/Ex: Arthur Cervero/i), 'Agente Preview');
    for (let i = 0; i < 5; i++) {
      await fireClick(getByText('Próximo'));
    }
    await fireClick(getByText(/Criar Agente/i));

    // Na tela da ficha aberta, testa segurar uma perícia na aba Perícias
    await fireClick(getByText(/Perícias/i));
    const skillRow = getByTestId('char-skill-row-Acrobacia');
    await fireLongPress(skillRow);

    assert.ok(
      queryByTestId('record-preview-modal'),
      'Segurar perícia na ficha deve abrir RecordPreviewModal'
    );
    await fireClick(getByTestId('popup-dismiss-btn'));
  });
});
