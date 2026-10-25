import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign, CampaignMonster, CampaignStoryScene, CampaignAgentLink } from '../src/types/compendium';
import { SmartMergeEngine } from '../src/services/sync/SmartMergeEngine';
import { UserDataBackupPayload } from '../src/services/sync/types';

test('Gerenciamento de Campanhas e Sincronização (Campaigns & SmartMergeEngine)', async (t) => {
  const dummyCampaign1: Campaign = {
    id: 'camp_1',
    title: 'Operação Crisálida',
    subtitle: 'Investigação em Santo Berço',
    description: 'Os agentes investigam desaparecimentos na serra.',
    masterNotes: 'O estalajadeiro é um zumbi disfarçado.',
    threatLevel: 'Iniciante',
    recommendedRank: 'Recruta',
    stories: [
      {
        id: 'scene_1',
        title: 'Chegada ao Hotel',
        summary: 'Os agentes chegam sob chuva torrencial.',
        details: 'A porta está trancada por dentro com correntes enferrujadas.',
        clues: [
          { id: 'clue_1', text: 'Chave enferrujada no tapete', isFound: false },
          { id: 'clue_2', text: 'Mancha escura no assoalho', isFound: true },
        ],
        order: 1,
      },
    ],
    monsters: [
      {
        id: 'mon_1',
        name: 'Zumbi de Sangue',
        compendiumEntityId: 'creature_zumbi_sangue',
        vd: 20,
        pvCurrent: 35,
        pvMax: 40,
        defense: 15,
        disturbingPresence: 'DT 13 • 1d6 mental',
        element: 'Sangue',
      },
    ],
    agents: [],
    initiatives: [
      {
        id: 'init_1',
        name: 'Zumbi de Sangue',
        type: 'monster',
        initiative: 12,
      },
    ],
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  };

  const dummyCampaign2: Campaign = {
    id: 'camp_2',
    title: 'Sinais do Outro Lado',
    subtitle: 'Terror tecnológico em São Paulo',
    description: 'Estruturas de energia corrompem torres de transmissão.',
    stories: [],
    monsters: [],
    agents: [],
    initiatives: [],
    createdAt: '2026-10-25T11:00:00.000Z',
    updatedAt: '2026-10-25T11:00:00.000Z',
  };

  await t.test('SmartMergeEngine deve mesclar campanhas locais e remotas sem perda', () => {
    const localPayload: UserDataBackupPayload = {
      exportedAt: '2026-10-25T12:00:00.000Z',
      campaigns: [dummyCampaign1],
    };

    const remotePayload: UserDataBackupPayload = {
      exportedAt: '2026-10-25T12:00:00.000Z',
      campaigns: [dummyCampaign2],
    };

    const result = SmartMergeEngine.merge(localPayload, remotePayload);
    assert.equal(result.merged.campaigns?.length, 2);
    assert.ok(result.merged.campaigns?.some((c) => c.id === 'camp_1'));
    assert.ok(result.merged.campaigns?.some((c) => c.id === 'camp_2'));
    assert.equal(result.stats.campaignsCount, 2);
  });

  await t.test('SmartMergeEngine deve resolver conflito escolhendo a campanha com updatedAt mais recente', () => {
    const olderCamp: Campaign = {
      ...dummyCampaign1,
      title: 'Operação Crisálida (Antiga)',
      updatedAt: '2026-10-25T09:00:00.000Z',
    };

    const newerCamp: Campaign = {
      ...dummyCampaign1,
      title: 'Operação Crisálida (Atualizada pelo Mestre)',
      updatedAt: '2026-10-25T14:00:00.000Z',
    };

    const localPayload: UserDataBackupPayload = {
      exportedAt: '2026-10-25T12:00:00.000Z',
      campaigns: [olderCamp],
    };

    const remotePayload: UserDataBackupPayload = {
      exportedAt: '2026-10-25T14:00:00.000Z',
      campaigns: [newerCamp],
    };

    const result = SmartMergeEngine.merge(localPayload, remotePayload);
    assert.equal(result.merged.campaigns?.length, 1);
    assert.equal(result.merged.campaigns?.[0].title, 'Operação Crisálida (Atualizada pelo Mestre)');
    assert.ok(result.hasLocalChangesToApply);
  });
});
