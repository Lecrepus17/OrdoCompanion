#!/usr/bin/env node
/**
 * Leitor e Triador Incremental de Solicitações do Discord (Erros vs. Melhorias)
 * - Lê canais de texto e fóruns do servidor Discord via Discord REST API v10 (Bot Read-Only).
 * - Separa estritamente as entradas em 🐛 Erros (`errors`) e 💡 Melhorias (`improvements`).
 * - Carrega dinamicamente as perguntas de avaliação crítica de `data/request_triage_questions.json` (SSOT).
 *
 * Comandos:
 *   node scripts/discord_requests.js fetch [--all] [--limit=50] [--type=errors|improvements|all] [--json]
 *   node scripts/discord_requests.js ack --ids=id1,id2 [--status=approved|rejected|done|backlog] [--react]
 *   node scripts/discord_requests.js questions
 *   node scripts/discord_requests.js test
 *   node scripts/discord_requests.js status
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_ENV_PATH = path.join(ROOT_DIR, '.env');
const DEFAULT_QUESTIONS_PATH = path.join(ROOT_DIR, 'data', 'request_triage_questions.json');
const DEFAULT_STATE_PATH = path.join(ROOT_DIR, 'docs', '.discord_requests_state.json');

const DEFAULT_OBFUSCATION_KEY = 'OrdoRealitas::Verissimo::Membrana::2026';
const OBFUSCATION_PREFIX = 'obf:v1:';
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Desofusca valores `obf:v1:...` gerados por `scripts/obfuscate_secrets.js`.
 */
