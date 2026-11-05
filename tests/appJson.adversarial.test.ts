import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ADVERSARIAL CHALLENGE — app.json syntax, structure & Android APK configurations', async (t) => {
  const appJsonPath = path.resolve(__dirname, '../app.json');

  await t.test('1. app.json deve existir e ser um JSON sintaticamente estrito', () => {
    assert.ok(fs.existsSync(appJsonPath), 'app.json deve existir na raiz do projeto');
    const rawContent = fs.readFileSync(appJsonPath, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(rawContent), 'app.json deve ser um JSON válido');
  });

  await t.test('2. Bloco "android" deve possuir as configurações de APK críticas (Cleartext & Internet)', () => {
    const rawContent = fs.readFileSync(appJsonPath, 'utf-8');
    const config = JSON.parse(rawContent);

    assert.ok(config.expo, 'Campo raiz "expo" deve existir');
    assert.ok(config.expo.android, 'Objeto "expo.android" deve existir');

    const android = config.expo.android;
    assert.equal(android.package, 'com.ordemparanormal.ordo', 'Pacote Android deve ser com.ordemparanormal.ordo');
    assert.equal(typeof android.versionCode, 'number', 'versionCode deve ser numérico');
    assert.ok(android.versionCode >= 1, 'versionCode deve ser >= 1');

    // Validação estrita da regra de Milestone 2 (Cleartext Traffic)
    assert.equal(
      android.usesCleartextTraffic,
      true,
      'android.usesCleartextTraffic DEVE ser true para comunicação local com Ollama/dev servers'
    );

    // Validação estrita de permissões de rede
    assert.ok(Array.isArray(android.permissions), 'android.permissions deve ser uma lista de strings');
    assert.ok(
      android.permissions.includes('android.permission.INTERNET'),
      'android.permissions deve conter android.permission.INTERNET'
    );
  });

  await t.test('3. Plugins, esquema e arquitetura devem estar consistentes com Expo 58 e Android', () => {
    const rawContent = fs.readFileSync(appJsonPath, 'utf-8');
    const config = JSON.parse(rawContent);
    const expo = config.expo;

    assert.equal(expo.slug, 'ordo-companion');
    assert.equal(expo.scheme, 'com.ordemparanormal.ordo');
    assert.ok(Array.isArray(expo.plugins), 'expo.plugins deve ser array');
    assert.ok(expo.plugins.includes('expo-router'), 'expo.plugins deve incluir expo-router');
    assert.ok(expo.plugins.includes('expo-sharing'), 'expo.plugins deve incluir expo-sharing');
  });
});
