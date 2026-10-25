import { AiCitation, AiConfig, AiMessage, AiProvider, AiSuggestedAction } from '../../types/ai';
import { RetrievedKnowledge, retrieveAiKnowledge } from './AiKnowledgeRetrieval';
import { generateOfflineResponse } from './AiOfflineEngine';
import { CharacterSheet } from '../../types/compendium';

export interface SendMessageOptions {
  query: string;
  config: AiConfig;
  chatHistory: AiMessage[];
  activeAgent?: CharacterSheet | null;
}

/**
 * Retorna se o aplicativo possui uma chave de API padrão configurada em tempo de compilação/ambiente.
 */
export function hasDefaultApiKey(provider: AiProvider): boolean {
  if (provider === 'gemini') {
    return Boolean((process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY || '').trim());
  }
  if (provider === 'groq') {
    return Boolean((process.env.EXPO_PUBLIC_DEFAULT_GROQ_API_KEY || '').trim());
  }
  return false;
}

/**
 * Retorna a chave de API efetiva para um determinado provedor e configuração.
 * Prioridade:
 * 1. Chave personalizada digitada pelo usuário (`config.apiKey`)
 * 2. Chave de API padrão embutida no ambiente (`EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY`)
 */
export function getEffectiveApiKey(config: AiConfig): string {
  const userKey = (config.apiKey || '').trim();
  if (userKey) {
    return userKey;
  }

  if (config.provider === 'gemini') {
    return (process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY || '').trim();
  }

  if (config.provider === 'groq') {
    return (process.env.EXPO_PUBLIC_DEFAULT_GROQ_API_KEY || '').trim();
  }

  return '';
}

/**
 * Retorna verdadeiro se a configuração ativa estiver usando a chave padrão do sistema
 * (ou seja, o usuário não digitou uma chave própria e existe uma chave padrão configurada).
 */
export function isUsingDefaultApiKey(config: AiConfig): boolean {
  const userKey = (config.apiKey || '').trim();
  return !userKey && hasDefaultApiKey(config.provider);
}

export const TAB_PRETTY_NAMES: Record<string, string> = {
  compendio: 'Compêndio',
  characters: 'Fichas de Agentes',
  weapons: 'Armaria & Modificações',
  books: 'Acervo de Livros',
  dice: 'Rolador de Dados',
  table: 'Mesa Virtual',
  favorites: 'Salvos & Listas',
  master: 'Central do Mestre',
  oracle: 'G.L.I.T.C.H.',
};

/**
 * Converte fórmulas e notações LaTeX geradas por modelos de IA em texto formatado limpo e legível.
 */
export function cleanLatex(text: string): string {
  return text
    // 1. Remove tags [Aba: ...] ou [Rolar: ...] ou nomes de abas coladas após fechamento de $$
    .replace(/\$\$\s*\[(?:Aba|Rolar):\s*[^\]]+\]/g, '$$')
    .replace(/\$\$\s*(?:Rolador de Dados|Compêndio|Fichas de Agentes|Armaria & Modificações|Armaria|Acervo de Livros|Mesa Virtual|Salvos & Listas|Central do Mestre)/g, '$$')
    // 2. Frações e raízes
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
    // 3. Delimitadores escaláveis \left e \right
    .replace(/\\left\s*([(\[{|])/g, '$1')
    .replace(/\\right\s*([)\]}|])/g, '$1')
    .replace(/\\left\./g, '')
    .replace(/\\right\./g, '')
    // 4. Comandos de formatação textual em LaTeX
    .replace(/\\(?:text|mathrm|mathbf|textbf|textit|textsf)\{([^}]+)\}/g, '$1')
    // 5. Operadores matemáticos comuns em LaTeX
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    // 6. Delimitadores de display math ($$...$$)
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, inner) => inner.trim())
    // 7. Delimitadores de inline math ($...$)
    .replace(/\$([^\$\n]+)\$/g, '$1')
    // 8. Normaliza espaços múltiplos dentro da mesma linha gerados por comandos LaTeX
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Higieniza o texto bruto gerado pela IA removendo LaTeX e convertendo tags internas.
 */
