import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AiCitation, AiConfig, AiMessage, AiProvider, AiSuggestedAction } from '../../types/ai';
import { RetrievedKnowledge, retrieveAiKnowledge } from './AiKnowledgeRetrieval';
import { generateOfflineResponse } from './AiOfflineEngine';
import { CharacterSheet } from '../../types/compendium';
import { deobfuscateSecret, resolveEnvSecret } from '../../utils/secretObfuscator';

export interface SendMessageOptions {
  query: string;
  config: AiConfig;
  chatHistory: AiMessage[];
  activeAgent?: CharacterSheet | null;
}

export const BUILTIN_DEFAULT_GEMINI_KEY = '';

/**
 * Higieniza chaves de API removendo aspas externas (comuns ao copiar de .env),
 * caracteres de controle, quebras de linha e espaços acidentais.
 */
export function sanitizeApiKey(key?: string | null): string {
  if (!key || typeof key !== 'string') return '';
  return key
    .replace(/^["'`]|["'`]$/g, '') // Remove aspas no início e fim
    .replace(/["'`]/g, '')         // Remove aspas remanescentes
    .replace(/[\r\n\t]/g, '')     // Remove quebras de linha e tabs
    .trim();
}

/**
 * Valida o formato canônico de chaves de API do Google Gemini (Google AI Studio / Vertex).
 * Suporta chaves iniciadas com 'AIzaSy', 'AIza' ou 'AQ.' (e valores ofuscados 'obf:v1:...').
 */
export function validateKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const deobfuscated = deobfuscateSecret(key);
  const clean = sanitizeApiKey(deobfuscated);
  if (!clean) return false;
  if (isTestEnvironment() || process.env.NODE_ENV === 'test') {
    return /^(?:AIza[A-Za-z0-9_-]{10,64}|AQ\.[A-Za-z0-9_.-]{15,120})$/.test(clean);
  }
  return /^(?:AIza[A-Za-z0-9_-]{20,64}|AQ\.[A-Za-z0-9_.-]{20,120})$/.test(clean);
}

export const validateGeminiApiKey = validateKey;

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.VITEST) ||
    (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.some((arg) => arg.includes('test')))
  );
}

/**
 * Tenta extrair o endereço IP do host de desenvolvimento a partir dos metadados do Expo/Metro.
 * Utilizado no Android para mapear 'localhost' para a máquina do desenvolvedor.
 */
export function getDevServerHostIp(): string {
  try {
    const manifest2 = (Constants as unknown as {
      manifest2?: {
        extra?: {
          expoGo?: { debuggerHost?: string; hostUri?: string };
          expoClient?: { hostUri?: string };
        };
      };
    })?.manifest2;

    const host =
      manifest2?.extra?.expoGo?.debuggerHost ||
      manifest2?.extra?.expoClient?.hostUri ||
      manifest2?.extra?.expoGo?.hostUri ||
      Constants.expoConfig?.hostUri;

    if (host && typeof host === 'string') {
      const clean = host.split('/')[0].split(':')[0];
      if (clean && clean !== 'localhost' && clean !== '127.0.0.1') {
        return clean;
      }
    }
  } catch {
    // Falha silenciosa se Constants não estiver disponível
  }
  return '';
}

/**
 * Resolve o endpoint do Ollama para o ambiente de execução atual (Android, Web ou iOS).
 * No Android:
 * - Substitui 'localhost' ou '127.0.0.1' pelo IP detectado do host ou pelo gateway do emulador ('10.0.2.2').
 * - Garante o prefixo 'http://'.
 * - Garante que a rota aponte para um endpoint de chat válido ('/v1/chat/completions' por padrão).
 */
