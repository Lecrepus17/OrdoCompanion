import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeAgentShareCode,
  parseAgentShareCode,
  isValidCharacterSheet,
  formatAgentSummary,
  SHARE_CODE_PREFIX,
} from '../src/utils/agentSharing';
import { CharacterSheet } from '../src/types/compendium';

test('Sistema de Compartilhamento de Agentes (agentSharing.ts)', async (t) => {
  const dummySheet: CharacterSheet = {
    id: 'char_test_123',
    name: 'Arthur Cervero • Ocultista Graduado',
    player: 'Thiago Espíndola',
    nex: 50,
    rank: 'Agente Especial',
    originId: 'origin_investigador',
    classId: 'class_ocultista',
    trackId: 'track_graduado',
    affinity: 'Sangue',
    attributes: { AGI: 2, FOR: 1, INT: 4, PRE: 3, VIG: 2 },
    pvCurrent: 36,
    pvMax: 36,
    peCurrent: 30,
    peMax: 30,
    sanCurrent: 45,
    sanMax: 45,
    defenseBonus: 2,
    skills: {
      Ocultismo: { degree: 15, bonus: 15 },
      Investigação: { degree: 10, bonus: 10 },
    },
    attacks: [
      {
        id: 'atk_1',
        name: 'Revólver Amaldiçoado',
        test: 'Pontaria (2d20+10)',
        damage: '2d6+2',
        critical: '19/x3',
        range: 'Médio',
        special: 'Balístico • Sangue',
      },
    ],
    entityIds: ['ritual_cicatrizacao'],
    notes: 'Anotações secretas sobre a relíquia',
    updatedAt: '2026-10-25T12:00:00.000Z',
  };

  await t.test('deve codificar uma ficha com prefixo oficial e decodificar com fidelidade total', () => {
    const code = encodeAgentShareCode(dummySheet);
    assert.ok(code.startsWith(SHARE_CODE_PREFIX));

    const restored = parseAgentShareCode(code);
    assert.ok(restored !== null);
    assert.equal(restored?.id, dummySheet.id);
    assert.equal(restored?.name, dummySheet.name);
    assert.equal(restored?.player, dummySheet.player);
    assert.equal(restored?.nex, dummySheet.nex);
    assert.deepEqual(restored?.attributes, dummySheet.attributes);
    assert.equal(restored?.attacks?.length, 1);
    assert.equal(restored?.attacks?.[0].name, 'Revólver Amaldiçoado');
  });

  await t.test('deve suportar decodificação mesmo se o usuário colar o JSON puro', () => {
    const jsonStr = JSON.stringify(dummySheet);
    const restored = parseAgentShareCode(jsonStr);
    assert.ok(restored !== null);
    assert.equal(restored?.name, dummySheet.name);
  });

  await t.test('deve retornar null com segurança para strings inválidas ou corrompidas', () => {
    assert.equal(parseAgentShareCode(''), null);
    assert.equal(parseAgentShareCode('ORDO-AG-v1:INVALIDO_BASE_64%%%'), null);
    assert.equal(parseAgentShareCode('{ "name": "Ficha Incompleta" }'), null);
  });

  await t.test('isValidCharacterSheet deve validar presença de atributos e status vitais', () => {
    assert.equal(isValidCharacterSheet(dummySheet), true);
    assert.equal(isValidCharacterSheet(null), false);
    assert.equal(isValidCharacterSheet({ name: 'Sem atributos' }), false);
    assert.equal(
      isValidCharacterSheet({
        name: 'Incompleto',
        attributes: { AGI: 1 },
      }),
      false
    );
  });

  await t.test('formatAgentSummary deve formatar sumário legível', () => {
    const summary = formatAgentSummary(dummySheet);
    assert.ok(summary.includes('Arthur Cervero'));
    assert.ok(summary.includes('Jogador: Thiago Espíndola'));
    assert.ok(summary.includes('NEX 50%'));
  });
});
