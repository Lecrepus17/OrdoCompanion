import test from 'node:test';
import assert from 'node:assert/strict';
import {
  utf8ToBase64,
  base64ToUtf8,
  encodeAgentShareCode,
  parseAgentShareCode,
  isValidCharacterSheet,
  SHARE_CODE_PREFIX,
} from '../src/utils/agentSharing';
import { CharacterSheet } from '../src/types/compendium';

test('ADVERSARIAL CHALLENGE — agentSharing & Base64 Hermes Engine Parity', async (t) => {
  await t.test('1. Bit-for-bit Parity with Node.js Buffer across varying lengths & modulo padding', () => {
    // Test lengths from 0 to 128 bytes with various patterns
    for (let len = 0; len <= 128; len++) {
      const asciiStr = 'X'.repeat(len);
      const customB64 = utf8ToBase64(asciiStr);
      const nodeB64 = Buffer.from(asciiStr, 'utf-8').toString('base64');
      assert.equal(customB64, nodeB64, `Falha de paridade para string ASCII de comprimento ${len}`);
      assert.equal(base64ToUtf8(customB64), asciiStr, `Falha de decodificação para string ASCII de comprimento ${len}`);
    }
  });

  await t.test('2. Paridade total com Node.js Buffer para todos os code points Unicode (1 a 4 bytes)', () => {
    const testVectors = [
      // 1-byte (ASCII)
      '\x00\x01\x02\x1f !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f',
      // 2-byte (Latin, Cyrillic, Greek, Hebrew, Arabic)
      'ÁÉÍÓÚáéíóúÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÃÕãõÇçÑñÜü¿¡§¶©®™—–',
      'Привет, мир! Тестирование русского текста и кириллицы.',
      'Ελληνικά: Καλημέρα κόσμε, δοκιμή ελληνικών χαρακτήρων.',
      'עִבְרִית: שלום עולם, בדיקת יוניקוד',
      'العربية: مرحبا بالعالم، اختبار اليونيكود',
      // 3-byte (Asian scripts, Math symbols, Runes)
      '日本語のテスト：吾輩は猫である。名前はまだ無い。',
      '中文测试：道可道，非常道。名可名，非常名。',
      '한국어 테스트: 안녕 세상아, 유니코드 테스트입니다.',
      'ᚠᚢᚦᚨᚱᚲ ᚺᚨᛁᛚᚨᚷ (Runas Nórdicas)',
      '∀x ∈ ℝ: ∃y (y > x) ∧ ∫_{0}^{∞} e^{-x^2} dx = √π/2',
      '┌─┬─┐│ │ │├─┼─┤│ │ │└─┴─┘',
      // 4-byte (Astral plane & Emojis)
      '𐀀𐀁𐀂 (Linear B)',
      '𝕸𝖆𝖌𝖎𝖈 𝖆𝖓𝖉 𝕺𝖈𝖈𝖚𝖑𝖙 (Fraktur Unicode)',
      '🕵️‍♂️❤️‍🔥🧙‍♀️🎲⚔️🛡️🏹🩸💀👁️⚡🪐',
      '🇧🇷 🇺🇸 🇯🇵 🇩🇪 🇫🇷 🇬🇧 (Bandeiras com Regional Indicators)',
      '👨‍👩‍👧‍👦 (Família com ZWJ quadruplo)',
      '🧑🏽‍🚀 (Astronauta com modificador de tom de pele FitzPatrick)',
      '1️⃣ 2️⃣ 3️⃣ #️⃣ *️⃣ (Keycap sequences)',
      'T̷h̵e̷ ̴V̴o̶i̵d̷ ̵i̷s̷ ̶C̵a̴l̸l̵i̵n̸g̷ (Zalgo / Combining diacritics)',
    ];

    for (const vector of testVectors) {
      const customB64 = utf8ToBase64(vector);
      const nodeB64 = Buffer.from(vector, 'utf-8').toString('base64');
      assert.equal(customB64, nodeB64, `Divergência com Node Buffer no vetor: "${vector.slice(0, 20)}..."`);
      const roundtrip = base64ToUtf8(customB64);
      assert.equal(roundtrip, vector, `Falha de roundtrip no vetor: "${vector.slice(0, 20)}..."`);
    }
  });

  await t.test('3. Stress test com payloads massivos (100 KB e 1 MB)', () => {
    // 100 KB payload
    const chunk = 'OrdemParanormal_EnigmaDoMedo_Sangue_Morte_Conhecimento_Energia_';
    const large100k = chunk.repeat(1600); // ~102 KB
    const t0 = performance.now();
    const encoded100k = utf8ToBase64(large100k);
    const decoded100k = base64ToUtf8(encoded100k);
    const t1 = performance.now();

    assert.equal(decoded100k, large100k);
    assert.equal(encoded100k, Buffer.from(large100k, 'utf-8').toString('base64'));
    assert.ok(t1 - t0 < 1000, `Payload 100k demorou mais de 1000ms: ${t1 - t0}ms`);

    // 1 MB payload com mistura de emojis e Unicode
    const complexChunk = '🩸 Ocultista NEX 99% • Afinidade com Sangue • Dano 12d6+15 💀 ';
    const large1Mb = complexChunk.repeat(15000); // ~1 MB
    const encoded1Mb = utf8ToBase64(large1Mb);
    const decoded1Mb = base64ToUtf8(encoded1Mb);
    assert.equal(decoded1Mb, large1Mb);
    assert.equal(encoded1Mb, Buffer.from(large1Mb, 'utf-8').toString('base64'));
  });

  await t.test('4. Resiliência adversária contra padding quebrado e formatações maliciosas', () => {
    const raw = 'Ficha de Agente Especial';
    const standardB64 = Buffer.from(raw, 'utf-8').toString('base64');

    // Sem padding (se houver)
    const strippedB64 = standardB64.replace(/=+$/, '');
    assert.equal(base64ToUtf8(strippedB64), raw, 'Falha ao decodificar Base64 com padding truncado');

    // Espaçamentos e novas linhas inseridos
    const pollutedB64 = `\r\n\t  ${standardB64.slice(0, 5)} \n ${standardB64.slice(5, 12)} \t ${standardB64.slice(12)} \r\n  `;
    assert.equal(base64ToUtf8(pollutedB64), raw, 'Falha ao decodificar Base64 poluído com whitespaces');

    // Comprimentos inválidos (len % 4 === 1 nunca é Base64 válido)
    assert.throws(() => base64ToUtf8('A'), /Comprimento de Base64 inválido/);
    assert.throws(() => base64ToUtf8('AAAAA'), /Comprimento de Base64 inválido/);

    // Padding malformado (= em posições internas incorretas)
    assert.throws(() => base64ToUtf8('A=AA'), /Caractere Base64 inválido|Padding Base64 malformado/);
    assert.throws(() => base64ToUtf8('AA=A'), /Padding Base64 malformado/);
    assert.throws(() => base64ToUtf8('===='), /Caractere Base64 inválido/);

    // Caracteres fora do alfabeto Base64
    assert.throws(() => base64ToUtf8('YW!j'), /Caractere Base64 inválido/);
    assert.throws(() => base64ToUtf8('YWJj;def'), /Caractere Base64 inválido/);
  });

  await t.test('5. Ficha de Agente Gigante (Massive Character Sheet stress test)', () => {
    const massiveSheet: CharacterSheet = {
      id: 'massive_agent_99',
      name: 'Veríssimo • O Senhor da Ordem ⚡🩸👁️💀',
      player: 'Mestre Supremo',
      nex: 99,
      rank: 'Agente de Elite',
      originId: 'origin_investigador',
      classId: 'class_especialista',
      trackId: 'track_infiltrador',
      affinity: 'Morte',
      attributes: { AGI: 5, FOR: 5, INT: 5, PRE: 5, VIG: 5 },
      pvCurrent: 200,
      pvMax: 200,
      peCurrent: 120,
      peMax: 120,
      sanCurrent: 100,
      sanMax: 100,
      defenseBonus: 10,
      skills: {},
      attacks: [],
      entityIds: [],
      notes: 'x'.repeat(50000), // 50 KB notes
      updatedAt: new Date().toISOString(),
    };

    // Preenche 100 perícias artificiais
    for (let i = 0; i < 100; i++) {
      massiveSheet.skills[`Pericia_${i}`] = { degree: 15, bonus: 20 };
    }

    // Preenche 50 ataques
    for (let i = 0; i < 50; i++) {
      massiveSheet.attacks?.push({
        id: `atk_${i}`,
        name: `Arma Paranormal do Apocalipse #${i} ⚔️`,
        test: 'Luta (5d20+25)',
        damage: '10d10+20',
        critical: '17/x4',
        range: 'Corpo a corpo',
        special: 'Morte • Sangue • Dissipação instantânea',
      });
    }

    // Preenche 100 entidades conhecidas
    for (let i = 0; i < 100; i++) {
      massiveSheet.entityIds?.push(`entidade_ritual_supremo_${i}`);
    }

    const shareCode = encodeAgentShareCode(massiveSheet);
    assert.ok(shareCode.startsWith(SHARE_CODE_PREFIX));

    const restored = parseAgentShareCode(shareCode);
    assert.ok(restored !== null);
    assert.equal(restored?.id, massiveSheet.id);
    assert.equal(restored?.name, massiveSheet.name);
    assert.equal(restored?.attacks?.length, 50);
    assert.equal(restored?.entityIds?.length, 100);
    assert.equal(Object.keys(restored?.skills || {}).length, 100);
    assert.equal(restored?.notes?.length, 50000);
  });

  await t.test('6. Validação de robustez de parseAgentShareCode contra entradas arbitrárias e hostis', () => {
    // Entradas nulas ou tipos não-string
    assert.equal(parseAgentShareCode('' as any), null);
    assert.equal(parseAgentShareCode(null as any), null);
    assert.equal(parseAgentShareCode(undefined as any), null);
    assert.equal(parseAgentShareCode(12345 as any), null);
    assert.equal(parseAgentShareCode({} as any), null);

    // Strings arbitrárias que não são JSON nem base64 de ficha
    assert.equal(parseAgentShareCode('Hello World!'), null);
    assert.equal(parseAgentShareCode('ORDO-AG-v1:YWJjZA=='), null); // base64 de "abcd" -> JSON.parse falha -> retorna null
    assert.equal(parseAgentShareCode('ORDO-AG-v1:eyJmb28iOiJiYXIifQ=='), null); // base64 de '{"foo":"bar"}' -> não é CharacterSheet válida -> retorna null

    // JSON com tipos incorretos
    assert.equal(isValidCharacterSheet({ name: 123 }), false);
    assert.equal(isValidCharacterSheet({ name: 'Teste', attributes: null }), false);
    assert.equal(isValidCharacterSheet({ name: 'Teste', attributes: { AGI: 'dois' } }), false);
    assert.equal(
      isValidCharacterSheet({
        name: 'Teste',
        attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
        pvMax: 'trinta',
      }),
      false
    );
  });
});
