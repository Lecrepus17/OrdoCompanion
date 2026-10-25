import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MANUAL_SECTIONS, searchManual } from '../src/data/manualData';

describe('Manual do Aplicativo & Guia de Telas (manualData.ts)', () => {
  it('deve conter todas as seções principais das telas e mecânicas do OrdoCompanion', () => {
    const requiredSections = [
      'overview',
      'compendium',
      'characters',
      'weapons',
      'books',
      'dice',
      'favorites',
      'entity_detail_editor',
      'cloud_sync',
      'themes',
      'print_sheet',
      'rules_combat_tips',
    ];

    const currentSectionIds = MANUAL_SECTIONS.map((s) => s.id);
    for (const req of requiredSections) {
      assert.ok(
        currentSectionIds.includes(req),
        `A seção obrigatória "${req}" deve estar presente no manual.`
      );
    }
  });

  it('todas as seções devem possuir dados completos e válidos', () => {
    for (const section of MANUAL_SECTIONS) {
      assert.ok(section.id.length > 0, 'ID da seção não pode ser vazio');
      assert.ok(section.title.length > 3, `Título muito curto na seção ${section.id}`);
      assert.ok(section.subtitle.length > 3, `Subtítulo muito curto na seção ${section.id}`);
      assert.ok(section.badge.length > 0, `Badge não pode ser vazia na seção ${section.id}`);
      assert.ok(section.icon.length > 0, `Ícone não pode ser vazio na seção ${section.id}`);
      assert.ok(section.purpose.length > 10, `Propósito não pode ser vazio na seção ${section.id}`);
      assert.ok(section.summary.length > 15, `Sumário muito curto na seção ${section.id}`);
      assert.ok(section.proTip.length > 10, `Dica de mestre deve ser informativa na seção ${section.id}`);
      assert.ok(section.keywords.length >= 3, `Keywords devem ter pelo menos 3 termos na seção ${section.id}`);
      assert.ok(section.features.length >= 2, `Seção ${section.id} deve ter no mínimo 2 funcionalidades documentadas`);
    }
  });

  it('todos os itens de funcionalidade devem ter passos de uso e descrições claras', () => {
    for (const section of MANUAL_SECTIONS) {
      for (const feat of section.features) {
        assert.ok(feat.id.length > 0, `ID da funcionalidade vazio na seção ${section.id}`);
        assert.ok(feat.title.length > 2, `Título de funcionalidade vazio na seção ${section.id}`);
        assert.ok(feat.description.length > 10, `Descrição muito curta em ${feat.id}`);
        assert.ok(
          Array.isArray(feat.howToUse) && feat.howToUse.length > 0,
          `Funcionalidade ${feat.id} deve possuir ao menos 1 passo no 'howToUse'`
        );
      }
    }
  });

  describe('Função searchManual (Busca no Manual)', () => {
    it('deve retornar todas as seções quando a query for vazia ou apenas espaços', () => {
      const all = searchManual('');
      assert.strictEqual(all.length, MANUAL_SECTIONS.length);

      const spaces = searchManual('   ');
      assert.strictEqual(spaces.length, MANUAL_SECTIONS.length);
    });

    it('deve encontrar seções pesquisando pelo título', () => {
      const weapons = searchManual('Armaria');
      assert.ok(weapons.some((s) => s.id === 'weapons'));

      const dice = searchManual('dados');
      assert.ok(dice.some((s) => s.id === 'dice'));
    });

    it('deve encontrar seções pesquisando por termos mecânicos específicos', () => {
      const critSearch = searchManual('crítico');
      assert.ok(critSearch.length > 0);
      assert.ok(critSearch.some((s) => s.id === 'dice' || s.id === 'weapons' || s.id === 'rules_combat_tips'));

      const syncSearch = searchManual('google drive');
      assert.ok(syncSearch.some((s) => s.id === 'cloud_sync'));

      const modSearch = searchManual('mira laser');
      assert.ok(modSearch.some((s) => s.id === 'weapons' || s.id === 'compendium'));
    });

    it('deve ser tolerante a maiúsculas e minúsculas', () => {
      const upper = searchManual('FICHAS');
      const lower = searchManual('fichas');
      assert.strictEqual(upper.length, lower.length);
      assert.ok(upper.some((s) => s.id === 'characters'));
    });
  });
});