function deobfuscateSecret(encodedText, customKey = DEFAULT_OBFUSCATION_KEY) {
  const clean = String(encodedText || '').trim();
  if (!clean) return '';
  if (!clean.startsWith(OBFUSCATION_PREFIX)) return clean;

  try {
    const rawB64 = clean.slice(OBFUSCATION_PREFIX.length);
    const encryptedBytes = Buffer.from(rawB64, 'base64');
    const keyBytes = Buffer.from(customKey || DEFAULT_OBFUSCATION_KEY, 'utf-8');
    const outBytes = Buffer.alloc(encryptedBytes.length);

    for (let i = 0; i < encryptedBytes.length; i++) {
      const k = keyBytes[i % keyBytes.length];
      const shift = (i * 31 + 17) & 0xff;
      outBytes[i] = encryptedBytes[i] ^ k ^ shift;
    }

    return outBytes.toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Carrega variáveis do arquivo .env sem depender de pacotes externos.
 */
function loadDotEnv(envPath = DEFAULT_ENV_PATH) {
  const parsed = {};
  if (!fs.existsSync(envPath)) return parsed;

  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    parsed[key] = val;
  }
  return parsed;
}

function getEnvVar(key, envFromFile) {
  const raw = process.env[key] !== undefined ? process.env[key] : envFromFile[key];
  return deobfuscateSecret(raw || '');
}

/**
 * Carrega a Fonte Única da Verdade (SSOT) das perguntas de avaliação crítica.
 */
function loadTriageQuestionsConfig(questionsPath = DEFAULT_QUESTIONS_PATH) {
  if (!fs.existsSync(questionsPath)) {
    throw new Error(`Arquivo SSOT de perguntas não encontrado: ${questionsPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
  const allQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const activeQuestions = allQuestions
    .filter((q) => q && q.active !== false)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
    .map((q, idx) => ({
      ...q,
      number: q.number ?? idx + 1,
    }));

  return {
    version: raw.version || '1.0.0',
    description: raw.description || '',
    questions: activeQuestions,
    allQuestions,
    specialists: Array.isArray(raw.specialists) ? raw.specialists : [],
  };
}

function loadState(statePath = DEFAULT_STATE_PATH) {
  const emptyState = {
    version: 1,
    lastFetchedAt: null,
    channels: {},
    seenChannels: {},
    processedIds: {},
  };
  if (!fs.existsSync(statePath)) return emptyState;
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    return {
      version: parsed.version || 1,
      lastFetchedAt: parsed.lastFetchedAt || null,
      channels: parsed.channels && typeof parsed.channels === 'object' ? parsed.channels : {},
      seenChannels:
        parsed.seenChannels && typeof parsed.seenChannels === 'object' ? parsed.seenChannels : {},
      processedIds:
        parsed.processedIds && typeof parsed.processedIds === 'object' ? parsed.processedIds : {},
    };
  } catch {
    return emptyState;
  }
}

function saveState(state, statePath = DEFAULT_STATE_PATH) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

function parseChannelIdList(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBotTestMessage(msg) {
  const embeds = Array.isArray(msg?.embeds) ? msg.embeds : [];
  return embeds.some(
    (e) =>
      typeof e?.title === 'string' &&
      e.title.includes('Conexão Estabelecida com Sucesso')
  );
}

function normalizeFieldMap(embed) {
  const fields = Array.isArray(embed?.fields) ? embed.fields : [];
  const map = {};
  for (const field of fields) {
    const key = String(field?.name || '').toLowerCase();
    const val = String(field?.value || '').trim();
    if (!key) continue;
    if (key.includes('protocolo')) map.protocol = val.replace(/[`#]/g, '').trim();
    else if (key.includes('categoria')) map.categoryText = val;
    else if (key.includes('fila')) map.triageQueue = val;
    else if (key.includes('severidade')) map.severity = val;
    else if (key.includes('jogador') || key.includes('agente')) map.sender = val;
    else if (key.includes('contato')) map.contactReturn = val;
    else if (key.includes('passos')) map.stepsToReproduce = val;
    else if (key.includes('diagnóstico') || key.includes('diagnostico')) map.diagnostics = val;
  }
  return map;
}

function inferCategoryFromEmbed(embed, fieldMap) {
  const title = String(embed?.title || '');
  const catText = `${fieldMap.categoryText || ''} ${title}`.toLowerCase();
  if (catText.includes('regra') || catText.includes('compêndio') || catText.includes('compendio') || title.includes('📖')) {
    return 'rule_error';
  }
  if (catText.includes('bug') || catText.includes('erro técnico') || catText.includes('erro tecnico') || title.includes('🐛')) {
    return 'bug';
  }
  if (catText.includes('sugestão') || catText.includes('sugestao') || catText.includes('ideia') || catText.includes('melhoria') || title.includes('💡')) {
    return 'suggestion';
  }
  if (catText.includes('dúvida') || catText.includes('duvida') || catText.includes('suporte') || catText.includes('contato') || title.includes('💬')) {
    return 'contact';
  }
  return null;
}

function inferRequestTypeFromKeywords(text) {
  const normalized = String(text || '').toLowerCase();
  const errorPatterns = [
    /\[(?:erro|bug)\]/i,
    /\b(?:erro|bug|falha|crash|travando|trava|quebrou|quebrado|não abre|nao abre|não funciona|nao funciona|incorreto|errado|faltando|sumiu|tela preta|tela branca)\b/i,
  ];
  const improvementPatterns = [
    /\[(?:melhoria|sugest[aã]o|ideia)\]/i,
    /\b(?:melhoria|sugest[aã]o|sugiro|ideia|poderia ter|seria legal|adicionar|implementar|nov[oa] fun[çc][aã]o|otimizar)\b/i,
  ];

  const isError = errorPatterns.some((rx) => rx.test(normalized));
  const isImprovement = improvementPatterns.some((rx) => rx.test(normalized));

  if (isError && !isImprovement) return 'errors';
  if (isImprovement && !isError) return 'improvements';
  if (isError) return 'errors';
  return null;
}

/**
 * Converte uma mensagem (ou tópico de fórum) do Discord em um objeto de Solicitação estruturado
 * e classificado estritamente em `errors` vs `improvements` (ou `contacts` se for apenas dúvida em canal geral).
 */
function parseDiscordMessageToRequest(msg, channelSourceType = 'auto', channelLabel = '') {
  if (!msg || !msg.id) return null;
  if (isBotTestMessage(msg)) return null;

  const content = String(msg.content || '').trim();
  const embeds = Array.isArray(msg.embeds) ? msg.embeds : [];
  const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];

  if (!content && embeds.length === 0 && attachments.length === 0) {
    return null;
  }

  const primaryEmbed = embeds[0] || null;
  const fieldMap = primaryEmbed ? normalizeFieldMap(primaryEmbed) : {};
  const embedCategory = primaryEmbed ? inferCategoryFromEmbed(primaryEmbed, fieldMap) : null;

  let protocol = fieldMap.protocol || '';
  if (!protocol && primaryEmbed?.title) {
    const match = primaryEmbed.title.match(/\[(ORD-[A-Z0-9]+)\]/i);
    if (match) protocol = match[1].toUpperCase();
  }
  if (!protocol) {
    protocol = `DSC-${String(msg.id).slice(-6)}`;
  }

  let title = '';
  if (primaryEmbed?.title) {
    title = primaryEmbed.title
      .replace(/^[🐛📖💡💬\s]+/, '')
      .replace(/^\[ORD-[A-Z0-9]+\]\s*/i, '')
      .trim();
  } else if (msg._threadTitle) {
    title = String(msg._threadTitle).trim();
  } else {
    const firstLine = content.split(/\r?\n/)[0] || '';
    title = firstLine.slice(0, 90).trim() || `Relato Discord (${protocol})`;
  }

  const descriptionParts = [];
  if (primaryEmbed?.description) descriptionParts.push(String(primaryEmbed.description).trim());
  if (content && content !== title) descriptionParts.push(content);
  const description = descriptionParts.join('\n\n').trim() || title;

  const authorName =
    fieldMap.sender ||
    msg.author?.global_name ||
    msg.author?.username ||
    'Membro do Discord';

  // Classificação estrita: erros vs melhorias
  let requestGroup = 'improvements';
  let subtype = embedCategory || 'text';

  if (channelSourceType === 'errors') {
    requestGroup = 'errors';
  } else if (channelSourceType === 'improvements') {
    requestGroup = 'improvements';
  } else {
    const queueHint = String(fieldMap.triageQueue || '').toUpperCase();
    if (queueHint.includes('ERRO')) {
      requestGroup = 'errors';
    } else if (queueHint.includes('MELHORIA')) {
      requestGroup = 'improvements';
    } else if (embedCategory === 'bug' || embedCategory === 'rule_error') {
      requestGroup = 'errors';
    } else if (embedCategory === 'suggestion') {
      requestGroup = 'improvements';
    } else {
      const kwGroup = inferRequestTypeFromKeywords(`${title}\n${description}`);
      if (kwGroup) {
        requestGroup = kwGroup;
      } else if (embedCategory === 'contact') {
        requestGroup = 'contacts';
      } else {
        requestGroup = 'improvements';
      }
    }
  }

  return {
    id: String(msg.id),
    channelId: String(msg.channel_id || ''),
    channelLabel: channelLabel || `#${msg.channel_id || 'discord'}`,
    guildId: msg.guild_id ? String(msg.guild_id) : undefined,
    protocol,
    requestGroup, // 'errors' | 'improvements' | 'contacts'
    category: embedCategory || (requestGroup === 'errors' ? 'bug' : 'suggestion'),
    subtype,
    source: primaryEmbed ? 'App (Central de Suporte -> Discord)' : 'Discord (Membro)',
    title,
    description,
    severity: fieldMap.severity || undefined,
    stepsToReproduce: fieldMap.stepsToReproduce || undefined,
    diagnostics: fieldMap.diagnostics || undefined,
    author: authorName,
    contactReturn: fieldMap.contactReturn || undefined,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      url: a.url,
      contentType: a.content_type,
    })),
    timestamp: msg.timestamp || new Date().toISOString(),
  };
}