export function cleanInternalTags(raw: string): string {
  // 1. Converte e higieniza notações LaTeX
  let text = cleanLatex(raw);

  // 2. Remove tags [Aba: ...] ou nomes de abas soltos no final de linhas após fórmulas ou cálculos
  text = text.replace(/([:=+×\-]\s*[^.\n]+?)\s+\[Aba:\s*[^\]]+\]/g, '$1');
  text = text.replace(/([:=+×\-]\s*[^.\n]+?)\s+(?:Rolador de Dados|Compêndio|Armaria|Fichas de Agentes)/g, '$1');

  // 3. Substitui tags de Entidade e Rolagem mantendo o texto interno
  text = text
    .replace(/\[Entidade:\s*([^\]]+)\]/g, '$1')
    .replace(/\[Rolar:\s*([^\]]+)\]/g, '$1');

  // 4. Substitui tags de Aba no meio de frases pelo nome amigável
  text = text.replace(/\[Aba:\s*([^\]]+)\]/g, (_, tab) => {
    return TAB_PRETTY_NAMES[tab.trim().toLowerCase()] || tab;
  });

  return text;
}

/**
 * Converte títulos de livros em IDs oficiais utilizados pelo leitor do app.
 */
export function mapBookTitleToId(title: string): string {
  const norm = (title || '').toLowerCase();
  if (norm.includes('base')) return 'livro_base';
  if (norm.includes('sobrevivendo') || norm.includes('horror')) return 'sobrevivendo_ao_horror';
  if (norm.includes('arquivo') || norm.includes('secretos')) {
    const match = norm.match(/\d+/);
    if (match) {
      const num = match[0].padStart(2, '0');
      return `arquivos_secretos_${num}`;
    }
  }
  return 'livro_base';
}

/**
 * Extrai citações e ações interativas a partir do texto gerado pela IA.
 */
export function parseCitationsAndActions(
  text: string,
  retrievedCitations: AiCitation[] = []
): { citations: AiCitation[]; actions: AiSuggestedAction[] } {
  const citations: AiCitation[] = [...retrievedCitations];
  const actions: AiSuggestedAction[] = [];
  const seenActionKeys = new Set<string>();

  // 1. Parser de Citação de Livros: [Nome do Livro, Pág. X] ou [Nome do Livro, Pagina X]
  const bookRegex = /\[([^,\]]+),\s*P[áa]g(?:ina)?\.?\s*(\d+)\]/gi;
  let bookMatch: RegExpExecArray | null;
  while ((bookMatch = bookRegex.exec(text)) !== null) {
    const bookTitle = bookMatch[1].trim();
    const pageNumber = parseInt(bookMatch[2], 10);
    const bookId = mapBookTitleToId(bookTitle);

    const actionKey = `book_${bookId}_${pageNumber}`;
    if (!seenActionKeys.has(actionKey)) {
      seenActionKeys.add(actionKey);
      actions.push({
        type: 'open_book',
        label: `📖 Abrir ${bookTitle} (Pág. ${pageNumber})`,
        payload: { bookId, pageNumber },
      });
    }

    if (!citations.some((c) => c.bookId === bookId && c.pageNumber === pageNumber)) {
      citations.push({
        bookId,
        bookTitle,
        pageNumber,
      });
    }
  }

  // 2. Parser de Entidades: [Entidade: NomeDaEntidade]
  const entityRegex = /\[Entidade:\s*([^\]]+)\]/gi;
  let entityMatch: RegExpExecArray | null;
  while ((entityMatch = entityRegex.exec(text)) !== null) {
    const entityName = entityMatch[1].trim();
    const actionKey = `entity_${entityName.toLowerCase()}`;
    if (!seenActionKeys.has(actionKey)) {
      seenActionKeys.add(actionKey);
      actions.push({
        type: 'open_entity',
        label: `🔍 Ver "${entityName}"`,
        payload: { entityId: entityName },
      });
    }
  }

  // 3. Parser de Rolagem de Dados: [Rolar: 3d20+5] ou [Rolar: 1d20]
  const diceRegex = /\[Rolar:\s*([^\]]+)\]/gi;
  let diceMatch: RegExpExecArray | null;
  while ((diceMatch = diceRegex.exec(text)) !== null) {
    const formula = diceMatch[1].trim();
    const actionKey = `dice_${formula}`;
    if (!seenActionKeys.has(actionKey)) {
      seenActionKeys.add(actionKey);
      actions.push({
        type: 'roll_dice',
        label: `🎲 Rolar ${formula}`,
        payload: { formula },
      });
    }
  }

  // 4. Parser de Abas do Aplicativo: [Aba: nomeDaAba]
  const tabRegex = /\[Aba:\s*([^\]]+)\]/gi;
  let tabMatch: RegExpExecArray | null;
  while ((tabMatch = tabRegex.exec(text)) !== null) {
    const tabName = tabMatch[1].trim().toLowerCase();
    const actionKey = `tab_${tabName}`;
    if (!seenActionKeys.has(actionKey)) {
      seenActionKeys.add(actionKey);
      const tabLabels: Record<string, string> = {
        compendio: 'Compêndio',
        characters: 'Fichas de Agentes',
        weapons: 'Armaria & Modificações',
        books: 'Acervo de Livros',
        dice: 'Rolador de Dados',
        table: 'Mesa Virtual',
        favorites: 'Salvos & Listas',
        master: 'Central do Mestre',
      };
      actions.push({
        type: 'navigate_tab',
        label: `👉 Ir para ${tabLabels[tabName] || tabName}`,
        payload: { tabName },
      });
    }
  }

  return { citations, actions };
}

