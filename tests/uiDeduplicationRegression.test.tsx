import './setup';
import React from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';
import CompendiumScreen from '../src/app/(tabs)/index';
import CharactersScreen from '../src/app/(tabs)/characters';
import MasterScreen from '../src/app/(tabs)/master';
import TableScreen from '../src/app/(tabs)/table';
import EntityDetailScreen from '../src/app/entity/[id]';
import EntityEditorScreen from '../src/app/entity/editor';
import CreateAgentModal from '../src/components/CreateAgentModal';
import { ItemEditorModal } from '../src/components/ItemEditorModal';
import { ThreatCreatorModal } from '../src/components/ThreatCreatorModal';
import { WeaponEditorModal } from '../src/components/WeaponEditorModal';
import ProtectionModal from '../src/components/ProtectionModal';
import PrintSheetModal from '../src/components/PrintSheetModal';
import { CriticalModePromptModal } from '../src/components/CriticalModePromptModal';
import { TableExportModal } from '../src/components/virtualTable/TableExportModal';
import { RecordImageExportModal } from '../src/components/cardImage/RecordImageExportModal';
import { AiChatMessageItem } from '../src/components/AiChatMessageItem';
import { PdfViewerModal } from '../src/components/PdfViewerModal';
import { DEFAULT_HIDDEN_TABS } from '../src/types/compendium';

