import './setup';
import React from 'react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, renderWithProviders, fireClick } from './frontendTestUtils';
import { setMobilePlatform } from './setup';
import {
  isDesktopWebEnvironment,
  isRunningAsStandalonePwa,
  canTriggerNativePwaInstall,
  triggerPwaInstallPrompt,
  downloadTextFileOnWeb,
  pickJsonFileOnWeb,
} from '../src/utils/desktopPwa';
import { UpdateCheckerService } from '../src/services/updates/UpdateCheckerService';
import { UpdateNotificationModal } from '../src/components/UpdateNotificationModal';
import { UserProfileModal } from '../src/components/UserProfileModal';

describe('Desktop PC & PWA Support (SOL-MEL-001)', () => {
  const rootDir = process.cwd();
  const originalMatchMedia = (globalThis.window as any)?.matchMedia;
  const originalCreateObjectURL = globalThis.URL?.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL?.revokeObjectURL;
  const originalCaches = (globalThis as any).caches;
  const originalServiceWorker = (globalThis.navigator as any)?.serviceWorker;

  beforeEach(async () => {
    await cleanup();
    setMobilePlatform('web');
    if (typeof globalThis.window !== 'undefined') {
      (globalThis.window as any).__ordoDeferredPwaPrompt = null;
    }
  });

  afterEach(async () => {
    await cleanup();
    setMobilePlatform('web');
    if (typeof globalThis.window !== 'undefined') {
      (globalThis.window as any).__ordoDeferredPwaPrompt = null;
      (globalThis.window as any).matchMedia = originalMatchMedia;
    }
    if (globalThis.URL) {
      globalThis.URL.createObjectURL = originalCreateObjectURL;
      globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    }
    (globalThis as any).caches = originalCaches;
    if (typeof globalThis.navigator !== 'undefined') {
      try {
        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
          value: originalServiceWorker,
          configurable: true,
        });
      } catch {}
    }
  });

  it('deve possuir public/index.html, public/manifest.json válido com dimensões exatas e Service Worker offline (public/sw.js)', () => {
    const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
    const manifestPath = path.join(rootDir, 'public', 'manifest.json');
    const swPath = path.join(rootDir, 'public', 'sw.js');
    const faviconPath = path.join(rootDir, 'public', 'favicon.png');
    const icon512Path = path.join(rootDir, 'public', 'icon-512.png');
    const iconPath = path.join(rootDir, 'public', 'icon.png');

    assert.ok(fs.existsSync(indexHtmlPath), 'public/index.html deve existir para o template single-page do Expo');
    assert.ok(fs.existsSync(manifestPath), 'public/manifest.json deve existir');
    assert.ok(fs.existsSync(swPath), 'public/sw.js deve existir');
    assert.ok(fs.existsSync(faviconPath), 'public/favicon.png deve existir');
    assert.ok(fs.existsSync(icon512Path), 'public/icon-512.png deve existir');
    assert.ok(fs.existsSync(iconPath), 'public/icon.png deve existir');

    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    assert.ok(indexHtml.includes('href="/manifest.json"'));
    assert.ok(indexHtml.includes('beforeinstallprompt'));
    assert.ok(indexHtml.includes("serviceWorker.register('/sw.js')"));
    assert.ok(indexHtml.includes('%WEB_TITLE%'));

    const readPngDims = (file: string) => {
      const buf = fs.readFileSync(file);
      return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
    };
    assert.equal(readPngDims(faviconPath), '192x192');
    assert.equal(readPngDims(icon512Path), '512x512');
    assert.equal(readPngDims(iconPath), '1024x1024');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.theme_color, '#0A0A0C');
    assert.equal(manifest.background_color, '#0A0A0C');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);
    assert.ok(manifest.icons.some((i: any) => i.src === '/favicon.png' && i.sizes === '192x192' && i.purpose === 'any'));
    assert.ok(manifest.icons.some((i: any) => i.src === '/icon-512.png' && i.sizes === '512x512' && i.purpose === 'any'));
    assert.ok(manifest.icons.some((i: any) => i.src === '/icon-512.png' && i.sizes === '512x512' && i.purpose === 'maskable'));
    assert.ok(manifest.icons.some((i: any) => i.src === '/icon.png' && i.sizes === '1024x1024'));

    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes('SKIP_WAITING'));
    assert.ok(swContent.includes('/manifest.json'));
    assert.ok(swContent.includes('/icon-512.png'));
    assert.ok(swContent.includes('/pdfs/'), 'SW deve ignorar PDFs gigantes armazenados no IndexedDB');
  });

  it('deve configurar tags PWA no src/app/+html.tsx e expo.web standalone no app.json sem afetar Android', () => {
    const htmlContent = fs.readFileSync(path.join(rootDir, 'src', 'app', '+html.tsx'), 'utf8');
    assert.ok(htmlContent.includes('href="/manifest.json"'));
    assert.ok(htmlContent.includes('href="/favicon.png"'));
    assert.ok(htmlContent.includes('beforeinstallprompt'));
    assert.ok(htmlContent.includes("serviceWorker.register('/sw.js')"));

    const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    assert.equal(appJson.expo.web.display, 'standalone');
    assert.equal(appJson.expo.web.themeColor, '#0A0A0C');
    assert.equal(appJson.expo.web.output, 'single');
    assert.equal(appJson.expo.android.package, 'com.ordemparanormal.ordo');

    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['build:web']);
    assert.ok(pkg.scripts['build:pc']);

    const releaseScript = fs.readFileSync(path.join(rootDir, 'scripts', 'create_release.js'), 'utf8');
    assert.ok(releaseScript.includes('Instalação e Uso no PC'));
  });

  it('deve blindar utilitários Desktop PWA no runtime mobile Android/Hermes', async () => {
    setMobilePlatform('android');

    assert.equal(isDesktopWebEnvironment(), false);
    assert.equal(isRunningAsStandalonePwa(), false);
    assert.equal(canTriggerNativePwaInstall(), false);
    assert.equal(downloadTextFileOnWeb('backup.json', '{}'), false);
    assert.equal(await pickJsonFileOnWeb(), null);

    const promptRes = await triggerPwaInstallPrompt();
    assert.equal(promptRes.outcome, 'manual_instructions');
  });

  it('deve disparar instalador PWA nativo e download de arquivo .json no PC/Web', async () => {
    setMobilePlatform('web');
    assert.equal(isDesktopWebEnvironment(), true);

    let prompted = false;
    (globalThis.window as any).__ordoDeferredPwaPrompt = {
      prompt: async () => {
        prompted = true;
      },
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    };

    assert.equal(canTriggerNativePwaInstall(), true);
    const installRes = await triggerPwaInstallPrompt();
    assert.equal(prompted, true);
    assert.equal(installRes.outcome, 'accepted');
    assert.equal(canTriggerNativePwaInstall(), false);

    // Simula modo já instalado em janela standalone
    (globalThis.window as any).matchMedia = (q: string) => ({
      matches: q.includes('standalone'),
      media: q,
      addListener: () => {},
      removeListener: () => {},
    });
    assert.equal(isRunningAsStandalonePwa(), true);
    const alreadyRes = await triggerPwaInstallPrompt();
    assert.equal(alreadyRes.outcome, 'already_installed');

    // Simula download de backup .json no PC
    let createdBlobUrl = '';
    globalThis.URL.createObjectURL = () => {
      createdBlobUrl = 'blob:http://localhost:8081/ordo-backup';
      return createdBlobUrl;
    };
    globalThis.URL.revokeObjectURL = () => {};

    const downloaded = downloadTextFileOnWeb('ordo_backup.json', '{"version":1}');
    assert.equal(downloaded, true);
    assert.ok(createdBlobUrl.startsWith('blob:'));
  });

  it('UpdateCheckerService.applyWebOrDesktopUpdate deve ativar Service Worker pendente e limpar cache PWA no Web', async () => {
    const checker = new UpdateCheckerService();
    let skipWaitingSent = false;
    let deletedCacheKey = '';

    setMobilePlatform('web');
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {
        getRegistration: async () => ({
          update: async () => {},
          waiting: {
            postMessage: (msg: any) => {
              if (msg?.type === 'SKIP_WAITING') skipWaitingSent = true;
            },
          },
        }),
      },
      configurable: true,
    });
    (globalThis as any).caches = {
      keys: async () => ['ordo-companion-pwa-v1', 'unrelated-cache'],
      delete: async (key: string) => {
        deletedCacheKey = key;
        return true;
      },
    };

    const result = await checker.applyWebOrDesktopUpdate('https://github.com/Lecrepus17/OrdoCompanion/releases/latest');
    assert.equal(typeof result, 'boolean');
    assert.equal(skipWaitingSent, true);
    assert.equal(deletedCacheKey, 'ordo-companion-pwa-v1');
  });

  it('UpdateNotificationModal deve ser suprimido na Web (Platform.OS === "web") e exibido normalmente no Android', async () => {
    const checker = new UpdateCheckerService();
    assert.equal(checker.shouldAutoPromptForUpdates('web'), false);
    assert.equal(checker.shouldAutoPromptForUpdates('android'), true);
    assert.equal(checker.shouldAutoPromptForUpdates('ios'), true);

    const mockInfo = {
      hasUpdate: true,
      currentVersion: '1.7.0-beta.1',
      latestVersion: '1.7.0-beta.2',
      releaseName: 'Ordo Companion v1.7.0-beta.2',
      changelog: ['Suporte oficial a aplicativo para PC (PWA)'],
      downloadUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/latest',
      apkUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/download/v1.7.0-beta.2/OrdoCompanion.apk',
      isMandatory: false,
      isDismissed: false,
    };

    const webRender = await renderWithProviders(
      React.createElement(UpdateNotificationModal, {
        visible: true,
        updateInfo: mockInfo,
        onDismiss: () => {},
      })
    );
    assert.equal(webRender.queryByText(/NOVA VERSÃO DISPONÍVEL/i), null);

    await cleanup();

    const androidRender = await renderWithProviders(
      React.createElement(UpdateNotificationModal, {
        visible: true,
        updateInfo: mockInfo,
        onDismiss: () => {},
      }),
      { mobile: 'android' }
    );
    assert.ok(androidRender.getByText(/NOVA VERSÃO DISPONÍVEL/i));
    assert.ok(androidRender.getByText(/Baixar Nova Versão \(APK\)/i));
  });

  it('UserProfileModal deve oferecer instalação PWA e backup .json no PC/Web, e card informativo no Android', async () => {
    const webIdentity = await renderWithProviders(
      React.createElement(UserProfileModal, {
        visible: true,
        onClose: () => {},
        initialTab: 'identidade',
      })
    );
    const installBtn = webIdentity.getByTestId('profile-install-pc-pwa-btn');
    assert.ok(installBtn);
    await fireClick(installBtn);

    await cleanup();

    const webCloud = await renderWithProviders(
      React.createElement(UserProfileModal, {
        visible: true,
        onClose: () => {},
        initialTab: 'nuvem',
      })
    );
    assert.ok(webCloud.getByTestId('backup-download-json-pc-btn'));
    assert.ok(webCloud.getByTestId('backup-upload-json-pc-btn'));

    await cleanup();

    const androidIdentity = await renderWithProviders(
      React.createElement(UserProfileModal, {
        visible: true,
        onClose: () => {},
        initialTab: 'identidade',
      }),
      { mobile: 'android' }
    );
    assert.equal(androidIdentity.queryByTestId('profile-install-pc-pwa-btn'), null);
    assert.ok(androidIdentity.getByTestId('profile-pc-pwa-info-card'));
  });

  it('deve registrar especialista web-desktop-guardian e UI/UX multiplataforma nas skills, GEMINI.md e SSOT', () => {
    const webSkillPath = path.join(rootDir, '.agents', 'skills', 'web-desktop-audit', 'SKILL.md');
    const uiSkillPath = path.join(rootDir, '.agents', 'skills', 'mobile-ui-audit', 'SKILL.md');
    const geminiPath = path.join(rootDir, 'GEMINI.md');
    const triagePath = path.join(rootDir, 'data', 'request_triage_questions.json');

    assert.ok(fs.existsSync(webSkillPath), 'Skill web-desktop-audit deve existir');
    assert.ok(fs.existsSync(uiSkillPath), 'Skill mobile-ui-audit deve existir');

    const webSkill = fs.readFileSync(webSkillPath, 'utf8');
    assert.ok(webSkill.includes('name: web-desktop-audit'));
    assert.ok(webSkill.includes('public/manifest.json'));
    assert.ok(webSkill.includes('public/sw.js'));
    assert.ok(webSkill.includes('build:pc'));

    const uiSkill = fs.readFileSync(uiSkillPath, 'utf8');
    assert.ok(uiSkill.includes('name: mobile-ui-audit'));
    assert.ok(uiSkill.includes('360px'));
    assert.ok(uiSkill.includes('1024px'));
    assert.ok(uiSkill.includes('Tema Claro'));

    const gemini = fs.readFileSync(geminiPath, 'utf8');
    assert.ok(gemini.includes('web-desktop-guardian'));
    assert.ok(gemini.includes('web-desktop-audit'));
    assert.ok(gemini.includes('mobile-ui-expert'));

    const triage = JSON.parse(fs.readFileSync(triagePath, 'utf8'));
    const specialistIds = triage.specialists.map((s: any) => s.id);
    assert.ok(specialistIds.includes('web-desktop-guardian'));
    assert.ok(specialistIds.includes('mobile-ui-expert'));
    const uiSpec = triage.specialists.find((s: any) => s.id === 'mobile-ui-expert');
    assert.ok(uiSpec.label.includes('PC'));
  });

  it('scripts/build_web_pc.js deve remover dist/pdfs/ e validar artefatos obrigatórios PWA/OAuth', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sanitizeDistForHosting, verifyWebDistArtifacts } = require('../scripts/build_web_pc.js');
    const tmpDist = fs.mkdtempSync(path.join(os.tmpdir(), 'ordo_dist_test_'));

    try {
      fs.mkdirSync(path.join(tmpDist, 'pdfs'), { recursive: true });
      fs.writeFileSync(path.join(tmpDist, 'pdfs', 'fake.pdf'), 'PDF');
      fs.mkdirSync(path.join(tmpDist, 'oauthredirect'), { recursive: true });

      fs.writeFileSync(
        path.join(tmpDist, 'index.html'),
        '<link rel="manifest" href="/manifest.json" /><script>beforeinstallprompt;serviceWorker.register("/sw.js")</script>'
      );
      fs.writeFileSync(path.join(tmpDist, 'manifest.json'), '{}');
      fs.writeFileSync(path.join(tmpDist, 'sw.js'), '');
      fs.writeFileSync(path.join(tmpDist, 'favicon.png'), '');
      fs.writeFileSync(path.join(tmpDist, 'icon-512.png'), '');
      fs.writeFileSync(path.join(tmpDist, 'icon.png'), '');
      fs.writeFileSync(path.join(tmpDist, 'oauthredirect.html'), '<html></html>');
      fs.writeFileSync(path.join(tmpDist, 'oauthredirect', 'index.html'), '<html></html>');

      const sanitized = sanitizeDistForHosting(tmpDist);
      assert.equal(sanitized.removedPdfsDir, true);
      assert.equal(fs.existsSync(path.join(tmpDist, 'pdfs')), false);

      const okRes = verifyWebDistArtifacts(tmpDist);
      assert.equal(okRes.ok, true);
      assert.deepEqual(okRes.missing, []);
      assert.deepEqual(okRes.invalid, []);

      fs.unlinkSync(path.join(tmpDist, 'oauthredirect.html'));
      fs.unlinkSync(path.join(tmpDist, 'manifest.json'));
      const failRes = verifyWebDistArtifacts(tmpDist);
      assert.equal(failRes.ok, false);
      assert.ok(failRes.missing.includes('oauthredirect.html'));
      assert.ok(failRes.missing.includes('manifest.json'));
    } finally {
      fs.rmSync(tmpDist, { recursive: true, force: true });
    }
  });
});
