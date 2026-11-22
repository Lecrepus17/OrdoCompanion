import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import OracleScreen from '../src/app/(tabs)/oracle';
import { AiChatMessageItem } from '../src/components/AiChatMessageItem';
import { AiConfigModal } from '../src/components/AiConfigModal';
import { DEFAULT_AI_CONFIG } from '../src/types/ai';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import { setMobilePlatform } from './setup';

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

  test('AiConfigModal deve renderizar controles de voz (STT, TTS, leitura automática e filtro militar)', async () => {
    let savedConfig: any = null;

    const { getByText, queryByText } = await renderWithProviders(
      <AiConfigModal
        visible={true}
        config={{
          ...DEFAULT_AI_CONFIG,
          voiceEnabled: true,
          voiceAutoRead: true,
          voiceMilitaryTone: true,
        }}
        onSave={(cfg) => {
          savedConfig = cfg;
        }}
        onClose={() => {}}
      />
    );

    // Seção de Comandos e Respostas por Voz
    assert.ok(queryByText(/Comandos e Respostas por Voz/i));
    assert.ok(queryByText(/Ativar Comando e Resposta por Voz/i));

    // Opções quando a voz está ativada
    assert.ok(queryByText(/Leitura Automática de Respostas \(TTS\)/i));
    assert.ok(queryByText(/Filtro de Tom & Estática Militar/i));
    assert.ok(queryByText(/Ouvir Prévia de Voz/i));

    // Clica em Salvar Configurações
    const saveBtn = getByText('Salvar Configurações');
    assert.ok(saveBtn);
    await fireClick(saveBtn);

    assert.ok(savedConfig);
    assert.equal(savedConfig.voiceEnabled, true);
    assert.equal(savedConfig.voiceAutoRead, true);
    assert.equal(savedConfig.voiceMilitaryTone, true);
  });

  test('OracleScreen deve renderizar o botão de microfone na barra de mensagem', async () => {
    const { container } = await renderWithProviders(<OracleScreen />);

    const micBtn = container.querySelector('[data-testid="voice-mic-button"]');
    assert.ok(micBtn, 'Botão de microfone deve estar presente na barra de mensagens');
  });

  test('OracleScreen deve ativar microfone nativo no Android e preencher o texto ditado', async () => {
    const origNative = (globalThis as any).ExpoSpeechRecognitionModule;
    const listeners = new Map<string, Set<(ev: any) => void>>();
    let emitDictationResult: (() => void) | null = null;

    (globalThis as any).ExpoSpeechRecognitionModule = {
      isRecognitionAvailable: () => true,
      requestPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
      addListener: (eventName: string, handler: (ev: any) => void) => {
        if (!listeners.has(eventName)) listeners.set(eventName, new Set());
        listeners.get(eventName)!.add(handler);
        return {
          remove: () => {
            listeners.get(eventName)?.delete(handler);
          },
        };
      },
      start: () => {
        listeners.get('start')?.forEach((fn) => fn(null));
        emitDictationResult = () => {
          listeners.get('result')?.forEach((fn) =>
            fn({ isFinal: true, results: [{ transcript: 'Como conjurar Cicatrização?' }] })
          );
          listeners.get('end')?.forEach((fn) => fn(null));
        };
      },
      stop: () => {
        listeners.get('end')?.forEach((fn) => fn(null));
      },
      abort: () => {},
    };

    try {
      const { container, queryByText } = await renderWithProviders(<OracleScreen />, {
        mobile: 'android',
      });

      const micBtn = container.querySelector('[data-testid="voice-mic-button"]');
      assert.ok(micBtn, 'Botão de microfone deve existir no Android');

      await fireClick(micBtn!);

      assert.ok(emitDictationResult, 'Reconhecimento de voz nativo deve ter sido iniciado');
      assert.ok(queryByText(/Ouvindo comando de voz/i));

      await act(async () => {
        emitDictationResult?.();
      });

      const textarea = container.querySelector('textarea, input') as HTMLTextAreaElement | HTMLInputElement | null;
      assert.ok(textarea, 'Campo de texto deve existir');
      assert.equal(textarea!.value, 'Como conjurar Cicatrização?');
    } finally {
      (globalThis as any).ExpoSpeechRecognitionModule = origNative;
      setMobilePlatform('web');
    }
  });

  test('AiChatMessageItem deve renderizar o botão de Ouvir/Parar voz e acionar onSpeak', async () => {
    let spokenContent = '';
    let spokenId = '';

    const mockMessage: any = {
      id: 'msg_voice_test',
      role: 'assistant',
      content: 'Instrução tática do G.L.I.T.C.H.',
      timestamp: '19:00',
    };

    const { getByText, queryByText } = await renderWithProviders(
      <AiChatMessageItem
        message={mockMessage}
        onOpenBook={() => {}}
        onOpenEntity={() => {}}
        onRollDice={() => {}}
        onNavigateTab={() => {}}
        onSpeak={(content, id) => {
          spokenContent = content;
          spokenId = id;
        }}
        isSpeakingThis={false}
      />
    );

    const ouvirBtn = getByText('Ouvir');
    assert.ok(ouvirBtn);
    await fireClick(ouvirBtn);

    assert.equal(spokenContent, 'Instrução tática do G.L.I.T.C.H.');
    assert.equal(spokenId, 'msg_voice_test');
  });

  test('OracleScreen deve ocultar roleplay-mode-toggle no G.L.I.T.C.H. padrão e exibir ao selecionar Relíquia ou Personagem com padrão desativado', async () => {
    const { getByText, queryByText, queryByTestId } = await renderWithProviders(<OracleScreen />);

    // No G.L.I.T.C.H. padrão (especialista), o botão de roleplay livre não aparece
    assert.equal(queryByTestId('roleplay-mode-toggle'), null);

    // Seleciona Deus da Morte (Relíquia)
    const morteChip = getByText('Deus da Morte');
    await fireClick(morteChip);

    // Deve exibir o alternador com Compromisso com a Realidade (desativado por padrão)
    const toggleBtn = queryByTestId('roleplay-mode-toggle');
    assert.ok(toggleBtn, 'Botão roleplay-mode-toggle deve aparecer para Relíquias');
    assert.ok(queryByText(/Compromisso com a Realidade: Regras/i));
    assert.ok(queryByText(/Como funciona o envelhecimento e distorção temporal/i));

    // Ativa o Modo Roleplay Livre clicando no alternador
    await fireClick(toggleBtn!);

    assert.ok(queryByText(/Roleplay Livre Ativo \(Interpretação\)/i));
    assert.ok(queryByText(/tomar um café e conversar sobre a vida/i));

    // Desativa novamente voltando ao foco em regras
    await fireClick(queryByTestId('roleplay-mode-toggle')!);
    assert.ok(queryByText(/Compromisso com a Realidade: Regras/i));
  });

  test('AiConfigModal deve renderizar e persistir a opção Modo Roleplay Livre apenas para personas roleplay (desativado por padrão)', async () => {
    let savedConfig: any = null;

    const { getByText, queryByText, getByTestId, queryByTestId } = await renderWithProviders(
      <AiConfigModal
        visible={true}
        config={{ ...DEFAULT_AI_CONFIG }}
        onSave={(cfg) => {
          savedConfig = cfg;
        }}
        onClose={() => {}}
      />
    );

    // Na persona padrão (especialista), o switch de roleplay não aparece
    assert.equal(queryByTestId('config-roleplay-mode-switch'), null);

    // Seleciona uma persona capaz de roleplay dentro do modal (O Anfitrião)
    await fireClick(getByText('O Anfitrião'));

    assert.ok(queryByText(/Modo Roleplay Livre \(Desativar Compromisso com Regras\)/i));
    assert.ok(queryByText(/Desativado \(Padrão\): a IA segue o livro de regras/i));

    const switchEl = getByTestId('config-roleplay-mode-switch');
    const checkbox = (switchEl.tagName === 'INPUT' ? switchEl : switchEl.querySelector('input[type="checkbox"]')) as HTMLInputElement | null;
    assert.ok(checkbox, 'Switch deve renderizar input checkbox na web');
    await act(async () => {
      checkbox!.click();
    });

    assert.ok(queryByText(/Ativado: ao interpretar Personagens ou Relíquias/i));

    const saveBtn = getByText('Salvar Configurações');
    await fireClick(saveBtn);

    assert.ok(savedConfig);
    assert.equal(savedConfig.relicPersona, 'anfitriao');
    assert.equal(savedConfig.roleplayMode, true);
  });
});