/**
 * Filtra mensagens ignorando as que já foram triadas no estado local,
 * preservando ordem cronológica (mais antigas primeiro para análise sequencial).
 */
function filterUnreadMessages(messages, state, includeAll = false) {
  const list = Array.isArray(messages) ? [...messages] : [];
  const processed = state?.processedIds || {};
  const filtered = includeAll ? list : list.filter((m) => m && m.id && !processed[String(m.id)]);

  return filtered.sort((a, b) => {
    try {
      const idA = BigInt(a.id);
      const idB = BigInt(b.id);
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    } catch {
      return String(a.timestamp || '').localeCompare(String(b.timestamp || ''));
    }
  });
}

/**
 * Gera dinamicamente o roteiro Markdown da solicitação com base nas perguntas ativas
 * carregadas de `data/request_triage_questions.json` (Fonte Única da Verdade).
 */
function formatTriageTemplateForRequest(request, questionsConfig, indexLabel = 'SOL-001') {
  const questions = Array.isArray(questionsConfig?.questions) ? questionsConfig.questions : [];
  const specialists = Array.isArray(questionsConfig?.specialists) ? questionsConfig.specialists : [];

  const lines = [];
  lines.push(`### [${indexLabel}] ${request.title}`);
  lines.push(`* **ID Discord / Protocolo**: \`${request.id}\` / \`#${request.protocol}\``);
  lines.push(`* **Fila**: ${request.requestGroup === 'errors' ? '🐛 ERROS' : '💡 MELHORIAS'}`);
  lines.push(`* **Origem**: ${request.source} (${request.channelLabel} • Autor: ${request.author})`);
  if (request.severity) lines.push(`* **Severidade Informada**: ${request.severity}`);
  if (request.attachments?.length) {
    lines.push(`* **Anexos**: ${request.attachments.map((a) => `[${a.filename}](${a.url})`).join(', ')}`);
  }
  lines.push('');
  lines.push('> **Relato Original:**');
  for (const descLine of String(request.description || '').split(/\r?\n/)) {
    lines.push(`> ${descLine}`);
  }
  if (request.stepsToReproduce) {
    lines.push('> **Passos:** ' + request.stepsToReproduce);
  }
  if (request.diagnostics) {
    lines.push('> **Diagnóstico:** ' + request.diagnostics);
  }
  lines.push('');
  lines.push('**Perguntas de Avaliação Obrigatórias (SSOT):**');
  for (const q of questions) {
    lines.push(`${q.number}. **${q.title}** — _(${q.promptHint})_`);
  }
  if (specialists.length > 0) {
    lines.push('');
    lines.push(`**Especialistas Disponíveis**: ${specialists.map((s) => s.label).join(' | ')}`);
  }

  return lines.join('\n');
}

