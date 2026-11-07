#!/usr/bin/env node

/**
 * Script de Automação de Release com Isolamento de Ciclo (Ordo Companion).
 *
 * Funcionalidades:
 * 1. Sincroniza versão em package.json, app.json (incrementando versionCode de forma idempotente) e version.json.
 * 2. Extrai automaticamente a seção "🚀 Resumo..." de docs/ATUALIZACOES_PENDENTES.md (exclusiva do ciclo atual).
 * 3. Gera docs/RELEASE_NOTES.md contendo APENAS o que foi feito para esta versão e copia para o Clipboard (Ctrl+V).
 * 4. Arquiva os detalhes da versão lançada em docs/HISTORICO_RELEASES.md.
 * 5. Limpa/reseta automaticamente docs/ATUALIZACOES_PENDENTES.md para que a próxima versão comece do zero,
 *    garantindo que uma release NUNCA misture notas de versões anteriores.
 *
 * Uso:
 *   npm run release [nova-versao] [descricao-curta-separada-por-ponto-e-virgula] [--open] [--publish] [--no-reset]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const appJsonPath = path.join(rootDir, 'app.json');
const versionJsonPath = path.join(rootDir, 'version.json');
const pendingUpdatesPath = path.join(rootDir, 'docs', 'ATUALIZACOES_PENDENTES.md');
const releaseNotesPath = path.join(rootDir, 'docs', 'RELEASE_NOTES.md');
const releaseHistoryPath = path.join(rootDir, 'docs', 'HISTORICO_RELEASES.md');

const EMPTY_CYCLE_MARKER = '*(Nenhuma atualização pendente registrada neste ciclo ainda)*';

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith('--')));
const positionalArgs = rawArgs.filter((a) => !a.startsWith('--'));

/**
 * Calcula sugestão inicial de próxima versão (ex: 1.3.0-beta.1 -> 1.3.0-beta.2, ou 1.3.0 -> 1.3.1)
 */
function suggestNextVersion(currentVersion) {
  const betaMatch = currentVersion.match(/^(.*-beta\.)(\d+)$/i);
  if (betaMatch) {
    return `${betaMatch[1]}${Number(betaMatch[2]) + 1}`;
  }
  const parts = currentVersion.split('.');
  if (parts.length === 3 && /^\d+$/.test(parts[2])) {
    parts[2] = String(Number(parts[2]) + 1);
    return parts.join('.');
  }
  return `${currentVersion}.1`;
}

/**
 * Extrai metadados, resumo de usuário e detalhamento técnico de docs/ATUALIZACOES_PENDENTES.md
 */
function parsePendingUpdatesMarkdown() {
  if (!fs.existsSync(pendingUpdatesPath)) {
    return {
      suggestedVersion: null,
      summaryMarkdown: '',
      technicalMarkdown: '',
      topBullets: [],
      isEmptyCycle: true,
    };
  }

  const content = fs.readFileSync(pendingUpdatesPath, 'utf8');

  // 1. Extrai Versão Sugerida: `X.Y.Z...`
  const suggestedMatch = content.match(/\*\*Versão Sugerida\*\*:\s*`([^`]+)`/i);
  const suggestedVersion = suggestedMatch ? suggestedMatch[1].trim() : null;

  // 2. Extrai o bloco "## 🚀 Resumo..." até o próximo "---" ou "## 📦"
  const summaryMatch = content.match(
    /##\s*🚀\s*Resumo[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n---|\r?\n##\s*📦|$)/i
  );
  const rawSummary = summaryMatch ? summaryMatch[1].trim() : '';
  const isEmptyCycle = !rawSummary || rawSummary.includes('*(Nenhuma atualização pendente');
  const summaryMarkdown = isEmptyCycle ? '' : rawSummary;

  // 3. Extrai o bloco "## 📦 Detalhamento..." até "## 🛠️" ou fim do arquivo
  const techMatch = content.match(
    /##\s*📦\s*Detalhamento[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n---[\r\n\s]*##\s*🛠️|\r?\n##\s*🛠️|$)/i
  );
  const technicalMarkdown = techMatch ? techMatch[1].trim() : '';

  // 4. Extrai os bullets principais de 1º nível para o array changelog do version.json
  const topBullets = [];
  if (summaryMarkdown) {
    const lines = summaryMarkdown.split(/\r?\n/);
    for (const line of lines) {
      if (/^[*+-]\s+/.test(line)) {
        const cleaned = line
          .replace(/^[*+-]\s+/, '')
          .replace(/\*\*/g, '')
          .replace(/:$/, '')
          .trim();
        if (cleaned) {
          topBullets.push(cleaned);
        }
      }
    }
  }

  return {
    suggestedVersion,
    summaryMarkdown,
    technicalMarkdown,
    topBullets,
    isEmptyCycle,
  };
}

/**
 * Gera o documento completo docs/RELEASE_NOTES.md formatado para o GitHub Releases
 */
function buildGitHubReleaseNotes(version, summaryMarkdown, changelogList) {
  const bodySection = summaryMarkdown
    ? `## 🚀 Principais Novidades da v${version}\n\n${summaryMarkdown}`
    : `## 🚀 Principais Novidades da v${version}\n\n${changelogList.map((item) => `* ${item}`).join('\n')}`;

  return [
    `# 🩸 Ordo Companion v${version}`,
    '',
    bodySection,
    '',
    '---',
    '',
    '## 📲 Instalação e Atualização (Android APK)',
    '1. Baixe o arquivo **`OrdoCompanion.apk`** anexado abaixo na seção **Assets**.',
    '2. Abra o arquivo no seu smartphone ou tablet Android para instalar ou atualizar mantendo todas as suas fichas, anotações e campanhas salvas.',
    '',
  ].join('\n');
}

