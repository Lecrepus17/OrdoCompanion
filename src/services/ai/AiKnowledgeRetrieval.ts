import { CharacterSheet, CompendiumEntity } from '../../types/compendium';
import { AiCitation, AiConfig, ConcreteRelicPersona } from '../../types/ai';
import { defaultRepository, normalizeText } from '../../repositories/OfflineDataRepository';
import { MANUAL_SECTIONS, ManualSection, searchManual } from '../../data/manualData';
import { buildPersonaSystemPrompt } from './prompts';

export interface RetrievedKnowledge {
  systemPrompt: string;
  citations: AiCitation[];
  matchedEntities: CompendiumEntity[];
  matchedManualSections: ManualSection[];
  resolvedPersona: ConcreteRelicPersona;
}

/**
 * Resolve a Persona ou Relíquia definitiva que responderá à mensagem, sorteando se a opção for 'random'.
 */
export function resolveRelicPersona(config: AiConfig): ConcreteRelicPersona {
  const chosen = config.relicPersona || (config.anfitriaoMode ? 'anfitriao' : 'none');
  if (chosen === 'random') {
    const relics: ConcreteRelicPersona[] = ['anfitriao', 'magistrada', 'deus_da_morte', 'diabo'];
    const idx = Math.floor(Math.random() * relics.length);
    return relics[idx];
  }
  return chosen;
}

/**
 * Legado exportado para compatibilidade retroativa
 */
export function buildRelicSystemPrompt(persona: ConcreteRelicPersona): string {
  return buildPersonaSystemPrompt(persona);
}

const STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
  'com', 'sem', 'sob', 'sobre', 'que', 'como', 'qual', 'quais', 'quem', 'onde',
  'quando', 'porque', 'por que', 'e', 'ou', 'mas', 'se', 'nao', 'sim', 'fazer',
  'faria', 'posso', 'pode', 'da', 'faz', 'funciona', 'sistema', 'coisa', 'algo',
  'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa',
  'ele', 'ela', 'eles', 'elas', 'este', 'esta', 'esse', 'essa', 'isso', 'isto', 'aquilo'
]);

// Siglas essenciais de mecânicas de Ordem Paranormal que devem ser preservadas na busca
const RPG_ACRONYMS = new Set(['pv', 'pe', 'dt', 'vd', 'rd', 'pm', 'san', 'nex', 'agi', 'for', 'int', 'pre', 'vig']);

/**
 * Extrai tokens e termos-chave relevantes da pergunta do usuário.
 */
export function extractKeywords(query: string): string[] {
  const normalized = normalizeText(query);
  const words = normalized
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => RPG_ACRONYMS.has(w) || (w.length >= 3 && !STOP_WORDS.has(w)));

  return Array.from(new Set(words));
}

/**
 * Constrói o contexto RAG a partir da base local de livros, compêndio e manual do app,
 * calibrado dinamicamente de acordo com o papel do Agente selecionado (Árbitro, Co-Mestre, Build Advisor, etc).
 */
