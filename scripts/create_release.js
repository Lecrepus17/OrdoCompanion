#!/usr/bin/env node

/**
 * Script de Automação de Release para o GitHub Releases (APK Direto).
 *
 * Uso:
 *   npm run release <nova-versao> [descricao-ou-changelog]
 *
 * Exemplo:
 *   npm run release 1.1.0 "Adicionado compêndio Sobrevivendo ao Horror e novas criaturas"
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const appJsonPath = path.join(rootDir, 'app.json');
const versionJsonPath = path.join(rootDir, 'version.json');

const args = process.argv.slice(2);
const newVersionRaw = args[0];
const changelogArg = args[1];

if (!newVersionRaw) {
  console.log('\n❌ Por favor, informe o número da nova versão.');
  console.log('Exemplo de uso:');
  console.log('  npm run release 1.1.0 "Correção no rolador de dados e novas fichas"\n');
  process.exit(1);
}

const cleanVersion = newVersionRaw.replace(/^v/i, '').trim();

// 1. Atualiza package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = cleanVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✔ [package.json] Versão atualizada: ${oldVersion} ➔ ${cleanVersion}`);

// 2. Atualiza app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
if (appJson.expo) {
  appJson.expo.version = cleanVersion;
  if (appJson.expo.android) {
    const oldCode = appJson.expo.android.versionCode || 1;
    appJson.expo.android.versionCode = oldCode + 1;
    console.log(`✔ [app.json] Android versionCode incrementado: ${oldCode} ➔ ${appJson.expo.android.versionCode}`);
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

const changelogList = changelogArg
  ? changelogArg.split(';').map((s) => s.trim()).filter(Boolean)
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

console.log('\n======================================================');
console.log(`🚀 RELEASE v${cleanVersion} PREPARADA COM SUCESSO!`);
console.log('======================================================\n');
console.log('📋 Próximos passos para publicar no GitHub Releases:\n');
console.log('1. Gere o arquivo .apk pelo EAS Build:');
console.log('   eas build -p android --profile production\n');
console.log('2. Faça o commit e envie a tag para o GitHub:');
console.log(`   git add package.json app.json version.json`);
console.log(`   git commit -m "chore: release v${cleanVersion}"`);
console.log(`   git tag v${cleanVersion}`);
console.log(`   git push origin main --tags\n`);
console.log('3. Crie a Release no GitHub e anexe o arquivo .apk compilado:');
console.log(`   👉 https://github.com/Lecrepus17/OrdoCompanion/releases/new?tag=v${cleanVersion}&title=Ordo+Companion+v${cleanVersion}\n`);
console.log('   (Dica: renomeie o arquivo baixado para "OrdoCompanion.apk" ao anexar na release).\n');
console.log('Quando a release for publicada, os aplicativos antigos exibirão');
console.log('o aviso e baixarão a nova versão automaticamente!\n');