/**
 * Arquiva as notas da versão recém-fechada em docs/HISTORICO_RELEASES.md
 */
function archiveReleaseToHistory(version, dateStr, summaryMarkdown, technicalMarkdown) {
  if (!summaryMarkdown) return;

  let existingHistory = '';
  if (fs.existsSync(releaseHistoryPath)) {
    existingHistory = fs.readFileSync(releaseHistoryPath, 'utf8');
  } else {
    existingHistory = [
      '# 📜 Histórico de Releases Publicadas — Ordo Companion',
      '',
      'Arquivo histórico contendo o registro imutável de cada versão lançada.',
      '',
      '---',
      '',
    ].join('\n');
  }

  // Evita duplicar caso a mesma versão já esteja no topo do histórico
  if (existingHistory.includes(`## 🚀 Release v${version} (`)) {
    return;
  }

  const entryLines = [
    `## 🚀 Release v${version} (${dateStr})`,
    '',
    '### Resumo de Usuário (GitHub Release Notes)',
    summaryMarkdown,
    '',
  ];

  if (technicalMarkdown && !technicalMarkdown.includes('*(Nenhuma modificação técnica')) {
    entryLines.push('### Detalhamento Técnico Consolidado', technicalMarkdown, '');
  }

  entryLines.push('---', '');

  const headerEndIdx = existingHistory.indexOf('---\n');
  if (headerEndIdx !== -1) {
    const before = existingHistory.slice(0, headerEndIdx + 4);
    const after = existingHistory.slice(headerEndIdx + 4).replace(/^\r?\n/, '');
    fs.writeFileSync(releaseHistoryPath, `${before}\n${entryLines.join('\n')}\n${after}`, 'utf8');
  } else {
    fs.writeFileSync(releaseHistoryPath, `${existingHistory}\n${entryLines.join('\n')}`, 'utf8');
  }
}

/**
 * Reseta docs/ATUALIZACOES_PENDENTES.md para iniciar um ciclo limpo para a próxima versão
 */
function resetPendingUpdatesForNextCycle(releasedVersion, androidVersionCode, timestampStr) {
  const nextSuggested = suggestNextVersion(releasedVersion);
  const cleanTemplate = [
    '# 📋 Atualizações Pendentes para o Próximo Release',
    '',
    `> **Versão Atual Publicada**: \`${releasedVersion}\` (Android \`versionCode: ${androidVersionCode}\`)  `,
    `> **Versão Sugerida**: \`${nextSuggested}\` (Motivo: [Aguardando novas entregas] Ciclo limpo iniciado após a release \`v${releasedVersion}\`)  `,
    `> **Última Atualização**: ${timestampStr}`,
    '',
    '> [!IMPORTANT]',
    `> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (\`${nextSuggested}\`). Tudo o que pertenceu à \`v${releasedVersion}\` e versões anteriores já foi exportado para \`docs/RELEASE_NOTES.md\` e arquivado em \`docs/HISTORICO_RELEASES.md\`.`,
    '',
    '---',
    '',
    `## 🚀 Resumo do Próximo Release v${nextSuggested} (Changelog de Usuário)`,
    EMPTY_CYCLE_MARKER,
    '',
    '---',
    '',
    '## 📦 Detalhamento Técnico das Modificações',
    '',
    '### ✨ Novas Funcionalidades (Features)',
    '- *(Nenhuma modificação técnica registrada neste ciclo ainda)*',
    '',
    '### 🐛 Correções de Bugs (Fixes)',
    '- *(Nenhuma correção registrada neste ciclo ainda)*',
    '',
    '### 🧪 Testes Automatizados',
    '- *(Aguardando novos testes do ciclo)*',
    '',
    '---',
    '',
    '## 🛠️ Comando para Gerar o Próximo Release',
    '```bash',
    `npm run release ${nextSuggested}`,
    '```',
    '',
  ].join('\n');

  fs.writeFileSync(pendingUpdatesPath, cleanTemplate, 'utf8');
}