describe('UI Deduplication Regression Suite (Lotes 1 a 5)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('Lote 1 & 2: CompendiumScreen, MasterScreen, TableScreen e CharactersScreen funcionam sem botões duplicados', async () => {
    // 1. CompendiumScreen: não possui botão Manual local duplicado; botão + abre criador de ameaça quando categoria = creature
    const compendium = await renderWithProviders(<CompendiumScreen />);
    const threatFilterChip = compendium.queryByText(/Criaturas/i) || compendium.queryByText(/Ameaças/i);
    assert.ok(threatFilterChip);
    await fireClick(threatFilterChip);
    assert.ok(compendium.getByTestId('btn-compendium-create-threat'));
    await cleanup();

    // 2. MasterScreen sem campanha ativa: não exibe botão duplicado "Nova Campanha" no header nem "Manual" local
    const master = await renderWithProviders(<MasterScreen />);
    assert.ok(master.getByText(/Criar Campanha da Ordem/i));
    assert.equal(master.queryByText(/^Nova Campanha$/i), null);
    await cleanup();

    // 3. TableScreen: botão único de exportar sessão no header (table-export-session-btn) e sem duplicata na aba Rolagens
    const table = await renderWithProviders(<TableScreen />);
    await fireClick(table.getByText(/Iniciar Mesa de Demonstração/i));
    assert.ok(table.getByTestId('table-export-session-btn'));
    await fireClick(table.getByText(/Rolagens/i));
    assert.equal(table.queryByTestId('table-export-rolls-btn'), null);
    await cleanup();

    // 4. CharactersScreen vazia: exibe apenas os cards de criação no emptyCard, sem topRow duplicada
    const chars = await renderWithProviders(<CharactersScreen />);
    assert.ok(chars.getByText(/Criar Agente Assistido/i));
    assert.equal(chars.queryByText(/^Criar Manual$/i), null);
    await cleanup();
  });

  it('Lote 1 & 2: EntityDetailScreen e EntityEditorScreen preservam Manual local e removem Voltar/Cancelar duplicados do Stack', async () => {
    const detail = await renderWithProviders(<EntityDetailScreen />);
    assert.equal(detail.queryByText(/Voltar ao Compêndio/i), null);
    await cleanup();

    const editor = await renderWithProviders(<EntityEditorScreen />);
    assert.ok(editor.getByText(/Manual/i));
    assert.equal(editor.queryByText(/^Cancelar$/i), null);
    await cleanup();
  });

  it('Lote 3: AiChatMessageItem remove ações open_book duplicadas das citações e botão inferior redundante de recolher', async () => {
    const message: any = {
      id: 'msg-1',
      role: 'assistant',
      content: 'Consulte o ritual Decadência no livro básico.',
      timestamp: new Date().toISOString(),
      citations: [
        {
          bookId: 'core',
          bookTitle: 'Livro Básico',
          pageNumber: 120,
          excerpt: 'Decadência - Morte 1',
        },
      ],
      suggestedActions: [
        {
          type: 'open_book',
          label: 'Abrir Livro Básico p. 120',
          payload: {
            bookId: 'core',
            pageNumber: 120,
          },
        },
        {
          type: 'roll_dice',
          label: 'Rolar 2d8+2',
          payload: {
            formula: '2d8+2',
          },
        },
      ],
    };

    const { getByText, queryByText } = await renderWithProviders(
      <AiChatMessageItem
        message={message}
        onOpenBook={() => {}}
        onOpenEntity={() => {}}
        onRollDice={() => {}}
        onNavigateTab={() => {}}
      />
    );

    const toggleBtn = getByText('Exibir');
    await fireClick(toggleBtn);

    // A ação open_book idêntica à citação foi filtrada, mantendo a ação roll_dice
    assert.equal(queryByText(/Abrir Livro Básico p\. 120/i), null);
    assert.ok(queryByText(/Rolar 2d8\+2/i));
    // O botão duplicado de rodapé "Recolher fontes e ações" foi removido (mantendo o botão superior "Ocultar")
    assert.equal(queryByText(/Recolher fontes e ações/i), null);
  });

  it('Lote 3: PdfViewerModal unifica controles de fechamento, maximização e zoom', async () => {
    let closed = false;
    const { getByTestId, getByText, queryByText } = await renderWithProviders(
      <PdfViewerModal
        visible={true}
        book={{
          id: 'core',
          title: 'Ordem Paranormal RPG - Livro Básico',
          shortTitle: 'Livro Básico',
          fileName: 'Ordem Paranormal RPG - v1.1.pdf',
          totalPages: 336,
          isUnlocked: true,
          entityCount: 500,
        } as any}
        initialPage={10}
        initialMode="text"
        onClose={() => {
          closed = true;
        }}
      />
    );

    // Seleciona layout Página Única p/ testar A-/A+ exclusivo do modo maximizado
    await fireClick(getByText(/Página Única/i));

    const maxBtn = getByTestId('btn-toggle-maximize-pdf');
    assert.ok(maxBtn);
    // A barra A-/A+ só aparece no modo maximizado
    assert.equal(queryByText(/^A-$/), null);
    await fireClick(maxBtn);
    assert.ok(getByText(/^A-$/));

    // Sai do modo maximizado e clica em Voltar
    await fireClick(getByTestId('btn-restore-maximize-pdf'));
    const backBtn = getByTestId('pdf-viewer-back-button');
    await fireClick(backBtn);
    assert.equal(closed, true);
  });

  it('Lote 4: Modais de criação/edição (CreateAgent, ItemEditor, ThreatCreator, WeaponEditor, Protection) operam sem botões duplicados', async () => {
    // 1. CreateAgentModal: X fecha em qualquer passo; Voltar no rodapé volta 1 passo
    let agentClosed = false;
    const agentModal = await renderWithProviders(
      <CreateAgentModal
        visible={true}
        originsList={[]}
        classesList={[]}
        ritualsList={[]}
        onClose={() => {
          agentClosed = true;
        }}
        onFinish={() => {}}
      />
    );
    const closeAgentBtn = agentModal.getByTestId('btn-close-create-agent');
    await fireClick(closeAgentBtn);
    assert.equal(agentClosed, true);
    await cleanup();

    // 2. ItemEditorModal: não lista mecânicas passivas duplicadas nos chips da Etapa 6
    const itemModal = await renderWithProviders(
      <ItemEditorModal
        visible={true}
        initialCategory="item_geral"
        onClose={() => {}}
        onSave={() => {}}
      />
    );
    assert.equal(itemModal.queryByTestId('btn-item-mechanic-load_bonus'), null);
    assert.equal(itemModal.queryByTestId('btn-item-mechanic-block_rd_bonus'), null);
    assert.equal(itemModal.queryByTestId('btn-item-mechanic-skill_bonus'), null);
    await cleanup();

    // 3. ThreatCreatorModal: botão único de salvar no cabeçalho e botão de balancear dinâmico
    let threatClosed = false;
    const threatModal = await renderWithProviders(
      <ThreatCreatorModal
        visible={true}
        onClose={() => {
          threatClosed = true;
        }}
        onSave={() => {}}
      />
    );
    assert.ok(threatModal.getByTestId('btn-save-threat-creator'));
    assert.ok(threatModal.getByText(/Balancear p\/ VD/i));
    assert.equal(threatModal.queryByText(/^Salvar Ameaça$/i), null);
    await fireClick(threatModal.getByTestId('btn-close-threat-creator'));
    assert.equal(threatClosed, true);
    await cleanup();

    // 4. WeaponEditorModal: botão único de salvar no cabeçalho com label customizado
    const weaponModal = await renderWithProviders(
      <WeaponEditorModal
        visible={true}
        saveButtonLabel="Salvar no Arsenal"
        onClose={() => {}}
        onSave={() => {}}
      />
    );
    const saveWeaponBtn = weaponModal.getByTestId('weapon-editor-save-btn');
    assert.ok(saveWeaponBtn.textContent?.includes('Salvar no Arsenal'));
    await cleanup();

    // 5. ProtectionModal: botão único de fechar no cabeçalho (sem Cancelar duplicado no rodapé)
    let protClosed = false;
    const protModal = await renderWithProviders(
      <ProtectionModal
        visible={true}
        character={{
          id: 'c1',
          name: 'Agente Teste',
          class: 'Combatente',
          nex: 15,
          origin: 'Acadêmico',
          attributes: { AGI: 2, FOR: 2, INT: 2, PRE: 2, VIG: 2 },
          stats: {
            pv: { current: 20, max: 20, temp: 0 },
            pe: { current: 5, max: 5, temp: 0 },
            san: { current: 12, max: 12, temp: 0 },
          },
          defense: { armorBonus: 0, shieldBonus: 0, otherBonus: 0, armorName: '' },
          skills: {},
          attacks: [],
          abilities: [],
          inventory: [],
          rituals: [],
        } as any}
        onClose={() => {
          protClosed = true;
        }}
        onApply={() => {}}
      />
    );
    assert.equal(protModal.queryByText(/^Cancelar$/i), null);
    await fireClick(protModal.getByTestId('btn-close-modal'));
    assert.equal(protClosed, true);
  });

  it('Lote 5: DEFAULT_HIDDEN_TABS inclui support e modais utilitários (PrintSheet, CriticalMode, TableExport, RecordImageExport) funcionam sem duplicatas', async () => {
    assert.ok(DEFAULT_HIDDEN_TABS.includes('support'));

    // 1. PrintSheetModal sem botão Fechar duplicado no rodapé
    const printModal = await renderWithProviders(
      <PrintSheetModal
        visible={true}
        character={{
          id: 'c1',
          name: 'Agente Print',
          class: 'Especialista',
          nex: 10,
          origin: 'Acadêmico',
          attributes: { AGI: 2, FOR: 1, INT: 3, PRE: 2, VIG: 1 },
          stats: {
            pv: { current: 16, max: 16, temp: 0 },
            pe: { current: 6, max: 6, temp: 0 },
            san: { current: 16, max: 16, temp: 0 },
          },
          defense: { armorBonus: 0, shieldBonus: 0, otherBonus: 0 },
          skills: {},
          attacks: [],
          abilities: [],
          inventory: [],
          rituals: [],
        } as any}
        onClose={() => {}}
      />
    );
    assert.equal(printModal.queryByText(/^Fechar$/i), null);
    await cleanup();

    // 2. CriticalModePromptModal mantém apenas botão Cancelar no rodapé
    let critCancelled = false;
    const critModal = await renderWithProviders(
      <CriticalModePromptModal
        visible={true}
        onSelect={() => {}}
        onClose={() => {
          critCancelled = true;
        }}
      />
    );
    await fireClick(critModal.getByTestId('btn-crit-choice-cancel'));
    assert.equal(critCancelled, true);
    await cleanup();

    // 3. TableExportModal mantém apenas X no cabeçalho
    let exportClosed = false;
    const tableExport = await renderWithProviders(
      <TableExportModal
        visible={true}
        virtualTable={{
          roomCode: 'ORDO01',
          hostId: 'h1',
          hostName: 'Mestre',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          combatants: [],
          currentRound: 1,
          activeTurnIndex: 0,
          isCombatActive: false,
          sharedNotes: '',
          pins: [],
          scenes: [],
        } as any}
        tableRecentRolls={[]}
        onClose={() => {
          exportClosed = true;
        }}
      />
    );
    assert.equal(tableExport.queryByText(/^Fechar$/i), null);
    await fireClick(tableExport.getByTestId('table-export-close-btn'));
    assert.equal(exportClosed, true);
    await cleanup();

    // 4. RecordImageExportModal no iOS oculta botão redundante de Salvar na Galeria e unifica em Compartilhar / Salvar
    const iosExport = await renderWithProviders(
      <RecordImageExportModal
        visible={true}
        target={{
          id: 'zumbi-sangue',
          name: 'Zumbi de Sangue',
          category: 'creature',
          element: 'Sangue',
          bookId: 'core',
          description: 'Criatura de Sangue.',
          vd: 20,
        } as any}
        onClose={() => {}}
      />,
      { mobile: 'ios' }
    );
    assert.equal(iosExport.queryByTestId('btn-download-card-image'), null);
    assert.ok(iosExport.getByTestId('btn-share-card-image').textContent?.includes('Compartilhar / Salvar'));
  });
});