async function discordApiRequest(endpoint, token, options = {}) {
  const res = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OrdoCompanionTriageBot (https://github.com/Lecrepus17/OrdoCompanion, 1.0)',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Discord API HTTP ${res.status} em ${endpoint}: ${errText.slice(0, 200)}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function fetchMessagesFromChannel(channelId, token, limit = 50) {
  const channel = await discordApiRequest(`/channels/${channelId}`, token);
  const channelLabel = channel?.name ? `#${channel.name}` : `#${channelId}`;
  const isForumChannel = channel?.type === 15 || channel?.type === 16;

  if (!isForumChannel) {
    const messages = await discordApiRequest(
      `/channels/${channelId}/messages?limit=${Math.min(Math.max(limit, 1), 100)}`,
      token
    );
    return {
      channelLabel,
      channelType: channel?.type,
      messages: Array.isArray(messages) ? messages : [],
    };
  }

  // Suporte a canais de Fórum do Discord (busca tópicos ativos + arquivados públicos)
  const collectedThreads = [];
  if (channel.guild_id) {
    try {
      const active = await discordApiRequest(`/guilds/${channel.guild_id}/threads/active`, token);
      if (Array.isArray(active?.threads)) {
        collectedThreads.push(...active.threads.filter((t) => String(t.parent_id) === String(channelId)));
      }
    } catch {}
  }
  try {
    const archived = await discordApiRequest(
      `/channels/${channelId}/threads/archived/public?limit=${Math.min(limit, 50)}`,
      token
    );
    if (Array.isArray(archived?.threads)) {
      collectedThreads.push(...archived.threads);
    }
  } catch {}

  const uniqueThreads = [];
  const seenThreadIds = new Set();
  for (const t of collectedThreads) {
    if (t?.id && !seenThreadIds.has(String(t.id))) {
      seenThreadIds.add(String(t.id));
      uniqueThreads.push(t);
    }
  }

  const messages = [];
  for (const thread of uniqueThreads.slice(0, limit)) {
    try {
      const threadMsgs = await discordApiRequest(`/channels/${thread.id}/messages?limit=10`, token);
      if (Array.isArray(threadMsgs) && threadMsgs.length > 0) {
        // Pega a mensagem inicial do tópico (a mais antiga entre as retornadas ou pelo id igual ao do thread)
        const starter =
          threadMsgs.find((m) => String(m.id) === String(thread.id)) ||
          threadMsgs[threadMsgs.length - 1];
        if (starter) {
          starter._threadTitle = thread.name;
          starter.channel_id = thread.id;
          messages.push(starter);
        }
      }
    } catch {}
  }

  return {
    channelLabel,
    channelType: channel?.type,
    messages,
  };
}

function parseCliArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0] || 'fetch', positional, flags };
}