/**
 * Copia um arquivo texto UTF-8 para a área de transferência do sistema operacional
 */
function copyFileToClipboard(filePath) {
  try {
    if (process.platform === 'win32') {
      const psCmd = `Set-Clipboard -Value (Get-Content -LiteralPath '${filePath.replace(/'/g, "''")}' -Raw -Encoding UTF8)`;
      const res = spawnSync('powershell', ['-NoProfile', '-Command', psCmd], { stdio: 'ignore' });
      return res.status === 0;
    } else if (process.platform === 'darwin') {
      const content = fs.readFileSync(filePath, 'utf8');
      const res = spawnSync('pbcopy', [], { input: content, encoding: 'utf8' });
      return res.status === 0;
    } else {
      const content = fs.readFileSync(filePath, 'utf8');
      const res = spawnSync('xclip', ['-selection', 'clipboard'], { input: content, encoding: 'utf8' });
      return res.status === 0;
    }
  } catch {
    return false;
  }
}

const parsedDoc = parsePendingUpdatesMarkdown();
const newVersionRaw = positionalArgs[0] || parsedDoc.suggestedVersion;
const changelogArg = positionalArgs[1];

if (!newVersionRaw) {
  console.log('\n❌ Por favor, informe o número da nova versão ou defina a Versão Sugerida em docs/ATUALIZACOES_PENDENTES.md.');
  console.log('Exemplo de uso:');
  console.log('  npm run release 1.3.0-beta.2 " Descrição 1; Descrição 2"\n');
  process.exit(1);
}

const cleanVersion = newVersionRaw.replace(/^v/i, '').trim();

// 1. Atualiza package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = cleanVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✔ [package.json] Versão sincronizada: ${oldVersion} ➔ ${cleanVersion}`);

