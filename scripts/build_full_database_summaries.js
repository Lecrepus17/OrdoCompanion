const fs = require('fs');
const path = require('path');

console.log('Generating complete abilitySummarizer.ts and updating compendium_seed.json...');

const data = JSON.parse(fs.readFileSync('./data/compendium_seed.json', 'utf8'));

const { SUMMARIES, normKey } = require('./compile_canonical_dict.js');

// Add expansion powers, survivor powers, and fix typos
const EXTRA_SUMMARIES = {
  // Fix typos/variations
  'apagarasluzes': 'Extingue todas as luzes da cena gerando escuridão total.',
  'envoltoemisterio': '+5 em testes de Enganação e resistência contra Ocultismo.',
  'cientedascicatrizes': '+2 em Medicina para diagnosticar ferimentos e armas.',
  'cientedasmarcas': '+2 em Medicina para diagnosticar ferimentos e armas.',

  // Expansion Powers (Sobrevivendo ao Horror, etc.)
  'acrobatico': '+2 em Acrobacia e levanta-se como ação livre.',
  'asdovolante': '+2 em Pilotagem e manobras veiculares evasivas.',
  'atletico': '+2 em Atletismo e deslocamento de escalada/natação normal.',
  'atraente': '+2 em Diplomacia e Enganação com alvos compatíveis.',
  'dedosageis': '+2 em Crime; furta ou arromba como ação de movimento.',
  'detectordementiras': '+2 em Intuição para perceber mentiras de terceiros.',
  'especialistaememergencias': '+2 em Medicina e cura bônus em primeiros socorros.',
  'estigmado': 'Marca paranormal concede +1 em testes de resistência.',
  'focoempericia': '+2 no teste da perícia escolhida.',
  'informado': '+2 em Atualidades e Ciências em investigações.',
  'interrogador': '+2 em Intimidação e descobre pistas ao interrogar.',
  'mentirosonato': '+2 em Enganação e não sofre penalidades ao mentir.',
  'observador': '+2 em Percepção e Investigação.',
  'paidepet': '+2 em Adestramento e parceiro animal ganha bônus.',
  'palavrasdedevocao': '+2 em Religião e concede determinação a aliados.',
  'parceiro': 'Possui parceiro NPC que concede bônus mecânicos.',
  'pensamentotatico': '+2 em Tática e bônus de posicionamento em combate.',
  'personalidadeesoterica': '+2 em Ocultismo e resistência contra efeitos mágicos.',
  'persuasivo': '+2 em Diplomacia para mudar atitude e persuadir.',
  'pesquisadorcientifico': '+2 em Ciências e Investigação ao analisar amostras.',
  'proativo': '+2 em Iniciativa e age primeiro em empates.',
  'provisoesdeemergencia': 'Carrega itens de sobrevivência ocupando menos espaço.',
  'racionalidadeinflexivel': '+2 em Vontade contra efeitos de emoção e manipulação.',
  'ratodecomputador': '+2 em Tecnologia para invadir e pesquisar na web.',
  'respostarapida': 'Gaste 1 PE para agir imediatamente ao ser surpreendido.',
  'sentidosagucados': '+2 em Percepção e ignora penalidades de escuridão.',
  'sobrevivencialista': '+2 em Sobrevivência e imune a venenos comuns.',
  'sorrateiro': '+2 em Furtividade e move-se sem emitir som.',
  'vitalidadereforcada': '+1 PV por 5% de NEX.',
  'vontadeinabalavel': '+2 em Vontade contra efeitos mentais e de medo.',
  'maosfirmes': '+2 em testes de ataque ao disparar com duas mãos.',
  'planodefuga': 'Concede deslocamento extra a aliados para fugir da cena.',
  'ambidestria': 'Reduz em -2 a penalidade de combater com duas armas.',
  'chuvadebalas': 'Gaste 2 PE para disparar rajada automática em área.',
  'combatenteesforcado': '+1 em atributo físico ou perícia de combate.',
  'treinamentomilitarizado': 'Proficiência com armas táticas e proteções leves.',
  'remoermemorias': 'Relembra memórias traumáticas para recuperar 1 PE.',
  'resistirapressao': '+2 em testes de resistência sob pressão ou perigo.',
  'deixeossussurrosguiarem': 'Ouve sussurros paranormais para receber +5 em Ocultismo.',
  'dominioesoterico': 'Aumenta dano ou cura de rituais elementais em +1d.',
  'estalosmacabros': 'Reação (1 PE): estala juntas para impor desvantagem em ataque.',
  'minhadormeimpulsiona': 'Ao sofrer dano (1 PE): ganha +2 no próximo ataque ou teste.',
  'nosolhosdomonstro': 'Encarar criatura não causa abalo e concede bônus de ação.',
  'olharsinistro': '+2 em Intimidação e causa condição Abalado com o olhar.',
  'sentidopremonitorio': 'Não pode ser surpreendido e +2 em testes de Reflexos.',
  'sincroniaparanormal': 'Conjura rituais em sincronia com aliados amplificando efeito.',
  'tracadoconjuratorio': 'Reduz em 1 rodada o tempo de conjuração de rituais.',
  'talentoso': 'Recebe treinamento em uma perícia à sua escolha.',
  'teimosiaobstinada': '1x/cena: rola novamente um teste de Vontade recém-falho.',
  'tenacidade': 'Quando machucado, recebe RD 2 contra todo tipo de dano.',
  'espreitardabesta': '+5 em Furtividade enquanto estiver caçando uma criatura.',
  'instintossanguinarios': 'Ao acertar alvo machucado: causa +2 de dano de Sangue.',
  'anteciparvitalidade': 'Sente a quantidade de PV de criaturas e seres próximos.',
  'auradepavor': 'Inimigos adjacentes sofrem -2 em testes de ataque e perícia.',
  'absorverconhecimento': 'Ao examinar corpo ou livro: aprende fatos sem teste.',
  'apatiaherege': 'Imunidade a efeitos mentais que manipulem suas emoções.',
  'conexaoempatica': 'Sente a localização e estado vital de seus aliados.',
  'valersedocaos': 'Gaste 1 PE: soma resultado do dado do caos em teste.',
  'acostumadoamaldicaodeelemento': 'Não sofre efeitos colaterais de maldições do elemento.',
  'reterritualdecombate': 'Mantém ritual pronto para disparar como reação.',
  'ritualintenso': 'Aumenta a DT do ritual escolhido em +2.',
  'saudesobrenatural': 'Recebe cura acelerada e imune a doenças mundanas.',
  'cicatrizesexpostas': '+2 em Intimidação e RD 2 contra dano de corte/perfuração.',
  'curiosidadeoculta': '+2 em Ocultismo e Investigação ao analisar anomalias.',
  'especialistaexoterico': 'Usa itens amaldiçoados sem sofrer penalidades de Sanidade.',
  'habilidadeaprimorada': 'Aumenta em +1 o bônus de uma habilidade de classe.',
  'instintosurbanos': '+2 em Percepção e Sobrevivência em ambientes urbanos.',
  'ferromaculado': 'Armas metálicas empunhadas causam +2 de dano de Sangue.',
  'placassanguinolentas': 'Placas ósseas concedem +2 na Defesa e RD 2 física.',
  'sanguecorrosivo': 'Seu sangue queima agressores causando dano ácido.',
  'sangueprazeroso': 'Ao causar dano letal: recupera 1d4 pontos de Sanidade.',
  'predadordesangue': '+2 em rolagens de ataque e dano contra alvos feridos.',
  'pressaoatmosferica': 'Cria onda de choque repelindo projéteis e oponentes.',
  'engolirsangue': 'Bebe sangue de ser recém-morto para recuperar 2d8 PV.',
  'omaispoderes': 'Aprende poderes adicionais de sua classe ou afinidade.',
  'guardiaodatropa': 'Recebe dano no lugar de aliado adjacente voluntariamente.',
  'vitalidadesofrida': 'Soma dano sofrido como bônus no próximo golpe.',
  'flagelobemaproveitado': 'Ao pagar PV por PE: ganha +1 PE adicional temporário.',
  'recuperacaoflagelante': 'Recupera PV mais rapidamente durante cenas de interlúdio.',
  'conhecimentodedirecaoprecognitiva': 'Antecipa trajetórias de ataques recebendo +2 Defesa.',
  'arroganciadiabolica': '+2 em testes de presença e resiste a coerção mental.',
  'causarculpa': 'Alvo sofre penalidade de remorso após ferir você.',
  'despertarobsessao': 'Induz obsessão em alvo fazendo-o focar em um objetivo.',
  'estimularhedonismo': 'Distrai alvos com desejos intensos e tentações.',
  'frutodaambicao': '+1 em atributo escolhido em troca de penalidade em SAN.',
  'odiosuprimido': 'Acumula bônus de dano conforme sofre ferimentos na cena.',
  'analiseconturbada': 'Usa Investigação para desestabilizar a mente do oponente.',
  'profissaoo perigo': 'Improvisa equipamentos com qualquer sucata disponível.',
  'profissaoperigo': 'Improvisa equipamentos com qualquer sucata disponível.',
  'quasenovo': 'Ação de manutenção recupera durabilidade de itens estragados.',
  'ruidodecomunicacao': 'Interfere em transmissões e sentidos mágicos na área.',
  'desafiarego': 'Provoca inimigo forçando-o a atacar você com desvantagem.',
  'deadmanswitch': 'Ao cair a 0 PV: dispara ritual ou efeito preparado livre.',
  'paralinguisticaampliada': 'Comunica-se por telepatia com aliados em alcance médio.',
  'transmissaodepericia': '1x/cena (2 PE): compartilha grau de treino com aliado.',
  'transmissaodepoder': '1x/cena (3 PE): compartilha benefício de poder com aliado.',
  'transmissaoderitual': '1x/cena (3 PE): permite aliado conjurar seu ritual.',
  'analisecombativa': 'Analisa oponente descobrindo sua Defesa e fraquezas.',
  'especialistaemprotecaoleve': 'Soma +1 na Defesa ao usar proteções leves.',
  'doutordeemergencias': 'Aumenta cura de Medicina e Paramédico em +1d10.',
  'escudoespiraltemporal': 'Envelhece armas e munições que atinjam você reduzindo dano.',
  'resistiraelemento': 'Recebe RD 10 contra dano do elemento escolhido.',
  'zonadossussurros': 'Cria área onde apenas aliados conseguem se comunicar.',
  'disparodamorte': 'Ataque à distância causa dano extra de Morte.',
  'instrumentoeletricodecombate': 'Arma causa dano elétrico adicional e atordoa.',
  'causafortuita': 'Gaste 1 PE para +1d6 em teste de investigação.',
  'causalidadefortuita': 'Gaste 1 PE para +1d6 em teste de investigação.',
};

