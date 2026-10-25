import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractKeywords,
  retrieveAiKnowledge,
  resolveRelicPersona,
} from '../src/services/ai/AiKnowledgeRetrieval';
import {
  cleanInternalTags,
  cleanLatex,
  getEffectiveApiKey,
  hasDefaultApiKey,
  isUsingDefaultApiKey,
  mapBookTitleToId,
  parseCitationsAndActions,
  testAiConnection,
} from '../src/services/ai/AiClient';
import { generateOfflineResponse } from '../src/services/ai/AiOfflineEngine';
import { DEFAULT_AI_CONFIG, RELIC_PERSONAS } from '../src/types/ai';
import { CharacterSheet } from '../src/types/compendium';

describe('G.L.I.T.C.H. - Extração de Palavras-Chave e RAG (AiKnowledgeRetrieval.ts)', () => {
  test('extractKeywords deve filtrar stopwords e pontuação mantendo termos essenciais', () => {
    const keywords = extractKeywords('Como funciona o ritual de cicatrização no combate?');
    assert.ok(keywords.includes('ritual'));
    assert.ok(keywords.includes('cicatrizacao'));
    assert.ok(keywords.includes('combate'));
    assert.ok(!keywords.includes('como'));
    assert.ok(!keywords.includes('de'));
    assert.ok(!keywords.includes('no'));
  });

  test('extractKeywords deve preservar siglas essenciais de Ordem Paranormal (pv, pe, dt, vd, rd)', () => {
    const keywords = extractKeywords('Como calcular a DT do ritual com meu PE e PV?');
    assert.ok(keywords.includes('dt'));
    assert.ok(keywords.includes('pe'));
    assert.ok(keywords.includes('pv'));
    assert.ok(keywords.includes('ritual'));
    assert.ok(!keywords.includes('com'));
    assert.ok(!keywords.includes('meu'));
  });

  test('retrieveAiKnowledge deve recuperar dados do manual quando perguntado sobre o app', () => {
    const knowledge = retrieveAiKnowledge('como rolar dados no aplicativo?', DEFAULT_AI_CONFIG);
    assert.ok(knowledge.systemPrompt.includes('VOCÊ É G.L.I.T.C.H.'));
    assert.ok(knowledge.matchedManualSections.length > 0);
    assert.equal(knowledge.resolvedPersona, 'none');
  });

  test('retrieveAiKnowledge deve ativar O Anfitrião (Energia)', () => {
    const config = { ...DEFAULT_AI_CONFIG, relicPersona: 'anfitriao' as const };
    const knowledge = retrieveAiKnowledge('o que é sanidade?', config);
    assert.ok(knowledge.systemPrompt.includes('VOCÊ É O ANFITRIÃO!'));
    assert.ok(knowledge.systemPrompt.includes('Relíquia de Energia'));
    assert.ok(knowledge.systemPrompt.includes('REGRA ABSOLUTA DE OURO DO ANFITRIÃO'));
    assert.equal(knowledge.resolvedPersona, 'anfitriao');
  });

  test('retrieveAiKnowledge deve ativar A Magistrada (Conhecimento)', () => {
    const config = { ...DEFAULT_AI_CONFIG, relicPersona: 'magistrada' as const };
    const knowledge = retrieveAiKnowledge('quais são os rituais de primeiro círculo?', config);
    assert.ok(knowledge.systemPrompt.includes('VOCÊ É A MAGISTRADA!'));
    assert.ok(knowledge.systemPrompt.includes('Máscara do Desespero'));
    assert.ok(knowledge.systemPrompt.includes('REGRA ABSOLUTA DE OURO DA MAGISTRADA'));
    assert.equal(knowledge.resolvedPersona, 'magistrada');
  });

  test('retrieveAiKnowledge deve ativar O Deus da Morte (Morte)', () => {
    const config = { ...DEFAULT_AI_CONFIG, relicPersona: 'deus_da_morte' as const };
    const knowledge = retrieveAiKnowledge('como funciona a morte no sistema?', config);
    assert.ok(knowledge.systemPrompt.includes('VOCÊ É O DEUS DA MORTE!'));
    assert.ok(knowledge.systemPrompt.includes('Coração de Lodo'));
    assert.ok(knowledge.systemPrompt.includes('REGRA ABSOLUTA DE OURO DO DEUS DA MORTE'));
    assert.equal(knowledge.resolvedPersona, 'deus_da_morte');
  });

  test('retrieveAiKnowledge deve ativar O Diabo (Sangue)', () => {
    const config = { ...DEFAULT_AI_CONFIG, relicPersona: 'diabo' as const };
    const knowledge = retrieveAiKnowledge('como funciona ataque especial?', config);
    assert.ok(knowledge.systemPrompt.includes('VOCÊ É O DIABO!'));
    assert.ok(knowledge.systemPrompt.includes('Trono de Sangue'));
    assert.ok(knowledge.systemPrompt.includes('REGRA ABSOLUTA DE OURO DO DIABO'));
    assert.equal(knowledge.resolvedPersona, 'diabo');
  });

  test('resolveRelicPersona com random deve sortear uma das 4 relíquias', () => {
    const config = { ...DEFAULT_AI_CONFIG, relicPersona: 'random' as const };
    const resolved = resolveRelicPersona(config);
    assert.ok(['anfitriao', 'magistrada', 'deus_da_morte', 'diabo'].includes(resolved));
  });

  test('retrieveAiKnowledge deve injetar ficha do agente quando fornecida', () => {
    const mockAgent: CharacterSheet = {
      id: 'agent-123',
      name: 'Arthur Cervero',
      player: 'Guerreiro de Energia',
      classId: 'Combatente',
      trackId: 'Aniquilador',
      originId: 'Mercenário',
      rank: 'Operador',
      affinity: 'Energia',
      nex: 35,
      defenseBonus: 22,
      attributes: { AGI: 3, FOR: 4, INT: 1, PRE: 2, VIG: 3 },
      pvCurrent: 55,
      pvMax: 55,
      sanCurrent: 30,
      sanMax: 30,
      peCurrent: 18,
      peMax: 18,
      skills: {
        Luta: { degree: 10, bonus: 10 },
        Pontaria: { degree: 5, bonus: 5 },
      },
      entityIds: [],
      notes: '',
      updatedAt: '2026-01-01',
    };

    const knowledge = retrieveAiKnowledge('qual o meu bônus de ataque?', DEFAULT_AI_CONFIG, mockAgent);
    assert.ok(knowledge.systemPrompt.includes('Arthur Cervero'));
    assert.ok(knowledge.systemPrompt.includes('Combatente'));
    assert.ok(knowledge.systemPrompt.includes('NEX: 35%'));
    assert.ok(knowledge.systemPrompt.includes('Luta (+10)'));
  });

  test('retrieveAiKnowledge deve incluir instruções personalizadas quando configuradas', () => {
    const customConfig = {
      ...DEFAULT_AI_CONFIG,
      customInstructions: 'Responda sempre em rimas macabras.',
    };
    const knowledge = retrieveAiKnowledge('o que é o paranormal?', customConfig);
    assert.ok(knowledge.systemPrompt.includes('INSTRUÇÕES ADICIONAIS DO USUÁRIO:'));
    assert.ok(knowledge.systemPrompt.includes('Responda sempre em rimas macabras.'));
  });

  test('RELIC_PERSONAS deve definir cores canônicas: Anfitrião roxo e Deus da Morte cinza', () => {
    // O Anfitrião (Energia) é roxo elétrico
    assert.equal(RELIC_PERSONAS.anfitriao.color, '#A855F7');
    assert.equal(RELIC_PERSONAS.anfitriao.element, 'Energia');

    // O Deus da Morte (Morte) é cinza/lodo
    assert.equal(RELIC_PERSONAS.deus_da_morte.color, '#94A3B8');
    assert.equal(RELIC_PERSONAS.deus_da_morte.element, 'Morte');

    // O Diabo (Sangue) é vermelho
    assert.equal(RELIC_PERSONAS.diabo.color, '#DC2626');
    assert.equal(RELIC_PERSONAS.diabo.element, 'Sangue');

    // A Magistrada (Conhecimento) é dourado
    assert.equal(RELIC_PERSONAS.magistrada.color, '#EAB308');
    assert.equal(RELIC_PERSONAS.magistrada.element, 'Conhecimento');
  });
});

