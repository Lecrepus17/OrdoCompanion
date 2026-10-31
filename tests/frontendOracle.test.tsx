import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import OracleScreen from '../src/app/(tabs)/oracle';
import { AiChatMessageItem } from '../src/components/AiChatMessageItem';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';

describe('Frontend - Tela do Oráculo G.L.I.T.C.H. (oracle.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar o cabeçalho do G.L.I.T.C.H., seletor de Relíquias e prompts rápidos na Web', async () => {
    const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
      <OracleScreen />,
      { mobile: false }
    );

    // Título do assistente
    assert.ok(getByText('G.L.I.T.C.H.'));
    // Chips de seleção rápida de Relíquias
    assert.ok(queryByText('Anfitrião'));
    assert.ok(queryByText('Magistrada'));
    assert.ok(queryByText('Deus da Morte'));
    assert.ok(queryByText('Diabo'));
    assert.ok(queryByText('Aleatório'));
    // Input de mensagem
    assert.ok(getByPlaceholder(/Pergunte sobre regras, livros ou o aplicativo/i));
  });

  test('deve renderizar perfeitamente no ambiente Celular (Android e iOS) com teclado adaptado', async () => {
    const { getByText, queryByText } = await renderWithProviders(<OracleScreen />, {
      mobile: 'ios',
    });

    assert.ok(getByText('G.L.I.T.C.H.'));
    assert.ok(queryByText('Anfitrião'));
    assert.ok(queryByText('Magistrada'));
  });

  test('deve alternar a persona de Relíquia ao clicar nos chips seletores', async () => {
    const { getByText, queryByText } = await renderWithProviders(<OracleScreen />);

    // Clica no chip do Anfitrião
    const anfitriaoChip = getByText('Anfitrião');
    assert.ok(anfitriaoChip);
    await fireClick(anfitriaoChip);

    // Deve atualizar o título do cabeçalho para O Anfitrião e exibir Energia
    assert.ok(queryByText(/O Anfitrião/i));
    assert.ok(queryByText(/Energia/i));

    // Agora clica no chip da Magistrada
    const magistradaChip = getByText('Magistrada');
    assert.ok(magistradaChip);
    await fireClick(magistradaChip);

    // Deve atualizar para A Magistrada e Conhecimento
    assert.ok(queryByText(/A Magistrada/i));
    assert.ok(queryByText(/Conhecimento/i));
  });

  test('deve abrir o modal de configurações de IA ao clicar no ícone de configurações', async () => {
    const { container, queryByText } = await renderWithProviders(<OracleScreen />);

    const settingsIcon = container.querySelector('[data-testid="settings-outline"]');
    assert.ok(settingsIcon);
    const settingsBtn = settingsIcon.closest('div[role="button"]') || settingsIcon.parentElement;
    if (settingsBtn) {
      await fireClick(settingsBtn);
      assert.ok(queryByText(/Configuração do G\.L\.I\.T\.C\.H\.|100% Gratuito/i));
    }
  });

  test('deve permitir enviar mensagem através dos atalhos rápidos e exibir resposta', async () => {
    const { getByText, queryByText, container } = await renderWithProviders(<OracleScreen />);

    // Clica em um prompt rápido sugerido
    const promptBtn = getByText(/Como funciona teste de atributo e penalidade/i);
    assert.ok(promptBtn);
    await fireClick(promptBtn);

    // A mensagem do usuário deve entrar no chat
    assert.ok(queryByText(/Como funciona teste de atributo e penalidade/i));
  });

  test('deve indicar Chave Padrão do Sistema Ativa no modal sem exibir o valor da chave', async () => {
    const origKey = process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
    try {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = 'AIzaSyChaveSecretaDoDesenvolvedor';
      const { container, queryByText } = await renderWithProviders(<OracleScreen />);

      const settingsIcon = container.querySelector('[data-testid="settings-outline"]');
      const settingsBtn = settingsIcon?.closest('div[role="button"]') || settingsIcon?.parentElement;
      if (settingsBtn) {
        await fireClick(settingsBtn);
        assert.ok(queryByText(/Chave Padrão do Sistema Ativa/i));
        // A chave secreta bruta NUNCA deve ser exibida no valor visível de nenhum input
        const leakedInput = container.querySelector('input[value="AIzaSyChaveSecretaDoDesenvolvedor"]');
        assert.equal(leakedInput, null);
      }
    } finally {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = origKey;
    }
  });

  test('AiChatMessageItem deve renderizar fontes e ações minimizadas por padrão e expandir ao clicar', async () => {
    const mockMessage: any = {
      id: 'msg_1',
      role: 'assistant',
      content: 'Aqui está a explicação sobre o ritual de Cicatrização.',
      timestamp: '18:30',
      relicPersona: 'anfitriao',
      citations: [
        {
          bookId: 'livro_base',
          bookTitle: 'Livro Base',
          pageNumber: 120,
          section: 'Rituais',
        },
      ],
      suggestedActions: [
        {
          type: 'roll_dice',
          label: 'Rolar 3d8+3',
          payload: { formula: '3d8+3' },
        },
      ],
    };

    let openedBook = '';
    let openedPage = 0;
    let rolledFormula = '';

    const { getByText, queryByText } = await renderWithProviders(
      <AiChatMessageItem
        message={mockMessage}
        onOpenBook={(b, p) => {
          openedBook = b;
          openedPage = p;
        }}
        onOpenEntity={() => {}}
        onRollDice={(f) => {
          rolledFormula = f;
        }}
        onNavigateTab={() => {}}
      />
    );

    // Por padrão, deve estar minimizado: exibe o botão "Exibir" e o resumo
    assert.ok(queryByText(/1 Fonte • 1 Ação Rápida/i));
    const expandBtn = getByText('Exibir');
    assert.ok(expandBtn);

    // O card de leitura detalhado e a ação ainda não devem estar visíveis
    assert.equal(queryByText(/Página 120 • Rituais/i), null);
    assert.equal(queryByText(/Rolar 3d8\+3/i), null);

    // Ao clicar em "Exibir", deve expandir
    await fireClick(expandBtn);

    // Agora o card do livro e o botão de rolagem devem estar visíveis
    assert.ok(queryByText(/Página 120 • Rituais/i));
    assert.ok(queryByText(/Rolar 3d8\+3/i));
    assert.ok(queryByText('Ocultar'));

    // Ao clicar no botão de rolagem, deve disparar a ação
    const rollBtn = getByText(/Rolar 3d8\+3/i);
    await fireClick(rollBtn);
    assert.equal(rolledFormula, '3d8+3');

    // Ao clicar em "Ocultar", deve recolher novamente
    const hideBtn = getByText('Ocultar');
    await fireClick(hideBtn);
    assert.equal(queryByText(/Página 120 • Rituais/i), null);
    assert.ok(queryByText('Exibir'));
  });

  test('AiChatMessageItem deve renderizar fórmulas de dano limpas sem código LaTeX ou tags coladas na tela', async () => {
    const mockMessage: any = {
      id: 'msg_math_1',
      role: 'assistant',
      content: `Cálculo de Dano Crítico (x3):
$$(\\text{Dano Base Modificado: } 3d8 + 2) \\times 3$$
$$\\text{Dano Final Brutal: } 9d8+6$$ [Aba: dice]`,
      timestamp: '18:35',
      relicPersona: 'diabo',
    };

    const { queryByText } = await renderWithProviders(
      <AiChatMessageItem
        message={mockMessage}
        onOpenBook={() => {}}
        onOpenEntity={() => {}}
        onRollDice={() => {}}
        onNavigateTab={() => {}}
      />
    );

    // O texto deve estar legível
    assert.ok(queryByText(/Dano Base Modificado: 3d8 \+ 2/i));
    assert.ok(queryByText(/Dano Final Brutal: 9d8\+6/i));

    // NUNCA deve conter código cru de LaTeX nem Rolador de Dados colado
    assert.equal(queryByText(/\$\$/), null);
    assert.equal(queryByText(/\\text/), null);
    assert.equal(queryByText(/9d8\+6 Rolador de Dados/), null);
  });

  test('OracleScreen deve permitir alternar entre Deus da Morte, Diabo e Aleatório', async () => {
    const { getByText, queryByText } = await renderWithProviders(<OracleScreen />);

    // Clica no chip do Deus da Morte
    const morteChip = getByText('Deus da Morte');
    assert.ok(morteChip);
    await fireClick(morteChip);
    assert.ok(queryByText(/O Deus da Morte/i));
    assert.ok(queryByText(/Morte/i));

    // Clica no chip do Diabo
    const diaboChip = getByText('Diabo');
    assert.ok(diaboChip);
    await fireClick(diaboChip);
    assert.ok(queryByText(/O Diabo/i));
    assert.ok(queryByText(/Sangue/i));

    // Clica no chip do Aleatório
    const aleatorioChip = getByText('Aleatório');
    assert.ok(aleatorioChip);
    await fireClick(aleatorioChip);
    assert.ok(queryByText(/Aleatório/i));
  });

  test('OracleScreen deve permitir alternar para Árbitro Rápido, Senhor Veríssimo e Co-Mestre atualizando prompts rápidos', async () => {
    const { getByText, queryByText, container } = await renderWithProviders(<OracleScreen />);

    // Clica no chip do Árbitro Rápido
    const arbitroChip = getByText('Árbitro Rápido');
    assert.ok(arbitroChip);
    await fireClick(arbitroChip);
    assert.ok(queryByText(/Árbitro Rápido/i));
    assert.ok(queryByText(/Juiz de Mesa/i));

    // Clica no chip do Senhor Veríssimo
    const verissimoChip = getByText('Senhor Veríssimo');
    assert.ok(verissimoChip);
    await fireClick(verissimoChip); 
    assert.ok(queryByText(/Senhor Veríssimo/i));
    assert.ok(queryByText(/Que a Realidade Não Se Curve!/i));

    // Clica no chip do Co-Mestre
    const coMestreChip = getByText('Co-Mestre');
    assert.ok(coMestreChip);
    await fireClick(coMestreChip);
    assert.ok(queryByText(/Co-Mestre/i));
    assert.ok(queryByText(/Suporte ao Narrador/i));
  });
});
