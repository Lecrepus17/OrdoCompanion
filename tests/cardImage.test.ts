import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllCardThemes,
  getCardThemeById,
  registerCustomCardTheme,
  resolveRecordTheme,
} from '../src/services/cardImage/themeRegistry';
import { extractRecordCardData } from '../src/services/cardImage/cardDataExtractor';
import { generateCardSvg } from '../src/services/cardImage/svgCardRenderer';
import {
  formatRecordTextForSharing,
  downloadCardImage,
  shareCardImage,
} from '../src/services/cardImage/cardExportService';
import { CompendiumEntity } from '../src/types/compendium';
import { RecordPreviewTarget } from '../src/types/recordPreview';

test('Sistema de Geração de Imagem Estilizada do Compêndio', async (t) => {
  await t.test('1. Resolução Automática de Temas por Elemento Paranormal', () => {
    // 1.1 Sangue
    const entSangue: Partial<CompendiumEntity> = {
      id: 'rit_1',
      name: 'Descarnar',
      category: 'ritual',
      element: 'Sangue',
    };
    const themeSangue = resolveRecordTheme(entSangue as CompendiumEntity);
    assert.equal(themeSangue.id, 'sangue');
    assert.equal(themeSangue.elementGlyph, '🩸');
    assert.match(themeSangue.colors.primary, /#DC2626/i);

    // 1.2 Morte
    const entMorte: Partial<CompendiumEntity> = {
      id: 'rit_2',
      name: 'Espirais da Perdição',
      category: 'ritual',
      element: 'Morte',
    };
    const themeMorte = resolveRecordTheme(entMorte as CompendiumEntity);
    assert.equal(themeMorte.id, 'morte');
    assert.equal(themeMorte.elementGlyph, '⏳');

    // 1.3 Conhecimento
    const entConh: Partial<CompendiumEntity> = {
      id: 'rit_3',
      name: 'Compreensão Paranormal',
      category: 'ritual',
      element: 'Conhecimento',
    };
    const themeConh = resolveRecordTheme(entConh as CompendiumEntity);
    assert.equal(themeConh.id, 'conhecimento');
    assert.equal(themeConh.elementGlyph, '👁️');

    // 1.4 Energia
    const entEnergia: Partial<CompendiumEntity> = {
      id: 'rit_4',
      name: 'Polarização Caótica',
      category: 'ritual',
      element: 'Energia',
    };
    const themeEnergia = resolveRecordTheme(entEnergia as CompendiumEntity);
    assert.equal(themeEnergia.id, 'energia');
    assert.equal(themeEnergia.elementGlyph, '⚡');

    // 1.5 Medo
    const entMedo: Partial<CompendiumEntity> = {
      id: 'rit_5',
      name: 'Cignal de Pavor',
      category: 'ritual',
      element: 'Medo',
    };
    const themeMedo = resolveRecordTheme(entMedo as CompendiumEntity);
    assert.equal(themeMedo.id, 'medo');
    assert.equal(themeMedo.elementGlyph, '💀');

    // 1.6 Variável
    const entVar: Partial<CompendiumEntity> = {
      id: 'rit_6',
      name: 'Transfiguração Elemental',
      category: 'ritual',
      element: 'Variável',
    };
    const themeVar = resolveRecordTheme(entVar as CompendiumEntity);
    assert.equal(themeVar.id, 'variavel');
  });

  await t.test('2. Resolução de Temas por Categoria quando sem Elemento', () => {
    // 2.1 Armas
    const entArma: Partial<CompendiumEntity> = {
      id: 'wp_1',
      name: 'Fuzil de Assalto',
      category: 'weapon',
      element: 'Nenhum',
    };
    assert.equal(resolveRecordTheme(entArma as CompendiumEntity).id, 'tatico_arma');

    // 2.2 Itens
    const entItem: Partial<CompendiumEntity> = {
      id: 'it_1',
      name: 'Colete Balístico',
      category: 'item',
      element: 'Nenhum',
    };
    assert.equal(resolveRecordTheme(entItem as CompendiumEntity).id, 'tatico_item');

    // 2.3 Criatura sem elemento
    const entCrit: Partial<CompendiumEntity> = {
      id: 'cr_1',
      name: 'Zumbi de Sangue',
      category: 'creature',
      element: 'Nenhum',
    };
    assert.equal(resolveRecordTheme(entCrit as CompendiumEntity).id, 'ameaca_criatura');

    // 2.4 Origem / Classe / Poder
    const entOrig: Partial<CompendiumEntity> = {
      id: 'or_1',
      name: 'Policial',
      category: 'origin',
    };
    assert.equal(resolveRecordTheme(entOrig as CompendiumEntity).id, 'dossie_agente');

    // 2.5 Perícia / Regra
    const entPer: Partial<CompendiumEntity> = {
      id: 'sk_1',
      name: 'Ocultismo',
      category: 'skill',
    };
    assert.equal(resolveRecordTheme(entPer as CompendiumEntity).id, 'manual_regra');

    // 2.6 Fallback
    assert.equal(resolveRecordTheme(null).id, 'padrao_ordo');
  });

  await t.test('3. Registro e Customização de Temas', () => {
    const all = getAllCardThemes();
    assert.ok(all.length >= 10);

    const themeById = getCardThemeById('sangue');
    assert.equal(themeById.id, 'sangue');

    registerCustomCardTheme({
      id: 'meu_tema_custom',
      name: 'Custom Paranormal',
      subtitle: 'Tema Criado pelo Usuário',
      kind: 'custom',
      elementGlyph: '🔥',
      patternType: 'clean_ordo',
      motto: 'Tema personalizado.',
      colors: themeById.colors,
    });

    const custom = getCardThemeById('meu_tema_custom');
    assert.equal(custom.name, 'Custom Paranormal');
  });

  await t.test('4. Extração de Dados do Registro (extractRecordCardData)', () => {
    const ritual: CompendiumEntity = {
      id: 'rit_odio',
      name: 'Ódio Incontrolável',
      category: 'ritual',
      subCategory: 'Ritual • 1º Círculo',
      bookId: 'livro_base',
      bookTitle: 'Livro Base',
      pageNumber: 124,
      element: 'Sangue',
      circle: 1,
      execution: 'Padrão',
      range: 'Curto',
      target: '1 pessoa',
      duration: 'Cena',
      resistance: 'Nenhuma',
      discente: 'O alvo ganha +2 em ataques.',
      summary: 'O alvo é consumido por uma fúria primal incontrolável.',
      description: 'O sangue do alvo ferve de raiva paranóica.',
      tags: ['Dano', 'Combate'],
    };

    const data = extractRecordCardData(ritual);
    assert.equal(data.name, 'Ódio Incontrolável');
    assert.equal(data.category, 'ritual');
    assert.equal(data.element, 'Sangue');
    assert.equal(data.pageNumber, 124);
    assert.ok(data.stats.some((s) => s.label === 'Círculo' && s.value === '1º Círculo'));
    assert.ok(data.stats.some((s) => s.label === 'Execução' && s.value === 'Padrão'));
    assert.ok(data.extraSections && data.extraSections.length > 0);
    assert.equal(data.extraSections[0].title, 'Discente (+2 PE)');

    // Extração a partir de RecordPreviewTarget (Genérico)
    const genericTarget: RecordPreviewTarget = {
      kind: 'generic',
      title: 'Dossiê do Investigador',
      subtitle: 'Relatório Confidencial',
      element: 'Conhecimento',
      stats: [{ label: 'NEX', value: '50%', highlight: true }],
      description: 'Documento contendo transcrições de áudio perturbadoras.',
    };
    const genericData = extractRecordCardData(genericTarget);
    assert.equal(genericData.name, 'Dossiê do Investigador');
    assert.equal(genericData.element, 'Conhecimento');
    assert.equal(genericData.stats[0].label, 'NEX');
  });

  await t.test('5. Renderização de SVG Vetorial em Alta Resolução', () => {
    const creature: CompendiumEntity = {
      id: 'cr_degolificada',
      name: 'Degolificada',
      category: 'creature',
      subCategory: 'Criatura de Sangue',
      bookId: 'livro_base',
      bookTitle: 'Livro Base',
      pageNumber: 180,
      element: 'Sangue',
      vd: 160,
      pv: 320,
      defense: 28,
      summary: 'Uma abominação de carne e lâminas retorcidas.',
      description: 'Arrasta suas vítimas para a escuridão enquanto murmura seus nomes.',
      tags: ['Hostil'],
    };

    const data = extractRecordCardData(creature);
    const theme = resolveRecordTheme(creature);
    const svg = generateCardSvg(data, theme, { width: 1080, height: 1350 });

    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('viewBox="0 0 1080 1350"'));
    assert.ok(svg.includes('Degolificada'));
    assert.ok(svg.includes('VD'));
    assert.ok(svg.includes('320'));
    assert.ok(svg.includes('ORDO REALITAS • COMPÊNDIO OFICIAL'));
    assert.ok(svg.includes('ORDO COMPANION'));
    assert.ok(svg.includes('blood_veins') || svg.includes('Padrão Sangue'));
  });

  await t.test('6. Formatação e Exportação de Compartilhamento', async () => {
    const ent: CompendiumEntity = {
      id: 'wp_katana',
      name: 'Katana Ritualística',
      category: 'weapon',
      subCategory: 'Arma Tática',
      bookId: 'livro_base',
      bookTitle: 'Livro Base',
      pageNumber: 60,
      element: 'Morte',
      damage: '1d10+2',
      critical: '19/x2',
      summary: 'Lâmina imbuída com espirais de cinzas.',
      description: 'Desfere cortes que envelhecem a matéria.',
      tags: ['Corte'],
    };

    const data = extractRecordCardData(ent);
    const theme = resolveRecordTheme(ent);

    // Formatação de texto para Discord / WhatsApp
    const shareText = formatRecordTextForSharing(data, theme);
    assert.ok(shareText.includes('KATANA RITUALÍSTICA'));
    assert.ok(shareText.includes('Morte'));
    assert.ok(shareText.includes('1d10+2'));
    assert.ok(shareText.includes('Ordo Companion'));

    // Download (em ambiente de teste dispara sem quebrar)
    const dlResult = await downloadCardImage(data, theme, { format: 'svg' });
    assert.ok(dlResult.fileName.includes('katana_ritualistica'));
    assert.equal(dlResult.format, 'svg');

    // Share
    const shareRes = await shareCardImage(data, theme);
    assert.ok(typeof shareRes.success === 'boolean');
  });

  await t.test('7. Robustez de Extração e Exportação para APK (Cat 0, Espaço 0 e Print)', async () => {
    const { wrapCardSvgForPrint } = await import('../src/services/cardImage/cardExportService');

    // Item geral com Categoria 0 e Espaço 0
    const generalItem = {
      id: 'item_lanterna',
      name: 'Lanterna Tática',
      category: 'item',
      itemCategory: 0,
      spaces: 0,
      description: 'Ilumina uma área de 9 metros.',
    } as unknown as CompendiumEntity;
    const dataItem = extractRecordCardData(generalItem);
    assert.equal(dataItem.stats.length >= 2, true);
    assert.ok(dataItem.stats.some(s => s.label === 'Categoria' && s.value === 'Cat. 0'));
    assert.ok(dataItem.stats.some(s => s.label === 'Espaços' && s.value === '0 ESP'));

    // Poder sem pré-requisito
    const powerWithoutReq = {
      id: 'pow_visagem',
      name: 'Visagem do Horror',
      category: 'power',
      subCategory: 'Poder de Ocultista',
      element: 'Medo',
    } as unknown as CompendiumEntity;
    const dataPower = extractRecordCardData(powerWithoutReq);
    assert.equal(dataPower.stats.length >= 2, true);
    assert.ok(dataPower.stats.some(s => s.label === 'Elemento' && s.value === 'Medo'));

    // Teste de wrapCardSvgForPrint
    const theme = resolveRecordTheme(generalItem);
    const svg = generateCardSvg(dataItem, theme);
    const html = wrapCardSvgForPrint(svg, generalItem.name, theme);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes(generalItem.name));
    assert.ok(html.includes('<svg'));
  });
});