// 2. Atualiza app.json (incrementa versionCode apenas se a versão mudou ou se --force-bump foi passado)
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
let currentVersionCode = 1;
if (appJson.expo) {
  const prevExpoVersion = appJson.expo.version;
  appJson.expo.version = cleanVersion;
  if (appJson.expo.android) {
    const oldCode = appJson.expo.android.versionCode || 1;
    if (prevExpoVersion !== cleanVersion || flags.has('--force-bump')) {
      appJson.expo.android.versionCode = oldCode + 1;
      console.log(`✔ [app.json] Android versionCode incrementado: ${oldCode} ➔ ${appJson.expo.android.versionCode}`);
    } else {
      console.log(`✔ [app.json] Android versionCode mantido (${oldCode}) pois a versão já era ${cleanVersion}`);
    }
    currentVersionCode = appJson.expo.android.versionCode;
  }
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log(`✔ [app.json] Versão atualizada no Expo: ${cleanVersion}`);

// 3. Atualiza version.json
let versionManifest = {};
if (fs.existsSync(versionJsonPath)) {
  try {
    versionManifest = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  } catch {}
}

const now = new Date();
const formattedDate = now.toISOString().split('T')[0];
const formattedTimestamp = `${formattedDate} ${now.toTimeString().slice(0, 5)}`;

const changelogList = changelogArg
  ? changelogArg.split(';').map((s) => s.trim()).filter(Boolean)
  : parsedDoc.topBullets.length > 0
    ? parsedDoc.topBullets
    : Array.isArray(versionManifest.changelog) && versionManifest.version === cleanVersion
      ? versionManifest.changelog
      : [
          `Atualização ${cleanVersion} com melhorias no grimório e no compêndio.`,
          'Correções gerais de estabilidade e regras.',
        ];

versionManifest.version = cleanVersion;
versionManifest.releaseName = `Ordo Companion v${cleanVersion}`;
versionManifest.releaseDate = formattedDate;
versionManifest.downloadUrl = `https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v${cleanVersion}`;
versionManifest.apkUrl = `https://github.com/Lecrepus17/OrdoCompanion/releases/download/v${cleanVersion}/OrdoCompanion.apk`;
versionManifest.changelog = changelogList;
versionManifest.forceUpdate = false;

fs.writeFileSync(versionJsonPath, JSON.stringify(versionManifest, null, 2) + '\n', 'utf8');
console.log(`✔ [version.json] Manifesto remoto sincronizado para v${cleanVersion}`);

// 4. Gera docs/RELEASE_NOTES.md, arquiva em docs/HISTORICO_RELEASES.md e limpa docs/ATUALIZACOES_PENDENTES.md
const alreadyHasReleaseNotesForThisVersion =
  fs.existsSync(releaseNotesPath) &&
  fs.readFileSync(releaseNotesPath, 'utf8').includes(`# 🩸 Ordo Companion v${cleanVersion}`);

if (!parsedDoc.isEmptyCycle || !alreadyHasReleaseNotesForThisVersion) {
  const releaseNotesContent = buildGitHubReleaseNotes(cleanVersion, parsedDoc.summaryMarkdown, changelogList);
  fs.writeFileSync(releaseNotesPath, releaseNotesContent, 'utf8');
  console.log(`✔ [docs/RELEASE_NOTES.md] Notas exclusivas da v${cleanVersion} geradas para o GitHub`);
} else {
  console.log(`✔ [docs/RELEASE_NOTES.md] Notas da v${cleanVersion} preservadas`);
}

if (!parsedDoc.isEmptyCycle && !flags.has('--no-reset')) {
  archiveReleaseToHistory(cleanVersion, formattedDate, parsedDoc.summaryMarkdown, parsedDoc.technicalMarkdown);
  console.log(`✔ [docs/HISTORICO_RELEASES.md] Notas da v${cleanVersion} arquivadas no histórico permanente`);

  resetPendingUpdatesForNextCycle(cleanVersion, currentVersionCode, formattedTimestamp);
  console.log(`✔ [docs/ATUALIZACOES_PENDENTES.md] Fila limpa e zerada para acumular apenas a próxima versão (${suggestNextVersion(cleanVersion)})!`);
}

const copied = copyFileToClipboard(releaseNotesPath);
if (copied) {
  console.log(`✔ [Clipboard] Texto da release copiado automaticamente para a área de transferência (basta dar Ctrl+V no GitHub)!`);
}

const githubNewReleaseUrl = `https://github.com/Lecrepus17/OrdoCompanion/releases/new?tag=v${cleanVersion}&title=${encodeURIComponent(`Ordo Companion v${cleanVersion}`)}`;

if (flags.has('--open') && process.platform === 'win32') {
  spawnSync('cmd', ['/c', 'start', '', githubNewReleaseUrl], { stdio: 'ignore' });
  console.log(`✔ [Browser] Página de criação de Release aberta no navegador!`);
}

if (flags.has('--publish')) {
  const ghRes = spawnSync(
    'gh',
    ['release', 'create', `v${cleanVersion}`, '--title', `Ordo Companion v${cleanVersion}`, '--notes-file', releaseNotesPath],
    { stdio: 'inherit' }
  );
  if (ghRes.status === 0) {
    console.log(`✔ [GitHub CLI] Release v${cleanVersion} publicada automaticamente no GitHub!`);
  } else {
    console.log(`⚠️ [GitHub CLI] Não foi possível publicar via 'gh'. Utilize o link abaixo e cole (Ctrl+V) as notas.`);
  }
}

console.log('\n======================================================');
console.log(`🚀 RELEASE v${cleanVersion} PREPARADA COM ISOLAMENTO DE CICLO!`);
console.log('======================================================\n');
console.log('📋 Próximos passos para publicar no GitHub Releases:\n');
console.log('1. Gere o arquivo .apk pelo EAS Build:');
console.log('   eas build -p android --profile production\n');
console.log('2. Faça o commit e envie a tag para o GitHub:');
console.log(`   git add package.json app.json version.json docs/RELEASE_NOTES.md docs/HISTORICO_RELEASES.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md`);
console.log(`   git commit -m "chore(release): prepara versao v${cleanVersion} (versionCode ${currentVersionCode})"`);
console.log(`   git tag -f v${cleanVersion}`);
console.log(`   git push origin main --tags\n`);
console.log('3. Crie a Release no GitHub e cole (Ctrl+V) a descrição (já está no seu Clipboard e em docs/RELEASE_NOTES.md):');
console.log(`   👉 ${githubNewReleaseUrl}\n`);
console.log('   (Dica: renomeie o arquivo baixado para "OrdoCompanion.apk" ao anexar na release).\n');