describe('G.L.I.T.C.H. - Parser de Citações e Ações (AiClient.ts)', () => {
  test('mapBookTitleToId deve mapear nomes de livros para IDs canônicos', () => {
    assert.equal(mapBookTitleToId('Livro Base'), 'livro_base');
    assert.equal(mapBookTitleToId('Sobrevivendo ao Horror'), 'sobrevivendo_ao_horror');
    assert.equal(mapBookTitleToId('Arquivos Secretos #01'), 'arquivos_secretos_01');
    assert.equal(mapBookTitleToId('Arquivos Secretos 03'), 'arquivos_secretos_03');
  });

  test('parseCitationsAndActions deve extrair citações de páginas de livros em botões clicáveis', () => {
    const text = 'De acordo com o [Livro Base, Pág. 84], o dano de queda é letal. Veja também [Sobrevivendo ao Horror, Pág. 12].';
    const { citations, actions } = parseCitationsAndActions(text);

    assert.equal(citations.length, 2);
    assert.equal(citations[0].bookId, 'livro_base');
    assert.equal(citations[0].pageNumber, 84);

    const openBookActions = actions.filter((a) => a.type === 'open_book');
    assert.equal(openBookActions.length, 2);
    assert.equal(openBookActions[0].payload.bookId, 'livro_base');
    assert.equal(openBookActions[0].payload.pageNumber, 84);
  });

  test('parseCitationsAndActions deve extrair entidades, rolagens e abas', () => {
    const text = 'Use o ritual [Entidade: Cicatrização] e depois faça [Rolar: 3d20+5]. Para forjar, vá em [Aba: weapons].';
    const { actions } = parseCitationsAndActions(text);

    const entityAction = actions.find((a) => a.type === 'open_entity');
    assert.ok(entityAction);
    assert.equal(entityAction?.payload.entityId, 'Cicatrização');

    const diceAction = actions.find((a) => a.type === 'roll_dice');
    assert.ok(diceAction);
    assert.equal(diceAction?.payload.formula, '3d20+5');

    const tabAction = actions.find((a) => a.type === 'navigate_tab');
    assert.ok(tabAction);
    assert.equal(tabAction?.payload.tabName, 'weapons');
  });

  test('testAiConnection deve validar modo offline imediatamente com sucesso', async () => {
    const res = await testAiConnection({ ...DEFAULT_AI_CONFIG, provider: 'offline' });
    assert.equal(res.success, true);
    assert.ok(res.message.includes('Modo Offline'));
  });

  test('testAiConnection deve falhar se não houver chave para gemini', async () => {
    const origEnv = process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
    try {
      delete process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
      const res = await testAiConnection({ ...DEFAULT_AI_CONFIG, provider: 'gemini', apiKey: '' });
      assert.equal(res.success, false);
      assert.ok(res.message.includes('Insira a chave'));
    } finally {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = origEnv;
    }
  });

  test('getEffectiveApiKey deve priorizar a chave informada pelo usuário', () => {
    const origEnv = process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
    try {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = 'chave-padrao-sistema-123';
      const config = { ...DEFAULT_AI_CONFIG, provider: 'gemini' as const, apiKey: 'chave-pessoal-usuario-456' };
      assert.equal(getEffectiveApiKey(config), 'chave-pessoal-usuario-456');
      assert.equal(isUsingDefaultApiKey(config), false);
    } finally {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = origEnv;
    }
  });

  test('getEffectiveApiKey deve recorrer à chave padrão do sistema se o usuário deixar em branco', () => {
    const origEnv = process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
    try {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = 'chave-padrao-sistema-123';
      const config = { ...DEFAULT_AI_CONFIG, provider: 'gemini' as const, apiKey: '' };
      assert.equal(getEffectiveApiKey(config), 'chave-padrao-sistema-123');
      assert.equal(hasDefaultApiKey('gemini'), true);
      assert.equal(isUsingDefaultApiKey(config), true);
    } finally {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = origEnv;
    }
  });

  test('getEffectiveApiKey deve retornar vazio caso não haja chave pessoal nem chave padrão', () => {
    const origEnv = process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
    try {
      delete process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY;
      const config = { ...DEFAULT_AI_CONFIG, provider: 'gemini' as const, apiKey: '' };
      assert.equal(getEffectiveApiKey(config), '');
      assert.equal(hasDefaultApiKey('gemini'), false);
      assert.equal(isUsingDefaultApiKey(config), false);
    } finally {
      process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY = origEnv;
    }
  });

  test('cleanLatex deve converter equações LaTeX em texto limpo e legível', () => {
    const raw = '$$(\\text{Dano Base Modificado: } 3d8 + 2) \\times 3$$';
    const cleaned = cleanLatex(raw);
    assert.equal(cleaned, '(Dano Base Modificado: 3d8 + 2) × 3');
  });

  test('cleanInternalTags deve remover LaTeX e tags de abas coladas no final de cálculos', () => {
    const raw = `Cálculo de Dano Crítico (x3):
    $$(\\text{Dano Base Modificado: } 3d8 + 2) \\times 3$$
    $$\\text{Dano Final Brutal: } 9d8+6$$ [Aba: dice]`;

    const cleaned = cleanInternalTags(raw);

    assert.ok(!cleaned.includes('$$'));
    assert.ok(!cleaned.includes('\\text'));
    assert.ok(!cleaned.includes('\\times'));
    assert.ok(!cleaned.includes('[Aba: dice]'));
    assert.ok(cleaned.includes('(Dano Base Modificado: 3d8 + 2) × 3'));
    assert.ok(cleaned.includes('Dano Final Brutal: 9d8+6'));
    // Não deve conter 'Rolador de Dados' solto/colado na fórmula
    assert.ok(!cleaned.includes('9d8+6 Rolador de Dados'));
  });

  test('cleanInternalTags deve higienizar texto que já contém Rolador de Dados colado após $$', () => {
    const raw = `Cálculo de Dano Crítico (x3):
    $$(\\text{Dano Base Modificado: } 3d8 + 2) \\times 3$$
    $$\\text{Dano Final Brutal: } 9d8+6$$ Rolador de Dados`;

    const cleaned = cleanInternalTags(raw);

    assert.ok(!cleaned.includes('$$'));
    assert.ok(cleaned.includes('Dano Final Brutal: 9d8+6'));
    assert.ok(!cleaned.includes('9d8+6 Rolador de Dados'));
  });
});