function resolveConfiguredChannels(envFile) {
  const bugsChannels = parseChannelIdList(getEnvVar('DISCORD_BUGS_CHANNEL_ID', envFile));
  const suggestionsChannels = parseChannelIdList(
    getEnvVar('DISCORD_SUGGESTIONS_CHANNEL_ID', envFile)
  );
  const generalChannels = parseChannelIdList(
    getEnvVar('DISCORD_GENERAL_SUPPORT_CHANNEL_ID', envFile)
  );

  return [
    ...bugsChannels.map((id) => ({ id, sourceType: 'errors' })),
    ...suggestionsChannels.map((id) => ({ id, sourceType: 'improvements' })),
    ...generalChannels.map((id) => ({ id, sourceType: 'auto' })),
  ];
}

async function runFetchCommand(flags) {
  const envFile = loadDotEnv();
  const token = getEnvVar('DISCORD_BOT_TOKEN', envFile);
  const channels = resolveConfiguredChannels(envFile);
  const questionsConfig = loadTriageQuestionsConfig();
  const state = loadState();
  const includeAll = Boolean(flags.all);
  const limit = Number(flags.limit || 50);
  const typeFilter = String(flags.type || 'all').toLowerCase();

  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN não configurado no arquivo .env.');
    console.error('ℹ️ Consulte o passo a passo em docs/SOLICITACOES.md para conectar seu Bot Read-Only do Discord.');
    process.exitCode = 1;
    return;
  }

  if (channels.length === 0) {
    console.error('❌ Nenhum canal do Discord configurado no .env.');
    console.error('ℹ️ Defina DISCORD_BUGS_CHANNEL_ID e/ou DISCORD_SUGGESTIONS_CHANNEL_ID (ou DISCORD_GENERAL_SUPPORT_CHANNEL_ID).');
    process.exitCode = 1;
    return;
  }

  const errors = [];
  const improvements = [];
  const contacts = [];
  const channelSummaries = [];

  for (const ch of channels) {
    if (typeFilter === 'errors' && ch.sourceType === 'improvements') continue;
    if (typeFilter === 'improvements' && ch.sourceType === 'errors') continue;

    const { channelLabel, messages } = await fetchMessagesFromChannel(ch.id, token, limit);
    const unread = filterUnreadMessages(messages, state, includeAll);
    channelSummaries.push({
      id: ch.id,
      label: channelLabel,
      sourceType: ch.sourceType,
      totalFetched: messages.length,
      unreadCount: unread.length,
    });

    state.channels[ch.id] = {
      label: channelLabel,
      sourceType: ch.sourceType,
      lastMessageId: messages[0]?.id ? String(messages[0].id) : state.channels[ch.id]?.lastMessageId || null,
    };

    for (const msg of unread) {
      const parsed = parseDiscordMessageToRequest(msg, ch.sourceType, channelLabel);
      if (!parsed) continue;
      state.seenChannels[parsed.id] = parsed.channelId || ch.id;
      if (parsed.requestGroup === 'errors') errors.push(parsed);
      else if (parsed.requestGroup === 'contacts') contacts.push(parsed);
      else improvements.push(parsed);
    }
  }

  state.lastFetchedAt = new Date().toISOString();
  saveState(state);

  const filteredErrors = typeFilter === 'improvements' ? [] : errors;
  const filteredImprovements = typeFilter === 'errors' ? [] : improvements;

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          fetchedAt: state.lastFetchedAt,
          channels: channelSummaries,
          questionsVersion: questionsConfig.version,
          questions: questionsConfig.questions,
          specialists: questionsConfig.specialists,
          errors: filteredErrors,
          improvements: filteredImprovements,
          contacts: typeFilter === 'all' ? contacts : [],
        },
        null,
        2
      )
    );
    return;
  }

  console.log('====================================================================');
  console.log('📡 TRIAGEM DISCORD — ORDO COMPANION (Erros vs. Melhorias Separados)');
  console.log('====================================================================');
  console.log(
    `Canais lidos: ${channelSummaries
      .map((c) => `${c.label} (${c.unreadCount} pendente(s) / ${c.totalFetched} lida(s))`)
      .join(' | ')}`
  );
  console.log(
    `Perguntas ativas (SSOT data/request_triage_questions.json v${questionsConfig.version}): ${questionsConfig.questions.length}`
  );
  console.log('');

  console.log(`## 🐛 FILA 1: ERROS (${filteredErrors.length})`);
  if (filteredErrors.length === 0) {
    console.log('*(Nenhum erro novo pendente de triagem)*');
  } else {
    filteredErrors.forEach((req, idx) => {
      const code = `SOL-ERR-${String(idx + 1).padStart(3, '0')}`;
      console.log(formatTriageTemplateForRequest(req, questionsConfig, code));
      console.log('');
    });
  }

  console.log(`## 💡 FILA 2: MELHORIAS (${filteredImprovements.length})`);
  if (filteredImprovements.length === 0) {
    console.log('*(Nenhuma melhoria nova pendente de triagem)*');
  } else {
    filteredImprovements.forEach((req, idx) => {
      const code = `SOL-MEL-${String(idx + 1).padStart(3, '0')}`;
      console.log(formatTriageTemplateForRequest(req, questionsConfig, code));
      console.log('');
    });
  }

  if (contacts.length > 0 && typeFilter === 'all') {
    console.log(`## 💬 OUTROS CONTATOS / DÚVIDAS (${contacts.length})`);
    contacts.forEach((req, idx) => {
      console.log(`- [${req.id}] (#${req.protocol}) ${req.author}: ${req.title}`);
    });
  }
}

