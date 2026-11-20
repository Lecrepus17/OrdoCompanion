import './setup';
import fs from 'node:fs';
import path from 'node:path';
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleDriveService } from '../src/services/sync/GoogleDriveService';
import { resetMockStorage, setMobilePlatform } from './setup';

describe('Serviço de Sincronização Google Drive (GoogleDriveService.ts)', () => {
  test('deve manter uma instância singleton única', () => {
    const s1 = GoogleDriveService.getInstance();
    const s2 = GoogleDriveService.getInstance();
    assert.equal(s1, s2);
  });

  test('getClientId deve retornar o Client ID padrão quando configurado', () => {
    const service = GoogleDriveService.getInstance();
    const cid = service.getClientId();
    assert.ok(cid.endsWith('.apps.googleusercontent.com'));
    assert.ok(service.isConfigured());
  });

  test('getRedirectUri deve gerar uma URI válida para Web ou Mobile', () => {
    const service = GoogleDriveService.getInstance();
    const uri = service.getRedirectUri();
    assert.ok(typeof uri === 'string');
    assert.ok(uri.includes('localhost') || uri.includes('ordo'));
  });

  test('setCustomClientId deve rejeitar URLs e aceitar apenas Client IDs válidos do Google', async () => {
    const service = GoogleDriveService.getInstance();

    // Rejeita links e URLs
    const urlRes = await service.setCustomClientId('https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(urlRes.valid, false);

    // Rejeita formato aleatório sem terminação .apps.googleusercontent.com
    const badRes = await service.setCustomClientId('meu-client-invalido-123');
    assert.equal(badRes.valid, false);

    // Aceita formato válido
    const goodRes = await service.setCustomClientId('123456789-abcdef.apps.googleusercontent.com');
    assert.equal(goodRes.valid, true);
    assert.equal(service.getClientId(), '123456789-abcdef.apps.googleusercontent.com');
    assert.equal(service.hasCustomClientId(), true);

    // Limpa para restaurar o padrão
    await service.setCustomClientId('');
    assert.ok(service.getClientId().includes('556485656355-'));
    assert.equal(service.hasCustomClientId(), false);
  });

  test('getClientSecret deve retornar string segura dependendo do ambiente', () => {
    const service = GoogleDriveService.getInstance();
    const secret = service.getClientSecret();
    assert.equal(typeof secret, 'string');
  });

  test('ensureValidToken deve lançar erro se o usuário não estiver autenticado', async () => {
    const service = GoogleDriveService.getInstance();
    await service.signOut();

    await assert.rejects(async () => {
      await service.ensureValidToken();
    }, /Google Drive não está autenticado/);
  });

  test('getReverseClientIdScheme deve converter o Client ID para o esquema reverso oficial do Google', () => {
    const service = GoogleDriveService.getInstance();
    assert.equal(
      service.getReverseClientIdScheme('556485656355-grsjjk5ol3keimcnn905f5vrd7lk0jos.apps.googleusercontent.com'),
      'com.googleusercontent.apps.556485656355-grsjjk5ol3keimcnn905f5vrd7lk0jos'
    );
    assert.equal(service.getReverseClientIdScheme('invalido'), 'com.ordemparanormal.ordo');
  });

  test('setRedirectMode deve alternar entre custom_scheme e reverse_client_id no mobile e refletir em getRedirectUri', async () => {
    resetMockStorage();
    const service = GoogleDriveService.getInstance();
    await service.setRedirectMode('custom_scheme');

    setMobilePlatform('android');
    try {
      assert.equal(service.getRedirectMode(), 'custom_scheme');
      const customUri = service.getRedirectUri();
      assert.ok(typeof customUri === 'string' && customUri.length > 0);

      await service.setRedirectMode('reverse_client_id');
      assert.equal(service.getRedirectMode(), 'reverse_client_id');
      const reverseUri = service.getRedirectUri();
      assert.equal(
        reverseUri,
        'com.googleusercontent.apps.556485656355-grsjjk5ol3keimcnn905f5vrd7lk0jos:/oauthredirect'
      );

      // Verifica persistência via initialize()
      await service.initialize();
      assert.equal(service.getRedirectMode(), 'reverse_client_id');

      // Restaura modo padrão
      await service.setRedirectMode('custom_scheme');
      assert.equal(service.getRedirectMode(), 'custom_scheme');
    } finally {
      setMobilePlatform('web');
    }
  });

  test('formatGoogleOAuthError deve traduzir access_denied, redirect_uri_mismatch, disallowed_useragent e org_internal', () => {
    const accessDenied = GoogleDriveService.formatGoogleOAuthError('access_denied');
    assert.match(accessDenied, /403/);
    assert.match(accessDenied, /testadores|Teste/i);

    const redirectMismatch = GoogleDriveService.formatGoogleOAuthError('redirect_uri_mismatch');
    assert.match(redirectMismatch, /400/);
    assert.match(redirectMismatch, /Scheme Reverso/i);

    const invalidReq = GoogleDriveService.formatGoogleOAuthError('invalid_request: Custom scheme URIs are not allowed');
    assert.match(invalidReq, /400/);
    assert.match(invalidReq, /Scheme Reverso/i);

    const userAgent = GoogleDriveService.formatGoogleOAuthError('Error 403: disallowed_useragent');
    assert.match(userAgent, /Chrome/i);

    const orgInternal = GoogleDriveService.formatGoogleOAuthError('org_internal');
    assert.match(orgInternal, /@gmail\.com/i);

    const fallback = GoogleDriveService.formatGoogleOAuthError('unknown_error');
    assert.equal(fallback, 'Google OAuth: unknown_error');
  });

  test('getOAuthDiagnostics deve expor informações completas de diagnóstico', async () => {
    const service = GoogleDriveService.getInstance();
    await service.setRedirectMode('custom_scheme');
    const diag = service.getOAuthDiagnostics();

    assert.equal(typeof diag.platform, 'string');
    assert.ok(diag.clientId.endsWith('.apps.googleusercontent.com'));
    assert.ok(diag.reverseScheme.startsWith('com.googleusercontent.apps.'));
    assert.equal(diag.redirectMode, 'custom_scheme');
    assert.equal(diag.isConfigured, true);
  });

  test('páginas estáticas /oauthredirect e Service Worker devem suportar callback OAuth Web sem 404', () => {
    const rootDir = process.cwd();
    const flatHtmlPath = path.join(rootDir, 'public', 'oauthredirect.html');
    const dirHtmlPath = path.join(rootDir, 'public', 'oauthredirect', 'index.html');
    const swPath = path.join(rootDir, 'public', 'sw.js');

    assert.ok(fs.existsSync(flatHtmlPath), 'public/oauthredirect.html deve existir');
    assert.ok(fs.existsSync(dirHtmlPath), 'public/oauthredirect/index.html deve existir');

    const flatContent = fs.readFileSync(flatHtmlPath, 'utf8');
    const dirContent = fs.readFileSync(dirHtmlPath, 'utf8');
    assert.equal(flatContent, dirContent);
    assert.ok(flatContent.includes('ExpoWebBrowserRedirectHandle'));
    assert.ok(flatContent.includes('ExpoWebBrowser_OriginUrl_'));
    assert.ok(flatContent.includes('postMessage'));
    assert.ok(flatContent.includes('expoSender'));

    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes('/oauthredirect'));
    assert.ok(swContent.includes('/oauthredirect.html'));
  });
});