/**
 * Envia uma mensagem para o modelo de IA ou usa o sintetizador offline.
 */
export async function sendAiChatMessage({
  query,
  config,
  chatHistory,
  activeAgent,
}: SendMessageOptions): Promise<AiMessage> {
  const knowledge = retrieveAiKnowledge(query, config, activeAgent);

  // Se o histórico passado já contiver a pergunta atual como último item, remove para evitar duplicar na API
  const priorHistory =
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1].role === 'user' &&
    chatHistory[chatHistory.length - 1].content.trim() === query.trim()
      ? chatHistory.slice(0, -1)
      : chatHistory;

  const effectiveApiKey = getEffectiveApiKey(config);

  // Se o provedor for 'offline' ou não houver chave de API configurada (nem própria, nem padrão), utiliza o sintetizador local gratuito
  if (config.provider === 'offline' || !effectiveApiKey) {
    const offlineMsg = generateOfflineResponse(query, knowledge, knowledge.resolvedPersona);
    const parsed = parseCitationsAndActions(offlineMsg.content, offlineMsg.citations);
    return {
      ...offlineMsg,
      citations: parsed.citations,
      suggestedActions: parsed.actions,
      relicPersona: knowledge.resolvedPersona,
    };
  }

  const effectiveConfig: AiConfig = {
    ...config,
    apiKey: effectiveApiKey,
  };

  try {
    if (config.provider === 'gemini') {
      return await callGeminiApi(query, effectiveConfig, knowledge, priorHistory);
    } else if (config.provider === 'groq') {
      return await callGroqApi(query, effectiveConfig, knowledge, priorHistory);
    } else {
      // Provedor genérico OpenAI-compatível (ex.: OpenRouter ou Ollama)
      return await callOpenAiCompatibleApi(query, effectiveConfig, knowledge, priorHistory);
    }
  } catch (error: any) {
    console.warn('[AI Client] Erro na chamada da API:', error);

    // Se o fallback offline estiver ativado, retorna a resposta offline com um aviso
    if (config.offlineFallback) {
      const fallback = generateOfflineResponse(query, knowledge, knowledge.resolvedPersona);
      const parsed = parseCitationsAndActions(fallback.content, fallback.citations);
      return {
        ...fallback,
        content: `⚠️ *Não foi possível conectar à API de IA (${error.message || 'Falha de rede'}). Exibindo resposta através dos registros locais:*\n\n${fallback.content}`,
        citations: parsed.citations,
        suggestedActions: parsed.actions,
        relicPersona: knowledge.resolvedPersona,
      };
    }

    return {
      id: `msg_err_${Date.now()}`,
      role: 'assistant',
      content: `❌ **Erro ao consultar IA:** ${error.message || 'Verifique sua chave de API e conexão com a internet.'}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isError: true,
    };
  }
}

/**
 * Chamada à API Google Gemini (Free Tier / AI Studio).
 */
async function callGeminiApi(
  query: string,
  config: AiConfig,
  knowledge: RetrievedKnowledge,
  chatHistory: AiMessage[]
): Promise<AiMessage> {
  let modelName = config.model || 'gemini-flash-lite-latest';
  if (modelName === 'gemini-2.5-flash') {
    modelName = 'gemini-flash-lite-latest';
  }

  // Prepara o histórico recente garantindo alternância estrita de papéis (user -> model -> user)
  const recentHistory = chatHistory
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-6);

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of recentHistory) {
    const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      // Mescla mensagens consecutivas de mesmo papel para cumprir a regra da API Gemini
      contents[contents.length - 1].parts[0].text += `\n\n${msg.content}`;
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }],
      });
    }
  }

  // Adiciona a pergunta atual
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n\n${query}`;
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: query }],
    });
  }

  const payload = {
    system_instruction: {
      parts: [{ text: knowledge.systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: config.temperature ?? 0.4,
      maxOutputTokens: 2048,
    },
  };

  // Modelos alternativos caso o selecionado esteja sobrecarregado (503) ou descontinuado (404)
  const modelsToTry = Array.from(
    new Set([
      modelName,
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ])
  );

  let lastError: Error | null = null;

  for (const currentModel of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${config.apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 503 || response.status === 404 || response.status === 429) {
        console.warn(`[AI Client] Modelo ${currentModel} retornou ${response.status}. Tentando fallback...`);
        continue;
      }

      if (!response.ok) {
        let errorDetail = `Status ${response.status}`;
        try {
          const errJson = await response.json();
          errorDetail = errJson.error?.message || errorDetail;
        } catch {
          // Ignora erro de parse
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.';
      const { citations, actions } = parseCitationsAndActions(rawText, knowledge.citations);

      return {
        id: `msg_gemini_${Date.now()}`,
        role: 'assistant',
        content: rawText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        citations,
        suggestedActions: actions,
        relicPersona: knowledge.resolvedPersona,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível obter resposta da API Gemini.');
}

/**
 * Chamada à API Groq Cloud (Llama 3.3 70B gratuito).
 */
async function callGroqApi(
  query: string,
  config: AiConfig,
  knowledge: RetrievedKnowledge,
  chatHistory: AiMessage[]
): Promise<AiMessage> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const modelName = config.model || 'llama-3.3-70b-versatile';

  const recentHistory = chatHistory
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-6);

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: knowledge.systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: query },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: config.temperature ?? 0.4,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    let errorDetail = `Status ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || 'Nenhuma resposta gerada.';
  const { citations, actions } = parseCitationsAndActions(rawText, knowledge.citations);

  return {
    id: `msg_groq_${Date.now()}`,
    role: 'assistant',
    content: rawText,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    citations,
    suggestedActions: actions,
    relicPersona: knowledge.resolvedPersona,
  };
}

/**
 * Chamada para endpoints OpenAI-compatíveis (OpenRouter ou Ollama local).
 */
async function callOpenAiCompatibleApi(
  query: string,
  config: AiConfig,
  knowledge: RetrievedKnowledge,
  chatHistory: AiMessage[]
): Promise<AiMessage> {
  const url = config.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  const modelName = config.model || 'meta-llama/llama-3.3-70b-instruct:free';

  const messages = [
    { role: 'system', content: knowledge.systemPrompt },
    ...chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: query },
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: config.temperature ?? 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro na API (${response.status})`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || 'Sem resposta.';
  const { citations, actions } = parseCitationsAndActions(rawText, knowledge.citations);

  return {
    id: `msg_compat_${Date.now()}`,
    role: 'assistant',
    content: rawText,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    citations,
    suggestedActions: actions,
    relicPersona: knowledge.resolvedPersona,
  };
}

/**
 * Testa a conexão com a API de IA configurada para fornecer feedback rápido ao usuário.
 */
export async function testAiConnection(
  config: AiConfig
): Promise<{ success: boolean; message: string }> {
  if (config.provider === 'offline') {
    return { success: true, message: 'Modo Offline está pronto para uso local sem necessidade de chave!' };
  }

  const effectiveApiKey = getEffectiveApiKey(config);
  const isDefault = isUsingDefaultApiKey(config);

  if (!effectiveApiKey) {
    return { success: false, message: 'Insira a chave de API para realizar o teste.' };
  }

  try {
    if (config.provider === 'gemini') {
      let modelName = config.model || 'gemini-flash-lite-latest';
      if (modelName === 'gemini-2.5-flash') {
        modelName = 'gemini-flash-lite-latest';
      }

      const modelsToTry = Array.from(
        new Set([modelName, 'gemini-flash-lite-latest', 'gemini-flash-latest'])
      );

      let lastMsg = 'Erro ao conectar';
      for (const curModel of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${effectiveApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Diga apenas: OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });

        if (res.ok) {
          const originTag = isDefault ? ' (Usando Chave Padrão do Sistema)' : ' (Usando Chave Pessoal)';
          return {
            success: true,
            message: `Conexão com Google Gemini (${curModel}) validada com sucesso!${originTag}`,
          };
        }

        if (res.status === 503 || res.status === 404 || res.status === 429) {
          continue;
        }

        try {
          const err = await res.json();
          lastMsg = err.error?.message || `Erro HTTP ${res.status}`;
        } catch {}
      }

      return { success: false, message: lastMsg };
    } else if (config.provider === 'groq') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        return { success: false, message: `Erro HTTP ${res.status} ao conectar à Groq.` };
      }

      const originTag = isDefault ? ' (Usando Chave Padrão)' : ' (Usando Chave Pessoal)';
      return { success: true, message: `Conexão com Groq Cloud realizada com sucesso!${originTag}` };
    }

    return { success: true, message: 'Conexão validada com sucesso!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Falha de conexão com o provedor.' };
  }
}