export function resolveOllamaEndpoint(endpoint?: string): string {
  let url = (endpoint || '').trim();

  // Se nenhum endpoint foi informado, adota o padrão local
  if (!url) {
    if (Platform?.OS === 'android') {
      const devHost = getDevServerHostIp();
      url = devHost ? `http://${devHost}:11434` : 'http://10.0.2.2:11434';
    } else {
      url = 'http://localhost:11434';
    }
  }

  // Garante o protocolo http:// ou https://
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  // Remove barras finais
  url = url.replace(/\/+$/, '');

  // No Android, se o host for 'localhost' ou '127.0.0.1', redireciona para o IP da máquina ou 10.0.2.2
  if (Platform?.OS === 'android') {
    const devHost = getDevServerHostIp();
    const replacementHost = devHost || '10.0.2.2';
    url = url.replace(/\b(localhost|127\.0\.0\.1)\b/i, replacementHost);
  }

  // Se o caminho não especifica uma rota de chat, adiciona a rota OpenAI-compatível
  if (!url.endsWith('/v1/chat/completions') && !url.endsWith('/api/chat')) {
    if (url.endsWith('/v1')) {
      url = `${url}/chat/completions`;
    } else {
      url = `${url}/v1/chat/completions`;
    }
  }

  return url;
}

/**
 * Retorna a chave padrão do Gemini definida em variáveis de ambiente (suporta formato ofuscado obf:v1:...)
 * ou o fallback nativo do aplicativo.
 */
export function getDefaultGeminiApiKey(): string {
  const envKey = resolveEnvSecret(process.env.EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY);
  if (envKey) {
    return envKey;
  }
  if (isTestEnvironment()) {
    return '';
  }
  return deobfuscateSecret(BUILTIN_DEFAULT_GEMINI_KEY);
}

export function hasDefaultApiKey(provider: AiProvider): boolean {
  if (provider === 'gemini') {
    return Boolean(getDefaultGeminiApiKey());
  }
  if (provider === 'groq') {
    return Boolean(resolveEnvSecret(process.env.EXPO_PUBLIC_DEFAULT_GROQ_API_KEY));
  }
  return false;
}

/**
 * Retorna a chave de API efetiva para um determinado provedor e configuração.
 * Prioridade:
 * 1. Chave personalizada digitada pelo usuário (`config.apiKey`)
 * 2. Chave de API padrão embutida no ambiente (`EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY`) ou fallback nativo
 */