const ALL_SUMMARIES = { ...SUMMARIES, ...EXTRA_SUMMARIES };

// Check all lengths
for (const [k, v] of Object.entries(ALL_SUMMARIES)) {
  if (v.length > 68) {
    console.error(`ERROR in key ${k}: length ${v.length} > 68: "${v}"`);
    process.exit(1);
  }
}
console.log(`Total verified canonical entries: ${Object.keys(ALL_SUMMARIES).length}`);

function buildRuleBasedSummary(rawText) {
  if (!rawText) return '';
  let text = String(rawText).replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
  if (text.length <= 65) return text;

  // Cleanup OCR / book table artifacts
  text = text.replace(/\d+%\s*Poder de [^]+?(\.\s*|$)/gi, '');
  text = text.replace(/\d+%\s*Aumento de [^]+?(\.\s*|$)/gi, '');
  text = text.replace(/\d+%\s*Grau de [^]+?(\.\s*|$)/gi, '');
  text = text.replace(/\d+%\s*Habilidade de [^]+?(\.\s*|$)/gi, '');
  text = text.replace(/\d+%\s*Ataque especial [^]+?(\.\s*|$)/gi, '');

  const rules = [
    [/Quando faz um teste de ([^,]+), você pode gastar (\d+) PE para receber \+?(\d+) nesse teste/i, 'Gaste $2 PE para +$3 em teste de $1.'],
    [/Quando faz um teste usando ([^,]+), você pode gastar (\d+) PE para receber \+?(\d+) nesse teste/i, 'Gaste $2 PE para +$3 em teste de $1.'],
    [/Sempre que faz um teste de perícia durante um teste estendido, pode pagar (\d+) PE para receber \+?(\d+) nesse teste/i, 'Teste estendido (gaste $1 PE): +$2 no teste.'],
    [/Sempre que faz um teste para ajudar, você pode gastar (\d+) PE para aumentar o bônus concedido em \+?(\d+)/i, 'Ao Ajudar ($1 PE): bônus aumenta em +$2.'],
    [/Uma vez por cena, quando fizer um teste para procurar pistas, você pode gastar (\d+) PE para receber \+?(\d+) nesse teste/i, '1x/cena ($1 PE): +$2 ao procurar pistas.'],
    [/Uma vez por cena, você pode gastar (\d+) PE para substituir um teste de perícia qualquer por um teste de ([^.]+)/i, '1x/cena ($1 PE): substitui perícia por $2.'],
    [/Quando faz um teste de ([^,]+), você pode gastar (\d+) PE para usar ([^ ]+) no lugar dessa perícia/i, 'Gaste $2 PE: usa $3 no lugar de $1.'],
    [/Você recebe \+?(\d+) PV para cada (\d+)% de NEX/i, '+$1 PV a cada $2% de NEX.'],
    [/Você recebe \+?(\d+) de Sanidade para cada (\d+)% de NEX/i, '+$1 SAN a cada $2% de NEX.'],
    [/Você recebe \+?(\d+) em rolagens de dano com armas de fogo/i, '+$1 no dano com armas de fogo.'],
    [/Você recebe \+?(\d+) em rolagens de dano com ataques corpo a corpo/i, '+$1 no dano corpo a corpo.'],
    [/Você recebe \+?(\d+) em Defesa/i, '+$1 na Defesa.'],
    [/Você recebe proficiência com ([^.]+)/i, 'Proficiência com $1.'],
    [/Você recebe \+?(\d+) em testes de ([^.]+) para ([^.]+)/i, '+$1 em $2 para $3.'],
    [/Você não sofre penalidade em deslocamento por terreno difícil/i, 'Sem penalidade em terreno difícil.'],
    [/Uma vez por rodada, quando faz um ataque, você pode gastar (\d+) PE para fazer um ataque adicional/i, '1x/rodada ($1 PE): faz um ataque adicional.'],
    [/Uma vez por rodada, você pode gastar (\d+) PE para realizar uma ação padrão ou de movimento adicional/i, '1x/rodada ($1 PE): ação padrão ou de movimento extra.'],
    [/Quando faz a ação agredir, você pode combater defensivamente/i, 'Ao Agredir: -2 no ataque para +5 na Defesa.'],
    [/Sempre que bloquear um ataque, você pode gastar uma reação e (\d+) PE para fazer um ataque corpo a corpo/i, 'Ao bloquear ($1 PE): contra-ataque corpo a corpo livre.'],
    [/Ao sofrer dano não paranormal, você pode gastar uma reação e (\d+) PE para reduzir esse dano à metade/i, 'Reação ($1 PE): reduz dano físico à metade.'],
    [/Quando acerta um ataque corpo a corpo, você pode gastar (\d+) PE para realizar uma manobra/i, 'Ao acertar (gaste $1 PE): realiza manobra livre.'],
    [/Você recebe treinamento em ([^.]+)/i, 'Treinado em $1.'],
  ];

  for (const [re, rep] of rules) {
    if (re.test(text)) {
      text = text.replace(re, rep);
      if (text.length <= 65) return text;
    }
  }

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 0) {
    const first = sentences[0].trim();
    if (first.length >= 20 && first.length <= 65) {
      return first;
    }
  }

  // Truncate cleanly at whole word
  if (text.length > 65) {
    const cut = text.slice(0, 62);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 35 ? cut.slice(0, lastSpace) : cut) + '...';
  }

  return text;
}

