import './setup';
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleDriveService } from '../src/services/sync/GoogleDriveService';

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

  test('ensureValidToken deve lançar erro se o usuário não estiver autenticado', async () => {
    const service = GoogleDriveService.getInstance();
    await service.signOut();

    await assert.rejects(async () => {
      await service.ensureValidToken();
    }, /Google Drive não está autenticado/);
  });
});