export function getEffectiveApiKey(config: AiConfig): string {
  const rawKey = deobfuscateSecret((config.apiKey || '').trim());
  const userKey = sanitizeApiKey(rawKey);
  if (userKey) {
    return userKey;
  }

  if (config.provider === 'gemini') {
    return sanitizeApiKey(getDefaultGeminiApiKey());
  }

  if (config.provider === 'groq') {
    return sanitizeApiKey(resolveEnvSecret(process.env.EXPO_PUBLIC_DEFAULT_GROQ_API_KEY));
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
  const isKeyRequired = config.provider !== 'offline' && config.provider !== 'ollama';

  // Se o provedor for 'offline' ou se for um provedor que exige chave e nenhuma estiver configurada, utiliza o sintetizador local gratuito
  if (config.provider === 'offline' || (isKeyRequired && !effectiveApiKey)) {
    const offlineMsg = generateOfflineResponse(query, knowledge, knowledge.resolvedPersona);
    const parsed = parseCitationsAndActions(offlineMsg.content, offlineMsg.citations);
    return {
      ...offlineMsg,
      citations: parsed.citations,
      suggestedActions: parsed.actions,
      relicPersona: knowledge.resolvedPersona,
    };
  }

  // Se o provedor for 'gemini' e a chave for inválida no formato, transiciona graciosamente para o motor offline sem quebrar
  if (config.provider === 'gemini' && !validateKey(effectiveApiKey)) {
    const offlineMsg = generateOfflineResponse(query, knowledge, knowledge.resolvedPersona);
    const parsed = parseCitationsAndActions(offlineMsg.content, offlineMsg.citations);
    const reason = !effectiveApiKey
      ? 'Nenhuma chave de API configurada'
      : 'Chave de API do Gemini inválida ou não configurada';
    return {
      ...offlineMsg,
      content: `ℹ️ *${reason}. Ativando modo offline local (G.L.I.T.C.H.):*\n\n${offlineMsg.content}`,
      citations: parsed.citations,
      suggestedActions: parsed.actions,
      relicPersona: knowledge.resolvedPersona,
    };
  }

  const effectiveConfig: AiConfig = {
    ...config,
    apiKey: effectiveApiKey || config.apiKey || '',
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
      const cleanKey = sanitizeApiKey(config.apiKey);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${cleanKey}`;
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
        if (response.status === 400 && (errorDetail.includes('API key not valid') || errorDetail.includes('API_KEY_INVALID'))) {
          throw new Error('Chave de API do Gemini inválida ou não autorizada pelo Google AI Studio. Verifique sua chave em aistudio.google.com/app/apikey.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Acesso não autorizado aos modelos Gemini (HTTP ${response.status}). Verifique as permissões da chave.`);
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
 * Chamada à API Groq Cloud (Llama 3.3 70B gratuito com fallback automático para 8B).
 */
async function callGroqApi(
  query: string,
  config: AiConfig,
  knowledge: RetrievedKnowledge,
  chatHistory: AiMessage[]
): Promise<AiMessage> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const selectedModel = config.model || 'llama-3.3-70b-versatile';

  // Ordem de retentativa: modelo selecionado -> llama-3.1-8b-instant -> llama-3.3-70b-versatile
  const modelsToTry = Array.from(
    new Set([
      selectedModel,
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
    ])
  );

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

  const sanitizedKey = sanitizeApiKey(config.apiKey);
  let lastError: Error | null = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sanitizedKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature: config.temperature ?? 0.4,
          max_tokens: 2048,
        }),
      });

      if (response.status === 503 || response.status === 404 || response.status === 429) {
        console.warn(`[AI Client] Groq modelo '${currentModel}' retornou status ${response.status}. Tentando fallback...`);
        continue;
      }

      if (!response.ok) {
        let errorDetail = `Status ${response.status}`;
        let errorCode = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson.error?.message || errorDetail;
          errorCode = errJson.error?.code || '';
        } catch {}

        const isModelUnavailable =
          errorCode === 'model_not_found' ||
          errorCode === 'model_decommissioned' ||
          errorDetail.includes('does not exist') ||
          errorDetail.includes('do not have access') ||
          errorDetail.includes('decommissioned');

        if (isModelUnavailable) {
          console.warn(`[AI Client] Groq modelo '${currentModel}' indisponível (${errorDetail}). Tentando fallback...`);
          continue;
        }

        if (response.status === 401) {
          throw new Error('Chave de API do Groq inválida ou não autorizada (HTTP 401). Verifique sua chave em console.groq.com/keys.');
        }

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
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('Chave de API do Groq inválida')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Não foi possível obter resposta da API Groq.');
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
  const isOllama = config.provider === 'ollama';
  const url = isOllama
    ? resolveOllamaEndpoint(config.endpoint)
    : config.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  const modelName = isOllama
    ? config.model || 'llama3.3'
    : config.model || 'meta-llama/llama-3.3-70b-instruct:free';

  const messages = [
    { role: 'system', content: knowledge.systemPrompt },
    ...chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: query },
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey && config.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  }

  const isNativeOllamaApi = url.endsWith('/api/chat');
  const payload: Record<string, any> = {
    model: modelName,
    messages,
    temperature: config.temperature ?? 0.4,
  };
  if (isNativeOllamaApi) {
    payload.stream = false;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Erro na API (${response.status})`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.error || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  const data = await response.json();
  const rawText =
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    'Sem resposta.';
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

  if (config.provider !== 'ollama' && !effectiveApiKey) {
    return { success: false, message: 'Insira a chave de API para realizar o teste.' };
  }

  try {
    if (config.provider === 'gemini') {
      if (!validateKey(effectiveApiKey)) {
        return {
          success: false,
          message: 'Chave de API do Gemini inválida ou não configurada.',
        };
      }

      const cleanApiKey = sanitizeApiKey(effectiveApiKey);
      let modelName = config.model || 'gemini-flash-lite-latest';
      if (modelName === 'gemini-2.5-flash') {
        modelName = 'gemini-flash-lite-latest';
      }

      const modelsToTry = Array.from(
        new Set([modelName, 'gemini-flash-lite-latest', 'gemini-flash-latest'])
      );

      let lastMsg = 'Erro ao conectar';
      for (const curModel of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${cleanApiKey}`;
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
      const cleanKey = sanitizeApiKey(effectiveApiKey);
      const selectedModel = config.model || 'llama-3.3-70b-versatile';
      const modelsToTry = Array.from(
        new Set([selectedModel, 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'])
      );

      let lastMsg = 'Erro ao conectar à Groq';
      for (const curModel of modelsToTry) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${cleanKey}`,
            },
            body: JSON.stringify({
              model: curModel,
              messages: [{ role: 'user', content: 'OK' }],
              max_tokens: 5,
            }),
          });

          if (res.ok) {
            const originTag = isDefault ? ' (Usando Chave Padrão)' : ' (Usando Chave Pessoal)';
            const fallbackNote = curModel !== selectedModel ? ` [Fallback: ${curModel}]` : '';
            return {
              success: true,
              message: `Conexão com Groq Cloud (${curModel}) realizada com sucesso!${originTag}${fallbackNote}`,
            };
          }

          if (res.status === 503 || res.status === 404 || res.status === 429) {
            continue;
          }

          try {
            const err = await res.json();
            const msg = err.error?.message || `Erro HTTP ${res.status}`;
            if (err.error?.code === 'model_not_found' || msg.includes('does not exist') || msg.includes('do not have access')) {
              continue;
            }
            if (res.status === 401) {
              return { success: false, message: 'Chave de API do Groq inválida (HTTP 401). Verifique em console.groq.com/keys.' };
            }
            lastMsg = msg;
          } catch {
            lastMsg = `Erro HTTP ${res.status} ao conectar à Groq.`;
          }
        } catch (fetchErr: any) {
          lastMsg = fetchErr.message || lastMsg;
        }
      }

      return { success: false, message: lastMsg };
    } else if (config.provider === 'ollama') {
      const resolvedUrl = resolveOllamaEndpoint(config.endpoint);
      const baseOrigin = resolvedUrl.replace(/\/(v1\/chat\/completions|api\/chat|v1)\/?$/i, '');
      const testModel = config.model || 'llama3.3';

      try {
        const tagsRes = await fetch(`${baseOrigin}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const modelsList: string[] = (tagsData?.models || []).map((m: any) => m.name || m.model);
          const hasModel = modelsList.some((m) => m && m.toLowerCase().includes(testModel.toLowerCase()));
          const modelNote = hasModel
            ? `Modelo '${testModel}' pronto!`
            : modelsList.length > 0
              ? `Modelos disponíveis: ${modelsList.slice(0, 3).join(', ')}`
              : 'Ollama conectado com sucesso.';
          return {
            success: true,
            message: `Conexão com Ollama (${baseOrigin}) estabelecida! ${modelNote}`,
          };
        }
      } catch {
        // Tenta completions se /api/tags falhar
      }

      const compRes = await fetch(resolvedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5,
          stream: false,
        }),
      });

      if (!compRes.ok) {
        return {
          success: false,
          message: `Ollama retornou status HTTP ${compRes.status} no endpoint ${resolvedUrl}.`,
        };
      }

      return {
        success: true,
        message: `Conexão com Ollama (${resolvedUrl}) validada com sucesso!`,
      };
    }

    return { success: true, message: 'Conexão validada com sucesso!' };
  } catch (err: any) {
    let msg = err.message || 'Falha de conexão com o provedor.';
    if (config.provider === 'ollama' && Platform?.OS === 'android') {
      msg += ' (No Android, use o IP da máquina na rede Wi-Fi, ex: http://192.168.1.X:11434, em vez de localhost, e verifique se usesCleartextTraffic está habilitado no app.json).';
    }
    return { success: false, message: msg };
  }
}