describe('G.L.I.T.C.H. - Motor Offline de Relíquias (AiOfflineEngine.ts)', () => {
  test('generateOfflineResponse deve gerar resposta com tom neutro do G.L.I.T.C.H. por padrão', () => {
    const knowledge = retrieveAiKnowledge('como rolar dados?', DEFAULT_AI_CONFIG);
    const msg = generateOfflineResponse('como rolar dados?', knowledge, 'none');

    assert.ok(msg.content.includes('[MODO OFFLINE — G.L.I.T.C.H.]'));
    assert.equal(msg.role, 'assistant');
    assert.equal(msg.relicPersona, 'none');
  });

  test('generateOfflineResponse deve adotar a voz do Anfitrião quando ativado', () => {
    const knowledge = retrieveAiKnowledge('como rolar dados?', { ...DEFAULT_AI_CONFIG, relicPersona: 'anfitriao' });
    const msg = generateOfflineResponse('como rolar dados?', knowledge, 'anfitriao');

    assert.ok(msg.content.includes('O ANFITRIÃO'));
    assert.ok(msg.content.includes('SENHORAS E SENHORES DO CAOS'));
    assert.equal(msg.role, 'assistant');
    assert.equal(msg.relicPersona, 'anfitriao');
  });

  test('generateOfflineResponse deve adotar a voz da Magistrada (Conhecimento)', () => {
    const knowledge = retrieveAiKnowledge('como funciona sanidade?', { ...DEFAULT_AI_CONFIG, relicPersona: 'magistrada' });
    const msg = generateOfflineResponse('como funciona sanidade?', knowledge, 'magistrada');

    assert.ok(msg.content.includes('TRIBUNAL DO EQUILÍBRIO'));
    assert.ok(msg.content.includes('Máscara do Desespero'));
    assert.equal(msg.relicPersona, 'magistrada');
  });

  test('generateOfflineResponse deve adotar a voz do Deus da Morte (Morte)', () => {
    const knowledge = retrieveAiKnowledge('como funciona iniciativa?', { ...DEFAULT_AI_CONFIG, relicPersona: 'deus_da_morte' });
    const msg = generateOfflineResponse('como funciona iniciativa?', knowledge, 'deus_da_morte');

    assert.ok(msg.content.includes('TEMPO ESCORRE NO LODO'));
    assert.ok(msg.content.includes('Coração de Lodo'));
    assert.equal(msg.relicPersona, 'deus_da_morte');
  });

  test('generateOfflineResponse deve adotar a voz do Diabo (Sangue)', () => {
    const knowledge = retrieveAiKnowledge('como funciona ataque especial?', { ...DEFAULT_AI_CONFIG, relicPersona: 'diabo' });
    const msg = generateOfflineResponse('como funciona ataque especial?', knowledge, 'diabo');

    assert.ok(msg.content.includes('SANGUE FERVILHA NO TRONO'));
    assert.ok(msg.content.includes('Trono de Sangue'));
    assert.equal(msg.relicPersona, 'diabo');
  });

  test('generateOfflineResponse deve citar o livro fonte correto de uma entidade', () => {
    const mockKnowledge = {
      systemPrompt: '',
      citations: [],
      matchedEntities: [
        {
          id: 'ent_horror_1',
          name: 'Lâmina de Medo',
          category: 'ritual',
          bookTitle: 'Sobrevivendo ao Horror',
          pageNumber: 42,
          description: 'Cria uma lâmina etérea.',
        } as any,
      ],
      matchedManualSections: [],
      resolvedPersona: 'none' as const,
    };
    const msg = generateOfflineResponse('lâmina de medo', mockKnowledge, 'none');
    assert.ok(msg.content.includes('Fonte: Sobrevivendo ao Horror — [Sobrevivendo ao Horror, Pág. 42]'));
    assert.ok(!msg.content.includes('[Livro Base, Pág. 42]'));
  });
});