async function runAckCommand(flags) {
  const ids = parseChannelIdList(flags.ids);
  if (ids.length === 0) {
    console.error('❌ Informe os IDs para marcar como triados: --ids=123,456');
    process.exitCode = 1;
    return;
  }

  const status = String(flags.status || 'triaged');
  const note = flags.note ? String(flags.note) : undefined;
  const state = loadState();
  const envFile = loadDotEnv();
  const token = flags.react ? getEnvVar('DISCORD_BOT_TOKEN', envFile) : '';

  const emojiByStatus = {
    approved: '%E2%9C%85', // ✅
    done: '%E2%9C%85', // ✅
    backlog: '%F0%9F%93%8C', // 📌
    rejected: '%E2%9D%8C', // ❌
    triaged: '%F0%9F%91%80', // 👀
  };

  for (const id of ids) {
    state.processedIds[id] = {
      status,
      triagedAt: new Date().toISOString(),
      ...(note ? { note } : {}),
    };

    const targetChannel = flags.channel || state.seenChannels?.[id];
    if (flags.react && token && targetChannel) {
      const emoji = emojiByStatus[status] || emojiByStatus.triaged;
      try {
        await discordApiRequest(
          `/channels/${targetChannel}/messages/${id}/reactions/${emoji}/@me`,
          token,
          { method: 'PUT' }
        );
      } catch (err) {
        console.warn(`⚠️ Não foi possível reagir na mensagem ${id}: ${err.message}`);
      }
    }
  }

  saveState(state);
  console.log(`✅ ${ids.length} mensagem(ns) marcada(s) como '${status}' em docs/.discord_requests_state.json.`);
}

