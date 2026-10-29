import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import LevelUpModal from '../src/components/LevelUpModal';
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import {
  CharacterSheet,
  CompendiumEntity,
} from '../src/types/compendium';

describe('LevelUpModal - Exibição Completa de Habilidades Desbloqueadas e Aprimoramentos', () => {
  let allTracks: CompendiumEntity[] = [];
  let allPowers: CompendiumEntity[] = [];
  let allRituals: CompendiumEntity[] = [];
  let combatenteClass: CompendiumEntity | undefined;
  let especialistaClass: CompendiumEntity | undefined;
  let aniquiladorTrack: CompendiumEntity | undefined;

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.initialize();
    const all = await defaultRepository.getAllEntities();
    allTracks = all.filter((e) => e.category === 'track');
    allPowers = all.filter((e) => e.category === 'power');
    allRituals = all.filter((e) => e.category === 'ritual');
    combatenteClass = all.find((e) => e.category === 'class' && e.name === 'Combatente');
    especialistaClass = all.find((e) => e.category === 'class' && e.name === 'Especialista');
    aniquiladorTrack = allTracks.find((t) => t.name.includes('Aniquilador'));
  });

  afterEach(async () => {
    await cleanup();
  });

  test('no NEX 40%, deve exibir card com título e descrição da Habilidade de Trilha (ex: Técnica Secreta)', async () => {
    assert.ok(aniquiladorTrack, 'Trilha Aniquilador deve existir no compêndio');

    const sampleChar: CharacterSheet = {
      id: 'char_40',
      name: 'Arthur Guerreiro',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack.id,
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 35, // Subindo para 40%
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      pvCurrent: 35,
      pvMax: 35,
      sanCurrent: 20,
      sanMax: 20,
      peCurrent: 15,
      peMax: 15,
      defenseBonus: 12,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Deve exibir o cabeçalho do marco
    assert.ok(getByText(/NEX 40%: Habilidade de Trilha/i));

    // Deve exibir a seção de habilidade de trilha desbloqueada com título e descrição
    assert.ok(getByText(/Habilidade de Trilha Desbloqueada \(NEX 40%\)/i));
    assert.ok(getByText('Técnica Secreta'));
    assert.ok(queryByText(/A categoria da arma favorita passa a ser reduzida em II/i));
  });

  test('no NEX 40% para Especialista, deve exibir a Habilidade de Trilha E o Aprimoramento de Classe (Engenhosidade)', async () => {
    const atiradorTrack = allTracks.find((t) => t.name.includes('Atirador de Elite'));
    assert.ok(atiradorTrack, 'Trilha Atirador de Elite deve existir');

    const sampleEsp: CharacterSheet = {
      id: 'char_esp_40',
      name: 'Kaiser Especialista',
      player: 'Pedro',
      originId: 'origin__livro_base__teorico_da_conspiracao',
      classId: especialistaClass?.id || 'class__livro_base__especialista',
      trackId: atiradorTrack.id,
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 35, // Subindo para 40%
      attributes: { AGI: 3, FOR: 1, INT: 3, PRE: 2, VIG: 1 },
      pvCurrent: 28,
      pvMax: 28,
      sanCurrent: 30,
      sanMax: 30,
      peCurrent: 25,
      peMax: 25,
      defenseBonus: 13,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleEsp}
        classEntity={especialistaClass}
        trackEntity={atiradorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Deve exibir Habilidade de Trilha
    assert.ok(getByText(/Habilidade de Trilha Desbloqueada \(NEX 40%\)/i));
    assert.ok(getByText('Disparo Letal'));

    // Deve exibir Aprimoramento de Classe com Engenhosidade (Veterano)
    assert.ok(getByText(/Aprimoramento de Classe \(NEX 40%\)/i));
    assert.ok(getByText('Engenhosidade (Veterano)'));
  });

  test('no NEX 25% para Combatente, deve exibir Aprimoramento de Classe com Ataque Especial (3 PE / +10)', async () => {
    const sampleChar25: CharacterSheet = {
      id: 'char_25',
      name: 'Joui Combatente',
      player: 'Pedro',
      originId: 'origin__livro_base__atleta',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Recruta',
      affinity: 'Nenhum',
      nex: 20, // Subindo para 25%
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      pvCurrent: 30,
      pvMax: 30,
      sanCurrent: 18,
      sanMax: 18,
      peCurrent: 12,
      peMax: 12,
      defenseBonus: 12,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar25}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    assert.ok(getByText(/Aprimoramento de Classe \(NEX 25%\)/i));
    assert.ok(getByText('Ataque Especial (3 PE / +10)'));
    assert.ok(queryByText(/pode gastar 3 PE para receber \+10 no teste ou dano/i));
  });

  test('no NEX 65%, deve exibir a terceira Habilidade de Trilha (ex: Técnica Sublime)', async () => {
    const sampleChar65: CharacterSheet = {
      id: 'char_65',
      name: 'Arthur Guerreiro',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Agente Especial',
      affinity: 'Nenhum',
      nex: 60, // Subindo para 65%
      attributes: { AGI: 2, FOR: 4, INT: 1, PRE: 1, VIG: 3 },
      pvCurrent: 60,
      pvMax: 60,
      sanCurrent: 30,
      sanMax: 30,
      peCurrent: 25,
      peMax: 25,
      defenseBonus: 13,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar65}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    assert.ok(getByText(/Habilidade de Trilha Desbloqueada \(NEX 65%\)/i));
    assert.ok(getByText('Técnica Sublime'));
    assert.ok(queryByText(/A categoria da arma favorita passa a ser reduzida em III/i));
  });

  test('no NEX 45%, deve exibir abas de filtro separando Poderes de Classe e Poderes Paranormais', async () => {
    const sampleChar45: CharacterSheet = {
      id: 'char_45',
      name: 'Agente Balu',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 40, // Subindo para 45%
      attributes: { AGI: 2, FOR: 4, INT: 1, PRE: 1, VIG: 3 },
      pvCurrent: 45,
      pvMax: 45,
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
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar45}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Deve exibir o título de escolha de poder
    assert.ok(getByText(/Escolha 1 Poder de Classe ou Paranormal/i));

    // Deve exibir as abas de categoria separadas
    assert.ok(getByText(/Poderes de Classe/i));
    assert.ok(getByText(/Poderes Paranormais/i));

    // Deve exibir o checkbox para não aumentar NEX
    assert.ok(getByText(/Não aumentar NEX/i));
  });

  test('com transcendEvery5Nex ativado no perfil do usuário, deve permitir escolher poder no NEX 40%', async () => {
    const sampleChar40: CharacterSheet = {
      id: 'char_40_transcend',
      name: 'Agente K',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 35, // Subindo para 40%
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      pvCurrent: 35,
      pvMax: 35,
      sanCurrent: 20,
      sanMax: 20,
      peCurrent: 15,
      peMax: 15,
      defenseBonus: 12,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar40}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        userProfile={{
          id: 'test_u',
          playerName: 'Pedro',
          cloudSyncEnabled: false,
          updatedAt: new Date().toISOString(),
          transcendEvery5Nex: true,
        }}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Mesmo em NEX 40%, deve exibir a seção de Transcender
    assert.ok(getByText(/Transcender: Escolha 1 Poder Paranormal \(Opcional\)/i));
    assert.ok(getByText(/Regra de Transcender: apenas Poderes Paranormais disponíveis/i));

    // Exigência: NÃO PODE ser poder de classe nessa situação
    assert.strictEqual(queryByText(/^Poderes de Classe \(/), null, 'Não deve exibir aba nem opção de Poderes de Classe no marco opcional de 40%');
  });

  test('no NEX 45% com transcendEvery5Nex ATIVADO, deve exibir Poder de Classe E Transcender SEPARADAMENTE', async () => {
    const sampleChar45: CharacterSheet = {
      id: 'char_45_both',
      name: 'Arthur Guerreiro',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 40, // Subindo para 45%
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      pvCurrent: 40,
      pvMax: 40,
      sanCurrent: 25,
      sanMax: 25,
      peCurrent: 20,
      peMax: 20,
      defenseBonus: 12,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const { getByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar45}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        userProfile={{
          id: 'test_u',
          playerName: 'Pedro',
          cloudSyncEnabled: false,
          updatedAt: new Date().toISOString(),
          transcendEvery5Nex: true,
        }}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Deve exibir o card de Poder de Classe oficial
    assert.ok(getByText(/Escolha 1 Poder de Classe \(NEX 45%\)/i));

    // Deve exibir também o card SEPARADO de Transcender
    assert.ok(getByText(/Transcender: Escolha 1 Poder Paranormal \(Opcional\)/i));
    assert.ok(getByText(/Regra de Transcender: Escolha separada de Poder Paranormal/i));
  });

  test('Regra Canônica: no NEX 40% sem a regra caseira, NÃO deve exibir opção de Transcender e concede ganho normal de SAN', async () => {
    const sampleChar40Canon: CharacterSheet = {
      id: 'char_40_canon',
      name: 'Arthur Guerreiro',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 35, // Subindo para 40%
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      pvCurrent: 35,
      pvMax: 35,
      sanCurrent: 20,
      sanMax: 20,
      peCurrent: 15,
      peMax: 15,
      defenseBonus: 12,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      transcendEvery5Nex: false,
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar40Canon}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        userProfile={{
          id: 'test_u_canon',
          playerName: 'Pedro',
          cloudSyncEnabled: false,
          updatedAt: new Date().toISOString(),
          transcendEvery5Nex: false,
        }}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Não deve exibir opção de Transcender em patamar não-oficial de poder
    assert.strictEqual(queryByText(/Transcender: Escolha 1 Poder Paranormal/i), null);

    // Deve exibir ganho normal de Sanidade (+3 SAN para Combatente)
    assert.ok(getByText(/\+3 SAN/i));
    assert.ok(getByText(/\+3 base/i));
  });

  test('Regra Caseira: no NEX 40% com a regra ativa, ganha SAN normal se não marcar Transcender; zera SAN (+0) ao selecionar poder', async () => {
    const sampleChar40Homebrew: CharacterSheet = {
      id: 'char_40_homebrew',
      name: 'Arthur Guerreiro',
      player: 'Pedro',
      originId: 'origin__livro_base__militar',
      classId: combatenteClass?.id || 'class__livro_base__combatente',
      trackId: aniquiladorTrack?.id || '',
      rank: 'Operador',
      affinity: 'Nenhum',
      nex: 35, // Subindo para 40%
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      pvCurrent: 35,
      pvMax: 35,
      sanCurrent: 20,
      sanMax: 20,
      peCurrent: 15,
      peMax: 15,
      defenseBonus: 12,
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      entityIds: [],
      notes: '',
      transcendEvery5Nex: true,
      updatedAt: new Date().toISOString(),
    };

    const { getByText, queryByText, getByTestId } = await renderWithProviders(
      <LevelUpModal
        visible={true}
        character={sampleChar40Homebrew}
        classEntity={combatenteClass}
        trackEntity={aniquiladorTrack}
        allTracksList={allTracks}
        allPowersList={allPowers}
        allRitualsList={allRituals}
        userProfile={{
          id: 'test_u_hb',
          playerName: 'Pedro',
          cloudSyncEnabled: false,
          updatedAt: new Date().toISOString(),
          transcendEvery5Nex: true,
        }}
        onClose={() => {}}
        onApplyLevelUp={() => {}}
      />
    );

    // Deve exibir o card de Transcender opcional
    assert.ok(getByText(/Transcender: Escolha 1 Poder Paranormal \(Opcional\)/i));
    assert.ok(getByText(/Desejo Transcender neste avanço/i));

    // Inicialmente, sem selecionar poder: ganho normal de Sanidade mantido (+3 SAN)
    assert.ok(getByText(/\+3 SAN/i));

    // Encontra o primeiro poder paranormal e clica nele
    const firstParaPower = allPowers.find((p) => {
      const sub = (p.subCategory || '').toLowerCase();
      const isClass = sub.includes('combatente') || sub.includes('especialista') || sub.includes('ocultista');
      return sub.includes('paranormal') || (!isClass && p.element && p.element !== 'Nenhum');
    });
    assert.ok(firstParaPower, 'Deve encontrar ao menos um poder paranormal');

    const cardPara = getByTestId(`levelup-para-power-${firstParaPower.id}`);
    assert.ok(cardPara, 'Card do poder paranormal deve estar renderizado');
    await fireClick(cardPara);

    // Após selecionar poder paranormal: Sanidade fica +0 SAN
    assert.ok(getByText(/\+0 SAN/i));
    assert.ok(getByText(/Transcendeu \(sem ganho SAN\)/i));
  });
});