// Test on compendium_seed.json
let updatedCount = 0;
data.entities.forEach(e => {
  const k1 = normKey(e.name);
  const k2 = normKey(e.powerName);
  const matched = ALL_SUMMARIES[k1] || (k2 && ALL_SUMMARIES[k2]);

  if (matched) {
    e.summary = matched;
    updatedCount++;
    if (e.category === 'origin' && e.powerDescription && e.powerDescription.length > 200) {
      // Keep powerDescription clean or provide concise description
      // if powerDescription is huge, summarize but preserve original in description
    }
  } else if (e.category === 'power' || e.category === 'ritual' || e.category === 'origin') {
    // Generate rule-based summary
    const sourceText = e.powerDescription || e.summary || e.description || '';
    const generated = buildRuleBasedSummary(sourceText);
    if (generated && generated.length <= 68) {
      e.summary = generated;
      ALL_SUMMARIES[k1] = generated;
      if (k2) ALL_SUMMARIES[k2] = generated;
      updatedCount++;
    }
  }
});

console.log(`Updated summaries in compendium_seed.json: ${updatedCount} entities`);

// Clean specific corrupted text like Segurar o Gatilho in compendium_seed
const segurar = data.entities.find(e => e.name === 'Segurar o Gatilho');
if (segurar) {
  segurar.summary = 'Arma de fogo: gaste +2 PE cumulativos por ataque extra consecutivo.';
  segurar.description = 'Sempre que acerta um ataque com uma arma de fogo, você pode gastar +2 PE para realizar outro ataque com a mesma arma contra o mesmo alvo, pagando 2 PE cumulativos por cada ataque já realizado no turno.';
}

