#!/usr/bin/env node

/**
 * Script de Automação de Build EAS e Upload Direto para o GitHub Release.
 * 
 * Etapas:
 * 1. Dispara `eas build -p android --profile production --no-wait --non-interactive --json`
 * 2. Monitora o status da build no EAS até conclusão (FINISHED).
 * 3. Faz o download do arquivo .apk gerado.
 * 4. Faz o upload do binário OrdoCompanion.apk na Release correspondente no GitHub.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const versionJsonPath = path.join(rootDir, 'version.json');

const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
const versionTag = `v${versionData.version}`;

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const res = spawnSync('git', ['credential', 'fill'], {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
    });
    if (res.status === 0 && res.stdout) {
      const match = res.stdout.match(/^password=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch {}
  return null;
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    function get(u) {
      const client = u.startsWith('https') ? https : http;
      client.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Falha no download: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }
    get(url);
  });
}

async function getReleaseData(token, tag) {
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/Lecrepus17/OrdoCompanion/releases/tags/${tag}`,
    headers: {
      'User-Agent': 'OrdoCompanion-Release-Builder',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  });

  if (res.statusCode !== 200) {
    throw new Error(`Release ${tag} não encontrada no GitHub (HTTP ${res.statusCode}): ${res.body}`);
  }

  return JSON.parse(res.body);
}

async function deleteExistingAsset(token, assetId) {
  await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/Lecrepus17/OrdoCompanion/releases/assets/${assetId}`,
    method: 'DELETE',
    headers: {
      'User-Agent': 'OrdoCompanion-Release-Builder',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  });
}

function uploadReleaseAsset(token, uploadUrlTemplate, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const uploadUrl = uploadUrlTemplate.replace(/\{(\?.*)?\}$/, '') + `?name=${encodeURIComponent(fileName)}`;
    const urlObj = new URL(uploadUrl);
    const stats = fs.statSync(filePath);

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'User-Agent': 'OrdoCompanion-Release-Builder',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stats.size,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Falha no upload do asset: HTTP ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(req);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO BUILD E UPLOAD DO APK (${versionTag})`);
  console.log(`======================================================\n`);

  const token = getGitHubToken();
  if (!token) {
    console.error('❌ Token do GitHub não encontrado via git credential fill.');
    process.exit(1);
  }

  console.log(`✔ [GitHub] Autenticado com sucesso. Localizando release ${versionTag}...`);
  const release = await getReleaseData(token, versionTag);
  console.log(`✔ [GitHub] Release identificada (ID: ${release.id})`);

  console.log(`\n⏳ [EAS] Disparando compilação do APK de produção no Expo Cloud...`);
  const startBuildRes = spawnSync('npx', ['eas', 'build', '-p', 'android', '--profile', 'production', '--no-wait', '--non-interactive', '--json'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: true,
  });

  if (startBuildRes.status !== 0) {
    console.error('❌ Falha ao disparar eas build:', startBuildRes.stderr || startBuildRes.stdout);
    process.exit(1);
  }

  let buildInfo;
  try {
    const rawOut = startBuildRes.stdout.trim();
    const jsonStart = rawOut.indexOf('[');
    if (jsonStart !== -1) {
      buildInfo = JSON.parse(rawOut.slice(jsonStart))[0];
    } else {
      buildInfo = JSON.parse(rawOut);
    }
  } catch (err) {
    console.error('❌ Falha ao analisar saída JSON do EAS:', startBuildRes.stdout);
    process.exit(1);
  }

  const buildId = buildInfo.id;
  console.log(`✔ [EAS] Build enfileirada com sucesso!`);
  console.log(`   👉 ID da Build: ${buildId}`);
  if (buildInfo.url) {
    console.log(`   👉 Painel Expo: ${buildInfo.url}`);
  }

  console.log(`\n⏳ [EAS] Monitorando o progresso da build no Expo Cloud...`);
  let finishedBuild = null;
  const startTime = Date.now();

  while (!finishedBuild) {
    await sleep(25000);
    const viewRes = spawnSync('npx', ['eas', 'build:view', buildId, '--json'], {
      cwd: rootDir,
      encoding: 'utf8',
      shell: true,
    });

    if (viewRes.status === 0 && viewRes.stdout) {
      try {
        const rawView = viewRes.stdout.trim();
        const jsonStart = rawView.indexOf('{');
        if (jsonStart !== -1) {
          const statusObj = JSON.parse(rawView.slice(jsonStart));
          const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
          console.log(`   [${new Date().toLocaleTimeString()}] Status: ${statusObj.status} (decorrido: ${elapsedMin} min)`);

          if (statusObj.status === 'FINISHED') {
            finishedBuild = statusObj;
            break;
          } else if (statusObj.status === 'ERRORED' || statusObj.status === 'CANCELED') {
            console.error(`❌ [EAS] A build falhou com status: ${statusObj.status}`);
            process.exit(1);
          }
        }
      } catch (e) {
        // Ignora erros temporários de parse
      }
    }
  }

  const apkUrl = finishedBuild.artifacts && (finishedBuild.artifacts.buildUrl || finishedBuild.artifacts.applicationArchiveUrl);
  if (!apkUrl) {
    console.error('❌ [EAS] Build concluída mas URL do APK não foi encontrada nos artefatos.');
    process.exit(1);
  }

  console.log(`\n✔ [EAS] APK compilado com sucesso!`);
  console.log(`   👉 Download URL: ${apkUrl}`);

  const localApkPath = path.join(rootDir, 'OrdoCompanion.apk');
  console.log(`\n⏳ [Download] Baixando OrdoCompanion.apk...`);
  await downloadFile(apkUrl, localApkPath);
  const fileSizeMb = (fs.statSync(localApkPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✔ [Download] Arquivo baixado com sucesso: ${fileSizeMb} MB`);

  // Verifica se já existe um asset com esse nome na release
  if (Array.isArray(release.assets)) {
    for (const asset of release.assets) {
      if (asset.name === 'OrdoCompanion.apk') {
        console.log(`⏳ [GitHub] Removendo asset anterior (ID ${asset.id})...`);
        await deleteExistingAsset(token, asset.id);
        console.log(`✔ [GitHub] Asset anterior removido.`);
      }
    }
  }

  console.log(`\n⏳ [GitHub] Fazendo upload do OrdoCompanion.apk para a release ${versionTag}...`);
  const uploaded = await uploadReleaseAsset(token, release.upload_url, localApkPath, 'OrdoCompanion.apk');
  console.log(`✔ [GitHub] Upload concluído com sucesso!`);
  console.log(`   👉 Asset: ${uploaded.name} (${(uploaded.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`   👉 Download direto: ${uploaded.browser_download_url}`);

  console.log(`\n======================================================`);
  console.log(`🎉 RELEASE v${versionData.version} COM APK OFICIAL PUBLICADA COM SUCESSO!`);
  console.log(`👉 https://github.com/Lecrepus17/OrdoCompanion/releases/tag/${versionTag}`);
  console.log(`======================================================\n`);
})();