export function retrieveAiKnowledge(
  query: string,
  config: AiConfig,
  activeAgent?: CharacterSheet | null
): RetrievedKnowledge {
  const resolvedPersona = resolveRelicPersona(config);
  const keywords = extractKeywords(query);
  const allEntities = defaultRepository.getAllEntities();

  // 1. Busca no Compêndio com priorização por papel do agente
  const matchedEntities: CompendiumEntity[] = [];
  const matchedEntityIds = new Set<string>();
  const lowerQuery = normalizeText(query);

  // Heurísticas de categoria preferida por tipo de agente
  const isCoMestre = resolvedPersona === 'co_mestre';
  const isArbitro = resolvedPersona === 'arbitro_regras';
  const isBuildAdvisor = resolvedPersona === 'build_advisor';

  // Se for Co-Mestre e a query sugerir encontro/monstro/pista, prioriza criaturas e itens amaldiçoados
  if (isCoMestre) {
    const threats = allEntities.filter((e) => e.category === 'creature');
    for (const t of threats) {
      const norm = normalizeText(t.name);
      if (lowerQuery.includes(norm) || keywords.some((kw) => norm.includes(kw))) {
        if (!matchedEntityIds.has(t.id)) {
          matchedEntityIds.add(t.id);
          matchedEntities.push(t);
        }
      }
      if (matchedEntities.length >= 4) break;
    }
  }

  // Se for Build Advisor e houver agente ativo, prioriza poderes da classe do agente
  if (isBuildAdvisor && activeAgent?.classId) {
    const classPowers = allEntities.filter(
      (e) => (e.category === 'power') &&
             (!(e as any).classRequirement || normalizeText(String((e as any).classRequirement)).includes(normalizeText(activeAgent.classId)))
    );
    for (const p of classPowers) {
      const norm = normalizeText(p.name);
      if (keywords.some((kw) => norm.includes(kw)) || lowerQuery.includes(norm)) {
        if (!matchedEntityIds.has(p.id)) {
          matchedEntityIds.add(p.id);
          matchedEntities.push(p);
        }
      }
      if (matchedEntities.length >= 4) break;
    }
  }

  // Busca geral no Compêndio (Rituais, Poderes, Criaturas, Regras, Armas, etc.)
  for (const ent of allEntities) {
    if (matchedEntityIds.has(ent.id)) continue;
    const entNameNorm = normalizeText(ent.name);

    if (lowerQuery.includes(entNameNorm) && entNameNorm.length >= 4) {
      matchedEntityIds.add(ent.id);
      matchedEntities.push(ent);
    } else {
      for (const kw of keywords) {
        if (entNameNorm.includes(kw)) {
          matchedEntityIds.add(ent.id);
          matchedEntities.push(ent);
          break;
        }
      }
    }
    if (matchedEntities.length >= 8) break;
  }

  // 2. Busca nas Páginas dos Livros Canônicos com filtro inteligente
  const citations: AiCitation[] = [];
  const pageSearchSnippets: Array<{ bookTitle: string; pageNumber: number; section: string; snippet: string }> = [];

  const searchQueriesToTry = [
    query.trim(),
    keywords.slice(0, 2).join(' '),
    ...keywords.slice(0, 3),
  ].filter((q) => q.length >= 3);

  // Se for Árbitro, adiciona termos mecânicos para enriquecer combate
  if (isArbitro && !keywords.includes('combate') && !keywords.includes('acao')) {
    searchQueriesToTry.push('combate acoes manobras');
  }

  const seenPageKeys = new Set<string>();

  for (const sq of searchQueriesToTry) {
    const rawResults = defaultRepository.searchInBookPages('all', sq);
    for (const r of rawResults) {
      const key = `${r.bookId}_${r.pageNumber}`;
      if (!seenPageKeys.has(key)) {
        seenPageKeys.add(key);
        citations.push({
          bookId: r.bookId,
          bookTitle: r.bookTitle,
          pageNumber: r.pageNumber,
          snippet: r.snippet,
          section: r.section,
        });
        pageSearchSnippets.push(r);
      }
      if (pageSearchSnippets.length >= 6) break;
    }
    if (pageSearchSnippets.length >= 6) break;
  }

  // 3. Busca no Manual do Usuário e Telas do Aplicativo
  let matchedManualSections = searchManual(query).slice(0, 3);
  if (matchedManualSections.length === 0) {
    const seenSecIds = new Set<string>();
    for (const kw of keywords) {
      const secResults = searchManual(kw);
      for (const s of secResults) {
        if (!seenSecIds.has(s.id)) {
          seenSecIds.add(s.id);
          matchedManualSections.push(s);
        }
      }
      if (matchedManualSections.length >= 3) break;
    }
  }

  // 4. Montagem das Diretrizes do Sistema (Persona Especializada, Canônica ou Relíquia)
  let systemPrompt = `${buildPersonaSystemPrompt(resolvedPersona)}\n\n`;

  if (config.customInstructions && config.customInstructions.trim()) {
    systemPrompt += `INSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${config.customInstructions.trim()}\n\n`;
  }

  systemPrompt += `DIRETRIZES DE FORMATAÇÃO E CITAÇÃO:
1. Sempre que mencionar regras de livros oficiais, cite a fonte exata assim: [Livro Base, Pág. X] ou [Sobrevivendo ao Horror, Pág. Y].
2. Se citar uma entidade do compêndio, use a tag: [Entidade: NomeDaEntidade].
3. Se for útil rolar dados para a situação, sugira a rolagem assim: [Rolar: 3d20] ou [Rolar: 2d8+4].
4. Se indicar onde fazer algo no aplicativo OrdoCompanion, indique a aba: [Aba: compendio], [Aba: characters], [Aba: weapons], [Aba: books], [Aba: dice], [Aba: table] ou [Aba: favorites]. Integre a menção de forma natural na frase (ex: "Você pode testar isso no [Aba: dice]"), e NUNCA cole tags soltas no final de fórmulas ou cálculos!
5. REGRA RESTRITA DE MATEMÁTICA E CÁLCULOS (NUNCA USE LATEX):
   - É TOTALMENTE PROIBIDO usar notação LaTeX ($$, $, \\text{}, \\times, \\frac, etc.)!
   - O aplicativo roda em dispositivos móveis e navegadores sem suporte a renderizador KaTeX.
   - Apresente todos os cálculos de dano, passos de dano, testes, custos de PE e fórmulas em TEXTO DIRETO e LEGÍVEL ou em blocos de código markdown (crase \`).
   - Exemplo correto: "(Dano Base Modificado: 3d8 + 2) x 3 = 9d8 + 6" ou \`9d8 + 6\`.
   - Exemplo proibido: "$$(\\text{Dano: } 3d8+2) \\times 3$$".
6. DIRETRIZ SUPREMA DE VERACIDADE CANÔNICA (PROIBIÇÃO TOTAL DE ALUCINAÇÃO):
   - NUNCA GERE INFORMAÇÕES FALSAS EM HIPÓTESE NENHUMA!
   - É terminantemente proibido inventar regras, mecânicas, rituais, poderes, perícias, origens, trilhas, criaturas, itens ou números de páginas inexistentes.
   - Fique estritamente nos limites do sistema canônico de Ordem Paranormal RPG:
     * Rituais só vão até o 4º Círculo (NÃO existe 5º Círculo nem rituais acima disso).
     * Os atributos são apenas 5: AGI, FOR, INT, PRE e VIG (não existem Destreza, Constituição, Sabedoria ou Carisma).
     * Graus de treinamento em perícias são apenas três: Treinado (+5), Veterano (+10) e Expert (+15).
     * Classes oficiais são: Combatente, Especialista, Ocultista e Sobrevivente (Sobrevivendo ao Horror).
     * Não use mecânicas ou jargões de outros jogos (como "mana", "slots de magia", "nível" em vez de NEX %, "CA" em vez de Defesa).
   - Se o usuário perguntar sobre algo inexistente no sistema oficial ou que não esteja nos dados catalogados, DECLARE EXPRESSAMENTE que aquilo NÃO EXISTE OFICIALMENTE no sistema de Ordem Paranormal RPG, mantendo o tom da sua persona. NUNCA tente inventar uma resposta fingindo que é regra oficial.
   - Se o usuário pedir expressamente para criar algo personalizado ou caseiro (homebrew), você pode sugerir criativamente, mas DEVE OBRIGATORIAMENTE iniciar o trecho com a etiqueta destacada "[CRIAÇÃO CASEIRA / HOMEBREW]" para que o jogador saiba que não é oficial.
   - Só cite números de páginas se constarem com certeza nas fontes do contexto fornecido. Nunca invente páginas fictícias.
7. Responda em Português do Brasil com excelente clareza em Markdown.\n\n`;

  // 5. Injeção de Contexto do Agente Ativo (se houver)
  if (activeAgent) {
    systemPrompt += `CONTEXTO DO AGENTE EM JOGO ATUALMENTE:
- Nome: ${activeAgent.name || 'Sem nome'} (Jogador: ${activeAgent.player || 'Agente'})
- Classe / Trilha: ${activeAgent.classId || 'Nenhuma'} (${activeAgent.trackId || 'Sem trilha'})
- NEX: ${activeAgent.nex || 5}% | Origem: ${activeAgent.originId || 'Não informada'} | Patente: ${activeAgent.rank || 'Recruta'}
- Atributos: AGI ${activeAgent.attributes?.AGI ?? 1}, FOR ${activeAgent.attributes?.FOR ?? 1}, INT ${activeAgent.attributes?.INT ?? 1}, PRE ${activeAgent.attributes?.PRE ?? 1}, VIG ${activeAgent.attributes?.VIG ?? 1}
- Status: PV ${activeAgent.pvCurrent ?? 0}/${activeAgent.pvMax ?? 0}, SAN ${activeAgent.sanCurrent ?? 0}/${activeAgent.sanMax ?? 0}, PE ${activeAgent.peCurrent ?? 0}/${activeAgent.peMax ?? 0}, Defesa Bônus ${activeAgent.defenseBonus ?? 0}
- Limite de PE por Turno: ${Math.max(1, Math.floor((activeAgent.nex || 5) / 5))}
- Perícias Treinadas: ${Object.entries(activeAgent.skills || {})
      .filter(([_, v]) => v?.degree && v.degree > 0)
      .map(([k, v]) => `${k} (+${v.bonus || v.degree})`)
      .join(', ') || 'Nenhuma registrada'}
Use este contexto para dar respostas personalizadas ao agente quando a pergunta for aplicável a ele!\n\n`;
  }

  // 6. Injeção de Dados do Manual do Aplicativo
  if (matchedManualSections.length > 0) {
    systemPrompt += `BASE DE CONHECIMENTO DO APLICATIVO (MANUAL DO USUÁRIO):\n`;
    for (const sec of matchedManualSections) {
      systemPrompt += `### Seção: ${sec.title} (${sec.badge})\n${sec.summary}\n`;
      for (const feat of sec.features.slice(0, 3)) {
        systemPrompt += `- **${feat.title}**: ${feat.description}\n  Passos: ${feat.howToUse.join(' ')}\n`;
        if (feat.formulaOrExample) {
          systemPrompt += `  Exemplo/Fórmula: ${feat.formulaOrExample}\n`;
        }
      }
      if (sec.proTip) systemPrompt += `  Dica: ${sec.proTip}\n`;
    }
    systemPrompt += `\n`;
  }

  // 7. Injeção de Entidades do Compêndio
  if (matchedEntities.length > 0) {
    systemPrompt += `REGISTROS OFICIAIS DO COMPÊNDIO ENCONTRADOS:\n`;
    for (const ent of matchedEntities) {
      systemPrompt += `---
Nome: ${ent.name} (Categoria: ${ent.category}${ent.subCategory ? ` / ${ent.subCategory}` : ''})
Elemento: ${ent.element || 'Nenhum'} | Fonte: ${ent.bookTitle || 'Livro Base'}${ent.pageNumber ? ` pág. ${ent.pageNumber}` : ''}
Descrição: ${ent.description || ent.summary}
${ent.circle ? `Círculo: ${ent.circle}º` : ''} ${ent.execution ? `| Execução: ${ent.execution}` : ''} ${ent.range ? `| Alcance: ${ent.range}` : ''}
${ent.damage ? `Dano/Efeito: ${ent.damage}` : ''}
`;
    }
    systemPrompt += `\n`;
  }

  // 8. Injeção de Páginas dos Livros Oficiais
  if (pageSearchSnippets.length > 0) {
    systemPrompt += `TRECHOS EXTRAÍDOS DOS LIVROS CANÔNICOS:\n`;
    for (const p of pageSearchSnippets) {
      systemPrompt += `[${p.bookTitle}, Pág. ${p.pageNumber} - Seção: ${p.section || 'Geral'}]
"...${p.snippet}..."\n\n`;
    }
  }

  return {
    systemPrompt,
    citations,
    matchedEntities,
    matchedManualSections,
    resolvedPersona,
  };
}