// Write back to both data/compendium_seed.json and src/data/seed/compendium_seed.json
const jsonString = JSON.stringify(data, null, 2);
fs.writeFileSync('./data/compendium_seed.json', jsonString, 'utf8');
fs.writeFileSync('./src/data/seed/compendium_seed.json', jsonString, 'utf8');
console.log('Saved updated compendium_seed.json in both data/ and src/data/seed/');

// Generate src/utils/abilitySummarizer.ts
const tsContent = `// Autogenerated by scripts/build_full_database_summaries.js
// Provides canonical concise summaries (<= 65 chars) for all abilities, powers, rituals, origins, tracks and attacks.

export function normalizeAbilityKey(str?: string | null): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/\\s*\\(nex\\s*\\d+%\\)/gi, '')
    .replace(/\\s*\\(\\d+%\\)/gi, '')
    .replace(/\\s*\\((combatente|especialista|ocultista|sobrevivente)\\)/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export const CANONICAL_ABILITY_SUMMARIES: Record<string, string> = ${JSON.stringify(ALL_SUMMARIES, null, 2)};

/**
 * Heuristic summarizer for custom or unmapped abilities
 */
export function buildRuleBasedSummary(rawText?: string | null): string {
  if (!rawText) return '';
  let text = String(rawText).replace(/\\s+/g, ' ').replace(/\\n+/g, ' ').trim();
  if (text.length <= 65) return text;

  // Cleanup OCR / book table artifacts
  text = text.replace(/\\d+%\\s*Poder de [^]+?(\\.\s*|$)/gi, '');
  text = text.replace(/\\d+%\\s*Aumento de [^]+?(\\.\s*|$)/gi, '');
  text = text.replace(/\\d+%\\s*Grau de [^]+?(\\.\s*|$)/gi, '');
  text = text.replace(/\\d+%\\s*Habilidade de [^]+?(\\.\s*|$)/gi, '');
  text = text.replace(/\\d+%\\s*Ataque especial [^]+?(\\.\s*|$)/gi, '');

  const rules: Array<[RegExp, string]> = [
    [/Quando faz um teste de ([^,]+), você pode gastar (\\d+) PE para receber \\+?(\\d+) nesse teste/i, 'Gaste $2 PE para +$3 em teste de $1.'],
    [/Quando faz um teste usando ([^,]+), você pode gastar (\\d+) PE para receber \\+?(\\d+) nesse teste/i, 'Gaste $2 PE para +$3 em teste de $1.'],
    [/Sempre que faz um teste de perícia durante um teste estendido, pode pagar (\\d+) PE para receber \\+?(\\d+) nesse teste/i, 'Teste estendido (gaste $1 PE): +$2 no teste.'],
    [/Sempre que faz um teste para ajudar, você pode gastar (\\d+) PE para aumentar o bônus concedido em \\+?(\\d+)/i, 'Ao Ajudar ($1 PE): bônus aumenta em +$2.'],
    [/Uma vez por cena, quando fizer um teste para procurar pistas, você pode gastar (\\d+) PE para receber \\+?(\\d+) nesse teste/i, '1x/cena ($1 PE): +$2 ao procurar pistas.'],
    [/Uma vez por cena, você pode gastar (\\d+) PE para substituir um teste de perícia qualquer por um teste de ([^.]+)/i, '1x/cena ($1 PE): substitui perícia por $2.'],
    [/Quando faz um teste de ([^,]+), você pode gastar (\\d+) PE para usar ([^ ]+) no lugar dessa perícia/i, 'Gaste $2 PE: usa $3 no lugar de $1.'],
    [/Você recebe \\+?(\\d+) PV para cada (\\d+)% de NEX/i, '+$1 PV a cada $2% de NEX.'],
    [/Você recebe \\+?(\\d+) de Sanidade para cada (\\d+)% de NEX/i, '+$1 SAN a cada $2% de NEX.'],
    [/Você recebe \\+?(\\d+) em rolagens de dano com armas de fogo/i, '+$1 no dano com armas de fogo.'],
    [/Você recebe \\+?(\\d+) em rolagens de dano com ataques corpo a corpo/i, '+$1 no dano corpo a corpo.'],
    [/Você recebe \\+?(\\d+) em Defesa/i, '+$1 na Defesa.'],
    [/Você recebe proficiência com ([^.]+)/i, 'Proficiência com $1.'],
    [/Você recebe \\+?(\\d+) em testes de ([^.]+) para ([^.]+)/i, '+$1 em $2 para $3.'],
    [/Você não sofre penalidade em deslocamento por terreno difícil/i, 'Sem penalidade em terreno difícil.'],
    [/Uma vez por rodada, quando faz um ataque, você pode gastar (\\d+) PE para fazer um ataque adicional/i, '1x/rodada ($1 PE): faz um ataque adicional.'],
    [/Uma vez por rodada, você pode gastar (\\d+) PE para realizar uma ação padrão ou de movimento adicional/i, '1x/rodada ($1 PE): ação padrão ou de movimento extra.'],
    [/Quando faz a ação agredir, você pode combater defensivamente/i, 'Ao Agredir: -2 no ataque para +5 na Defesa.'],
    [/Sempre que bloquear um ataque, você pode gastar uma reação e (\\d+) PE para fazer um ataque corpo a corpo/i, 'Ao bloquear ($1 PE): contra-ataque corpo a corpo livre.'],
    [/Ao sofrer dano não paranormal, você pode gastar uma reação e (\\d+) PE para reduzir esse dano à metade/i, 'Reação ($1 PE): reduz dano físico à metade.'],
    [/Quando acerta um ataque corpo a corpo, você pode gastar (\\d+) PE para realizar uma manobra/i, 'Ao acertar (gaste $1 PE): realiza manobra livre.'],
    [/Você recebe treinamento em ([^.]+)/i, 'Treinado em $1.'],
  ];

  for (const [re, rep] of rules) {
    if (re.test(text)) {
      text = text.replace(re, rep);
      if (text.length <= 65) return text;
    }
  }

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\\s+/);
  if (sentences.length > 0) {
    const first = sentences[0].trim();
    if (first.length >= 20 && first.length <= 65) {
      return first;
    }
  }

  // Truncate cleanly at whole word
  if (text.length > 65) {
    const cut = text.slice(0, 62);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 35 ? cut.slice(0, lastSpace) : cut) + '...';
  }

  return text;
}

/**
 * Returns a concise summary of an ability for the character sheet PDF.
 * Checks canonical dictionary first, falls back to rule-based engine.
 */
export function summarizeAbility(name?: string | null, fullDescription?: string | null): string {
  const k1 = normalizeAbilityKey(name);
  if (k1 && CANONICAL_ABILITY_SUMMARIES[k1]) {
    return CANONICAL_ABILITY_SUMMARIES[k1];
  }

  // Check if description itself matches or contains clean text
  if (fullDescription) {
    const kDesc = normalizeAbilityKey(fullDescription);
    if (kDesc && CANONICAL_ABILITY_SUMMARIES[kDesc]) {
      return CANONICAL_ABILITY_SUMMARIES[kDesc];
    }
    return buildRuleBasedSummary(fullDescription);
  }

  return name || '';
}

export interface AttackSummaryInput {
  critical?: string | null;
  range?: string | null;
  special?: string | null;
  damageType?: string | null;
}

/**
 * Formats critical, range, damage type and special weapon modifications
 * into a compact string that fits in the 29.5% width Ataques column.
 */
export function summarizeAttackCritSpec(atk: AttackSummaryInput): string {
  const parts: string[] = [];

  // Critical (e.g. 19/x2)
  if (atk.critical && atk.critical !== '—' && atk.critical !== '-') {
    parts.push(atk.critical.trim());
  }

  // Range (abbreviated: CaC, Curto, Médio, Longo, Extr.)
  if (atk.range) {
    let r = atk.range.trim();
    const rLower = r.toLowerCase();
    if (rLower === 'corpo a corpo' || rLower === 'cac') r = 'CaC';
    else if (rLower === 'extremo') r = 'Extr.';
    parts.push(r);
  }

  // Special / Damage Type / Modifications
  if (atk.special || atk.damageType) {
    let spec = (atk.special || '').trim();

    // Abbreviate common game damage types & tags
    spec = spec
      .replace(/\\bBalístico\\b/gi, 'Bal.')
      .replace(/\\bImpacto\\b/gi, 'Imp.')
      .replace(/\\bPerfuração\\b/gi, 'Perf.')
      .replace(/\\bEletricidade\\b/gi, 'Elétr.')
      .replace(/\\bQuímico\\b/gi, 'Quím.')
      .replace(/\\bMental\\b/gi, 'Ment.')
      .replace(/Modificações?:\\s*/gi, '')
      .replace(/Modificação:\\s*/gi, '')
      .replace(/Categoria:\\s*/gi, 'Cat ')
      .replace(/Margem de ameaça\\s*\\+?(\\d+)/gi, '+$1 Margem')
      .replace(/Margem\\s*\\+?(\\d+)/gi, '+$1 Margem')
      .replace(/Ataque\\s*\\+?(\\d+)/gi, '+$1 Atk')
      .replace(/Dano\\s*\\+?(\\d+)/gi, '+$1 Dano')
      .replace(/Penalidade de Furtividade reduzida/gi, 'Furtivo')
      .replace(/\\s+/g, ' ')
      .trim();

    if (spec) {
      parts.push(spec);
    }
  }

  let result = parts.filter(Boolean).join(' • ');

  // Keep within ~48 characters so it never overflows the 29.5% column
  if (result.length > 50) {
    const cut = result.slice(0, 48);
    const lastSpace = cut.lastIndexOf(' ');
    result = (lastSpace > 28 ? cut.slice(0, lastSpace) : cut) + '...';
  }

  return result;
}

/**
 * Returns dynamic CSS styling for description text to scale font size based on length
 */
export function getDescStyle(text: string): string {
  const len = (text || '').length;
  if (len > 60) return 'font-size: 8px; letter-spacing: -0.2px;';
  if (len > 45) return 'font-size: 8.5px; letter-spacing: -0.15px;';
  if (len > 30) return 'font-size: 9px;';
  return 'font-size: 9.5px;';
}
`;

fs.writeFileSync('./src/utils/abilitySummarizer.ts', tsContent, 'utf8');
console.log('src/utils/abilitySummarizer.ts generated successfully!');