async function runTestCommand() {
  const envFile = loadDotEnv();
  const token = getEnvVar('DISCORD_BOT_TOKEN', envFile);
  const channels = resolveConfiguredChannels(envFile);

  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN ausente no .env.');
    process.exitCode = 1;
    return;
  }

  const me = await discordApiRequest('/users/@me', token);
  console.log(`✅ Bot autenticado: ${me.username}#${me.discriminator || '0'} (ID: ${me.id})`);

  if (channels.length === 0) {
    console.warn('⚠️ Nenhum ID de canal configurado (DISCORD_BUGS_CHANNEL_ID / DISCORD_SUGGESTIONS_CHANNEL_ID).');
    return;
  }

  for (const ch of channels) {
    try {
      const info = await discordApiRequest(`/channels/${ch.id}`, token);
      console.log(`✅ Canal acessível [${ch.sourceType}]: #${info.name || ch.id} (tipo ${info.type})`);
    } catch (err) {
      console.error(`❌ Falha ao ler canal ${ch.id} [${ch.sourceType}]: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

function runQuestionsCommand() {
  const cfg = loadTriageQuestionsConfig();
  console.log(`📋 Perguntas Ativas (data/request_triage_questions.json v${cfg.version}):`);
  for (const q of cfg.questions) {
    console.log(`  ${q.number}. [${q.id}] ${q.title}`);
    console.log(`     ${q.promptHint}`);
  }
}

function runStatusCommand() {
  const state = loadState();
  const processedCount = Object.keys(state.processedIds || {}).length;
  console.log('📊 Estado do Leitor Discord (docs/.discord_requests_state.json):');
  console.log(`  - Última consulta: ${state.lastFetchedAt || 'Nunca executada'}`);
  console.log(`  - Mensagens já triadas: ${processedCount}`);
  const chEntries = Object.entries(state.channels || {});
  if (chEntries.length > 0) {
    for (const [id, info] of chEntries) {
      console.log(`  - Canal ${info.label || id} [${info.sourceType}]: último ID = ${info.lastMessageId || 'N/A'}`);
    }
  }
}

async function main() {
  const { command, flags } = parseCliArgs(process.argv.slice(2));
  if (command === 'fetch') await runFetchCommand(flags);
  else if (command === 'ack') await runAckCommand(flags);
  else if (command === 'test') await runTestCommand();
  else if (command === 'questions') runQuestionsCommand();
  else if (command === 'status') runStatusCommand();
  else {
    console.error(`Comando desconhecido: ${command}. Use: fetch | ack | test | questions | status`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Erro no leitor de solicitações do Discord:', err?.message || err);
    process.exit(1);
  });
}

module.exports = {
  deobfuscateSecret,
  loadDotEnv,
  loadTriageQuestionsConfig,
  loadState,
  saveState,
  parseDiscordMessageToRequest,
  filterUnreadMessages,
  formatTriageTemplateForRequest,
  resolveConfiguredChannels,
};
