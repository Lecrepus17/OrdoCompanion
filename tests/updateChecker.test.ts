import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareSemVer,
  normalizeChangelog,
  UpdateCheckerService,
  DISMISSED_UPDATE_VERSION_KEY,
  DISMISSED_UPDATE_TIME_KEY,
} from '../src/services/updates/UpdateCheckerService';
import { RemoteVersionManifest } from '../src/services/updates/types';

test('Sistema de Notificação e Verificação de Atualizações (UpdateCheckerService.ts)', async (t) => {
  await t.test('compareSemVer - Comparação Semântica de Versões', () => {
    // Versões idênticas
    assert.equal(compareSemVer('1.0.0', '1.0.0'), 0);
    assert.equal(compareSemVer('v1.0.0', '1.0.0'), 0);
    assert.equal(compareSemVer('1.2.3', 'v1.2.3'), 0);

    // Versão 1 maior que versão 2
    assert.equal(compareSemVer('1.0.1', '1.0.0'), 1);
    assert.equal(compareSemVer('1.1.0', '1.0.9'), 1);
    assert.equal(compareSemVer('2.0.0', '1.99.99'), 1);
    assert.equal(compareSemVer('v1.5.0', '1.4.9'), 1);
    assert.equal(compareSemVer('1.0.0-beta', '0.9.9'), 1);

    // Versão 1 menor que versão 2
    assert.equal(compareSemVer('1.0.0', '1.0.1'), -1);
    assert.equal(compareSemVer('1.0.0', '1.1.0'), -1);
    assert.equal(compareSemVer('1.9.9', '2.0.0'), -1);
    assert.equal(compareSemVer('0.5.0', 'v1.0.0'), -1);
  });

  await t.test('normalizeChangelog - Tratamento de Notas de Atualização', () => {
    // Array com marcadores comuns
    const arrayChangelog = [
      '• Novo compêndio de criaturas',
      '- Adicionado rolador de dados',
      '* Correção de fórmulas de PE',
      'Refatoração da interface',
    ];
    const normalizedArr = normalizeChangelog(arrayChangelog);
    assert.deepEqual(normalizedArr, [
      'Novo compêndio de criaturas',
      'Adicionado rolador de dados',
      'Correção de fórmulas de PE',
      'Refatoração da interface',
    ]);

    // String markdown com cabeçalhos e linhas em branco
    const markdownChangelog = `
# Novidades v1.1.0
## Principais Ajustes
- Suporte ao suplemento Sobrevivendo ao Horror
* Melhoria na impressão de PDF
• Adicionada exportação em nuvem
    `;
    const normalizedMd = normalizeChangelog(markdownChangelog);
    assert.deepEqual(normalizedMd, [
      'Suporte ao suplemento Sobrevivendo ao Horror',
      'Melhoria na impressão de PDF',
      'Adicionada exportação em nuvem',
    ]);

    // Casos vazios ou nulos
    assert.deepEqual(normalizeChangelog(undefined), []);
    assert.deepEqual(normalizeChangelog(''), []);
    assert.deepEqual(normalizeChangelog([]), []);
  });

  await t.test('Lógica de Detecção de Atualização Opcional e Obrigatória', async () => {
    const service = new UpdateCheckerService('mock-url', 'mock-gh-url');

    // Mock do método de obtenção da versão atual
    service.getCurrentVersion = () => '1.0.0';

    // Mock do manifesto simulando uma versão mais nova opcional
    const mockManifestNormal: RemoteVersionManifest = {
      version: '1.1.0',
      minVersion: '1.0.0',
      releaseName: 'Atualização Paranormal 1.1.0',
      downloadUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v1.1.0',
      apkUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/download/v1.1.0/OrdoCompanion.apk',
      changelog: ['Novas criaturas', 'Correção de cálculo de PV'],
      forceUpdate: false,
    };

    service.fetchRemoteManifest = async () => mockManifestNormal;

    const result = await service.checkForAppUpdate();
    assert.ok(result);
    assert.equal(result.hasUpdate, true);
    assert.equal(result.currentVersion, '1.0.0');
    assert.equal(result.latestVersion, '1.1.0');
    assert.equal(result.isMandatory, false);
    assert.equal(result.isDismissed, false);
    assert.equal(result.apkUrl, 'https://github.com/Lecrepus17/OrdoCompanion/releases/download/v1.1.0/OrdoCompanion.apk');

    // Simular manifesto com atualização obrigatória (minVersion > currentVersion)
    const mockManifestMandatory: RemoteVersionManifest = {
      ...mockManifestNormal,
      version: '2.0.0',
      minVersion: '2.0.0',
      forceUpdate: false,
    };
    service.fetchRemoteManifest = async () => mockManifestMandatory;

    const resultMandatory = await service.checkForAppUpdate();
    assert.ok(resultMandatory);
    assert.equal(resultMandatory.hasUpdate, true);
    assert.equal(resultMandatory.isMandatory, true);

    // Simular manifesto com forceUpdate explicitamente ativado
    const mockManifestForce: RemoteVersionManifest = {
      ...mockManifestNormal,
      forceUpdate: true,
    };
    service.fetchRemoteManifest = async () => mockManifestForce;

    const resultForce = await service.checkForAppUpdate();
    assert.ok(resultForce);
    assert.equal(resultForce.isMandatory, true);

    // Simular quando app já está na versão mais recente
    service.getCurrentVersion = () => '1.1.0';
    service.fetchRemoteManifest = async () => mockManifestNormal;

    const resultUpToDate = await service.checkForAppUpdate();
    assert.ok(resultUpToDate);
    assert.equal(resultUpToDate.hasUpdate, false);
  });

  await t.test('Dispensa de Versão (Lembrar mais tarde)', async () => {
    const service = new UpdateCheckerService('mock-url', 'mock-gh-url');
    service.getCurrentVersion = () => '1.0.0';

    await service.clearDismissedUpdate();

    // Inicialmente não está dispensado
    let isDismissed = await service.isUpdateDismissed('1.2.0');
    assert.equal(isDismissed, false);

    // Usuário clica em dispensar / lembrar mais tarde
    await service.dismissUpdate('1.2.0');
    isDismissed = await service.isUpdateDismissed('1.2.0');
    assert.equal(isDismissed, true);

    // Versão diferente não deve contar como dispensada
    const isDifferentDismissed = await service.isUpdateDismissed('1.3.0');
    assert.equal(isDifferentDismissed, false);

    // Limpar dispensa
    await service.clearDismissedUpdate();
    isDismissed = await service.isUpdateDismissed('1.2.0');
    assert.equal(isDismissed, false);
  });

  await t.test('Tratamento Gracioso de Falha de Rede / Modo Offline', async () => {
    const service = new UpdateCheckerService('invalid-url-that-does-not-exist', 'invalid-gh');
    service.getCurrentVersion = () => '1.0.0';

    // Se a rede falhar completamente, deve retornar null e não quebrar o app
    service.fetchRemoteManifest = async () => null;

    const result = await service.checkForAppUpdate();
    assert.equal(result, null);
  });
});
