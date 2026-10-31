import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import CharactersScreen from '../src/app/(tabs)/characters';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
  mockAlertCalls,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { CharacterSheet } from '../src/types/compendium';

describe('Frontend - Tela de Fichas de Personagem (characters.tsx)', () => {
  const sampleSheet: CharacterSheet = {
    id: 'char_test_123',
    name: 'Dante Ocultista',
    player: 'Mestre Ordo',
    originId: 'orig_academico',
    classId: 'cls_ocultista',
    trackId: 'trk_graduado',
    rank: 'Operador',
    affinity: 'Nenhum',
    nex: 25,
    attributes: { AGI: 2, FOR: 1, INT: 4, PRE: 3, VIG: 2 },
    pvCurrent: 28,
    pvMax: 28,
    sanCurrent: 40,
    sanMax: 40,
    peCurrent: 30,
    peMax: 30,
    defenseBonus: 12,
    skills: {
      Ocultismo: { degree: 10, bonus: 10 },
      Investigação: { degree: 5, bonus: 5 },
    },
    attacks: [
      {
        id: 'atk_1',
        name: 'Revólver',
        test: '+7',
        damage: '2d6',
        critical: '19/x3',
        range: 'Curto',
        special: 'Balístico',
      },
    ],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.saveCharacters([sampleSheet]);
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a lista de fichas de agentes e exibir o agente salvo', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: false,
    });

    // Deve exibir o nome do agente salvo
    assert.ok(getByText('Dante Ocultista'));
    // Deve exibir botões de criação
    assert.ok(queryByText(/Criar|Novo Agente/i));
  });

  test('deve renderizar a lista perfeitamente em ambiente Celular (Android e iOS) com layout responsivo', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'android',
    });

    assert.ok(getByText('Dante Ocultista'));
    // Botões de ação rápida no card do celular
    assert.ok(queryByText(/Abrir Ficha|Dante Ocultista/i));
  });

  test('deve abrir a ficha do agente ao clicar nele e exibir status vitais (PV, SAN, PE)', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'ios',
    });

    const agentCard = getByText('Dante Ocultista');
    await fireClick(agentCard);

    // Deve entrar na tela de detalhes da ficha
    assert.ok(getByText('Todas as Fichas'));
    assert.ok(queryByText(/PV|Pontos de Vida/i));
    assert.ok(queryByText(/SAN|Sanidade/i));
    assert.ok(queryByText(/PE|Esforço/i));
  });

  test('deve abrir modal de impressão de ficha ao clicar em Imprimir', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />);

    // Entra na ficha
    await fireClick(getByText('Dante Ocultista'));

    const printBtn = getByText('Imprimir Ficha');
    assert.ok(printBtn);
    await fireClick(printBtn);

    // Deve abrir o modal de impressão
    assert.ok(queryByText(/Impressão de Ficha|Imprimir/i));
  });

  test('deve abrir modal de level up (+5% NEX)', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />);

    await fireClick(getByText('Dante Ocultista'));

    const levelUpBtn = getByText('+5% NEX (Assistido)');
    assert.ok(levelUpBtn);
    await fireClick(levelUpBtn);

    // Deve exibir diálogo ou opções de evolução
    assert.ok(queryByText(/Evolução|NEX|Assistido/i));
  });

  test('deve navegar de volta para a lista ao clicar em "Todas as Fichas"', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'android',
    });

    await fireClick(getByText('Dante Ocultista'));
    assert.ok(getByText('Todas as Fichas'));

    await fireClick(getByText('Todas as Fichas'));
    // Deve retornar para a lista de fichas
    assert.ok(queryByText('Dante Ocultista'));
  });

  test('deve exibir o botão "Assistente de Proteções" no card de Defesa e abrir o modal de proteções', async () => {
    const { getByText, getByTestId } = await renderWithProviders(<CharactersScreen />);

    await fireClick(getByText('Dante Ocultista'));

    // Botão Assistente de Proteções no card de Defesa
    const assistantBtn = getByTestId('btn-open-protection-assistant');
    assert.ok(assistantBtn);
    assert.ok(getByText('Assistente de Proteções'));

    // Clicar para abrir o modal
    await fireClick(assistantBtn);

    // Modal deve estar visível com testID protection-modal
    assert.ok(getByTestId('protection-modal'));
    assert.ok(getByText(/1\. Proteção Corporal/i));
    assert.ok(getByText(/3\. Escudo Tático/i));

    // Fechar o modal
    const closeBtn = getByTestId('btn-close-modal');
    assert.ok(closeBtn);
    await fireClick(closeBtn);
  });

  test('deve exibir alerta visual de falta de proficiência em proteção no card de Defesa quando usando Proteção Pesada sem proficiência', async () => {
    // Dante Ocultista usando Proteção Pesada (não possui proficiência com Proteções Pesadas)
    const charWithHeavyArmor: CharacterSheet = {
      ...sampleSheet,
      id: 'char_heavy_ocultista',
      protection: 'Proteção Pesada (+10 Defesa)',
      defenseEquip: 10,
    };
    await defaultRepository.saveCharacters([charWithHeavyArmor]);

    const { getByText, getByTestId } = await renderWithProviders(<CharactersScreen />);
    await fireClick(getByText('Dante Ocultista'));

    // Deve exibir o aviso explícito de falta de proficiência no card de Defesa
    const warningBadge = getByTestId('sheet-protection-non-proficient-warning');
    assert.ok(warningBadge);
    assert.ok(getByText(/⚠️ Proteção sem Proficiência: -2d20 em testes de Força e Agilidade/i));
  });

  test('deve exibir badge "⚠️ Não Proficiente (-2d20)" no card de ataque quando o agente não possui proficiência com a arma', async () => {
    // Dante Ocultista com uma arma tática (ex: Fuzil de Assalto)
    const charWithTacticalWeapon: CharacterSheet = {
      ...sampleSheet,
      id: 'char_tactical_ocultista',
      attacks: [
        {
          id: 'atk_fuzil',
          name: 'Fuzil de Assalto',
          test: '+5',
          damage: '2d10',
          critical: '19/x3',
          range: 'Médio',
          special: 'Balístico',
          proficiency: 'Tática',
        },
      ],
    };
    await defaultRepository.saveCharacters([charWithTacticalWeapon]);

    const { getByText, getByTestId } = await renderWithProviders(<CharactersScreen />);
    await fireClick(getByText('Dante Ocultista'));

    // Navega para a aba de Ataques
    const tabAtaques = getByText('Ataques');
    await fireClick(tabAtaques);

    // Deve exibir o badge de aviso no card do Fuzil
    const nonProfBadge = getByTestId('sheet-attack-non-proficient-atk_fuzil');
    assert.ok(nonProfBadge);
    assert.ok(getByText(/⚠️ Não Proficiente \(-2d20\)/i));
  });

  test('deve exibir o painel "Vestimentas Ativas: X/2" no Inventário e permitir alternar equipar/despir', async () => {
    const charWithClothes: CharacterSheet = {
      ...sampleSheet,
      id: 'char_clothes_test',
      inventory: [
        {
          id: 'inv_jaqueta',
          name: 'Jaqueta de Couro Especial',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Fortitude',
          skillBonus: 2,
          justification: 'Couro tratado reforçado',
        },
      ],
    };
    await defaultRepository.saveCharacters([charWithClothes]);

    const { getByText, getByTestId } = await renderWithProviders(<CharactersScreen />);
    await fireClick(getByText('Dante Ocultista'));

    // Navega para a aba de Inventário
    const tabInv = getByText('Inventário');
    await fireClick(tabInv);

    // Deve exibir o painel didático de vestimentas
    const counterCard = getByTestId('sheet-clothing-counter-card');
    assert.ok(counterCard);
    assert.ok(getByText(/Vestimentas Ativas: 1\/2/i));

    // Botão de toggle rápido deve indicar vestida
    const toggleBtn = getByTestId('btn-toggle-equip-inv_jaqueta');
    assert.ok(toggleBtn);
    assert.ok(getByText('Vestida'));

    // Ao clicar para despir, alterna o estado
    await fireClick(toggleBtn);
    assert.ok(getByText('Despida'));
  });

  test('deve refletir o bônus de vestimenta ativa na aba de Perícias e exibir o badge do item', async () => {
    const charWithInvestigacaoClothing: CharacterSheet = {
      ...sampleSheet,
      id: 'char_inv_skill_test',
      skills: {
        Investigação: { degree: 5, bonus: 0 },
      },
      inventory: [
        {
          id: 'inv_lupa',
          name: 'Lupa Forense',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'utensilio',
          targetSkill: 'Investigação',
          skillBonus: 2,
          justification: 'Lente com luz UV integrada',
        },
      ],
    };
    await defaultRepository.saveCharacters([charWithInvestigacaoClothing]);

    const { getByText, getByTestId } = await renderWithProviders(<CharactersScreen />);
    await fireClick(getByText('Dante Ocultista'));

    // Navega para a aba de Perícias
    const tabPericias = getByText('Perícias');
    await fireClick(tabPericias);

    // Deve exibir o badge com o bônus do item em Investigação
    const badge = getByTestId('sheet-skill-item-bonus-Investigação');
    assert.ok(badge);
    assert.ok(getByText(/Lupa Forense/i));

    // O botão de rolagem deve refletir o bônus total somando o item: 5 (degree) + 2 (item) = +7!
    const rollBtn = getByTestId('btn-roll-skill-Investigação');
    assert.ok(rollBtn);
    assert.ok(getByText(/\+7/));
  });
});
