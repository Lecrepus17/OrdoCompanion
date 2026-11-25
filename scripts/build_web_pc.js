#!/usr/bin/env node

/**
 * Script de Build & Validação do Bundle Web / Desktop PWA (`npm run build:pc` / `build:web`).
 *
 * Responsabilidades:
 * 1. Executa `npx expo export -p web` gerando a saída estática (padrão: `dist/`).
 * 2. Remove `dist/pdfs/` automaticamente (evita subir ~764 MB de PDFs locais protegidos para
 *    Vercel/Netlify/GitHub Pages/Cloudflare e respeita os Termos de Serviço).
 * 3. Valida a presença dos artefatos obrigatórios de PWA e callback OAuth estático em `dist/`.
 * 4. Alerta quando variáveis `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPPORT_PROXY_URL`
 *    não estiverem presentes no ambiente local ou `.env`.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

/**
 * Remove `dist/pdfs/` do bundle de publicação, salvo quando `includeLocalPdfs: true`.
 */
function sanitizeDistForHosting(distDir, options = {}) {
  const pdfsDir = path.join(distDir, 'pdfs');
  if (options.includeLocalPdfs) {
    return { removedPdfsDir: false, pdfsDir };
  }

  if (fs.existsSync(pdfsDir)) {
    fs.rmSync(pdfsDir, { recursive: true, force: true });
    return { removedPdfsDir: true, pdfsDir };
  }

  return { removedPdfsDir: false, pdfsDir };
}

/**
 * Verifica se o diretório `dist/` contém todos os artefatos obrigatórios do Web App,
 * Desktop PWA offline e callback Google OAuth estático.
 */
function verifyWebDistArtifacts(distDir) {
  const requiredFiles = [
    'index.html',
    'manifest.json',
    'sw.js',
    'favicon.png',
    'icon-512.png',
    'icon.png',
    'oauthredirect.html',
    path.join('oauthredirect', 'index.html'),
  ];

  const missing = [];
  const invalid = [];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(distDir, relPath);
    if (!fs.existsSync(fullPath)) {
      missing.push(relPath.replace(/\\/g, '/'));
    }
  }

  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    if (!html.includes('/manifest.json')) {
      invalid.push('index.html não referencia /manifest.json');
    }
    if (!html.includes('beforeinstallprompt')) {
      invalid.push('index.html não contém listener beforeinstallprompt');
    }
    if (!html.includes('/sw.js')) {
      invalid.push('index.html não registra /sw.js');
    }
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

/**
 * Resolve o diretório de saída a partir dos argumentos CLI (`--output-dir`).
 */
function resolveOutputDir(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output-dir' && args[i + 1]) {
      return path.resolve(rootDir, args[i + 1]);
    }
    if (arg.startsWith('--output-dir=')) {
      return path.resolve(rootDir, arg.slice('--output-dir='.length));
    }
  }
  return path.join(rootDir, 'dist');
}

/**
 * Lê variáveis definidas no arquivo `.env` local (se existir) para checagem informativa.
 */
function readEnvKeysFromDotEnv(envPath) {
  const keys = new Set();
  if (!fs.existsSync(envPath)) return keys;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (v) keys.add(k);
    }
  }
  return keys;
}

/**
 * Carrega variáveis `EXPO_PUBLIC_*` de fallback definidas em `eas.json` (`build.production.env`)
 * para garantir que o bundle Web publicado em produção tenha paridade de serviços (Supabase VTT,
 * Support Proxy, OAuth Web) mesmo quando `.env` local estiver incompleto.
 */
function buildExportEnv() {
  const mergedEnv = { ...process.env };
  const dotEnvKeys = readEnvKeysFromDotEnv(path.join(rootDir, '.env'));
  const easPath = path.join(rootDir, 'eas.json');

  if (fs.existsSync(easPath)) {
    try {
      const easJson = JSON.parse(fs.readFileSync(easPath, 'utf8'));
      const prodEnv = easJson?.build?.production?.env || {};
      for (const [key, value] of Object.entries(prodEnv)) {
        if (
          key.startsWith('EXPO_PUBLIC_') &&
          typeof value === 'string' &&
          value.trim() &&
          !mergedEnv[key] &&
          !dotEnvKeys.has(key)
        ) {
          mergedEnv[key] = value;
        }
      }
    } catch {}
  }

  const requiredPublicVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPPORT_PROXY_URL',
  ];

  const missing = requiredPublicVars.filter(
    (key) => !mergedEnv[key] && !dotEnvKeys.has(key)
  );

  if (missing.length > 0) {
    console.warn(
      `\n⚠️ [Web/PC Build] Variável(is) pública(s) ausente(s) no ambiente/.env/eas.json: ${missing.join(', ')}.\n` +
        '   Configure-as no provedor de hospedagem caso faça deploy em nuvem.'
    );
  }

  return mergedEnv;
}

function runCli() {
  const rawArgs = process.argv.slice(2);
  const includeLocalPdfs = rawArgs.includes('--include-local-pdfs');
  const shouldDeploy = rawArgs.includes('--deploy');
  const exportArgs = rawArgs.filter((a) => a !== '--include-local-pdfs' && a !== '--deploy');
  const distDir = resolveOutputDir(exportArgs);

  const exportEnv = buildExportEnv();

  console.log('\n⏳ [Web/PC Build] Exportando bundle estático Expo Web...');
  let exportRes;
  try {
    const expoCliPath = require.resolve('expo/bin/cli');
    exportRes = spawnSync(
      process.execPath,
      [expoCliPath, 'export', '-p', 'web', ...exportArgs],
      {
        cwd: rootDir,
        env: exportEnv,
        stdio: 'inherit',
      }
    );
  } catch {
    exportRes = spawnSync('npx', ['expo', 'export', '-p', 'web', ...exportArgs], {
      cwd: rootDir,
      env: exportEnv,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }

  if (exportRes.status !== 0) {
    console.error('❌ [Web/PC Build] Falha ao executar `npx expo export -p web`.');
    process.exit(exportRes.status || 1);
  }

  const sanitizeResult = sanitizeDistForHosting(distDir, { includeLocalPdfs });
  if (sanitizeResult.removedPdfsDir) {
    console.log(
      '✔ [Web/PC Build] Pasta dist/pdfs/ removida do bundle de publicação (PDFs locais protegidos não são hospedados).'
    );
  }

  const verification = verifyWebDistArtifacts(distDir);
  if (!verification.ok) {
    if (verification.missing.length > 0) {
      console.error(`❌ [Web/PC Build] Artefatos obrigatórios ausentes em dist/: ${verification.missing.join(', ')}`);
    }
    if (verification.invalid.length > 0) {
      console.error(`❌ [Web/PC Build] Falhas de integridade em dist/: ${verification.invalid.join('; ')}`);
    }
    process.exit(1);
  }

  console.log('✔ [Web/PC Build] Todos os artefatos PWA Desktop e /oauthredirect validados com sucesso!');

  if (shouldDeploy) {
    console.log('\n⏳ [EAS Hosting] Publicando bundle Web em produção (https://ordo-companion.expo.app/)...');
    const deployRes = spawnSync('npx', ['eas', 'deploy', '--prod', '--non-interactive'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (deployRes.status !== 0) {
      console.error('❌ [EAS Hosting] Falha ao publicar no EAS Hosting (`npx eas deploy --prod`).');
      process.exit(deployRes.status || 1);
    }
    console.log('✔ [EAS Hosting] Versão Web publicada com sucesso em https://ordo-companion.expo.app/!');
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  sanitizeDistForHosting,
  verifyWebDistArtifacts,
};
