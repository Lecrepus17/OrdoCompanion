import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES,
  getTheme,
  getAvailableThemes,
  registerTheme,
  ThemeDefinition,
  darkTheme,
} from '../src/theme/themes';

const REQUIRED_ELEMENTS = [
  'Sangue',
  'Morte',
  'Conhecimento',
  'Energia',
  'Medo',
  'Variável',
  'Nenhum',
] as const;

describe('Sistema de Temas e Paletas (themes.ts)', () => {
  it('deve conter todos os 7 temas oficiais registrados', () => {
    const expectedThemes = ['dark', 'sangue', 'morte', 'conhecimento', 'energia', 'medo', 'light'];
    for (const themeId of expectedThemes) {
      assert.ok(THEMES[themeId], `Tema "${themeId}" deve estar registrado`);
    }
  });

  it('deve retornar tema padrão (dark) quando fornecido id inválido ou indefinido', () => {
    const fallbackEmpty = getTheme(undefined);
    assert.strictEqual(fallbackEmpty.id, 'dark');

    const fallbackInvalid = getTheme('tema_inexistente_xyz');
    assert.strictEqual(fallbackInvalid.id, 'dark');
  });

  it('deve retornar o tema exato quando id válido for fornecido', () => {
    assert.strictEqual(getTheme('sangue').id, 'sangue');
    assert.strictEqual(getTheme('morte').id, 'morte');
    assert.strictEqual(getTheme('conhecimento').id, 'conhecimento');
    assert.strictEqual(getTheme('energia').id, 'energia');
    assert.strictEqual(getTheme('medo').id, 'medo');
    assert.strictEqual(getTheme('light').id, 'light');
  });

  it('getAvailableThemes deve retornar lista com todos os temas registrados', () => {
    const themes = getAvailableThemes();
    assert.ok(themes.length >= 7);
    const ids = themes.map((t) => t.id);
    assert.ok(ids.includes('dark'));
    assert.ok(ids.includes('sangue'));
    assert.ok(ids.includes('morte'));
    assert.ok(ids.includes('conhecimento'));
    assert.ok(ids.includes('energia'));
    assert.ok(ids.includes('medo'));
    assert.ok(ids.includes('light'));
  });

  it('cada tema registrado deve possuir estrutura completa de cores e status bar', () => {
    for (const theme of getAvailableThemes()) {
      assert.ok(theme.id, 'id deve existir');
      assert.ok(theme.name, `Tema ${theme.id} deve ter name`);
      assert.ok(theme.description, `Tema ${theme.id} deve ter description`);
      assert.ok(typeof theme.isDark === 'boolean', `Tema ${theme.id} deve ter boolean isDark`);
      assert.ok(
        theme.statusBarStyle === 'light' || theme.statusBarStyle === 'dark',
        `statusBarStyle de ${theme.id} deve ser "light" ou "dark"`
      );
      assert.ok(Array.isArray(theme.previewColors) && theme.previewColors.length >= 3);

      const { colors } = theme;
      assert.ok(colors.background, `${theme.id} deve ter colors.background`);
      assert.ok(colors.surface, `${theme.id} deve ter colors.surface`);
      assert.ok(colors.border, `${theme.id} deve ter colors.border`);
      assert.ok(colors.text, `${theme.id} deve ter colors.text`);
      assert.ok(colors.primary, `${theme.id} deve ter colors.primary`);
      assert.ok(colors.accent, `${theme.id} deve ter colors.accent`);
      assert.ok(colors.danger, `${theme.id} deve ter colors.danger`);

      // Validação de todos os 7 elementos paranormais
      assert.ok(colors.elements, `${theme.id} deve ter objeto elements`);
      for (const elem of REQUIRED_ELEMENTS) {
        const elemCfg = colors.elements[elem];
        assert.ok(elemCfg, `Tema ${theme.id} deve definir configurações do elemento "${elem}"`);
        assert.ok(elemCfg.bg, `Elemento ${elem} em ${theme.id} deve ter bg`);
        assert.ok(elemCfg.border, `Elemento ${elem} em ${theme.id} deve ter border`);
        assert.ok(elemCfg.text, `Elemento ${elem} em ${theme.id} deve ter text`);
        assert.ok(elemCfg.icon, `Elemento ${elem} em ${theme.id} deve ter icon`);
      }
    }
  });

  it('deve permitir registrar novos temas via registerTheme', () => {
    const customTheme: ThemeDefinition = {
      ...darkTheme,
      id: 'custom_test_theme',
      name: 'Tema de Teste',
      description: 'Tema personalizado para verificação',
    };

    registerTheme(customTheme);
    const retrieved = getTheme('custom_test_theme');
    assert.strictEqual(retrieved.id, 'custom_test_theme');
    assert.strictEqual(retrieved.name, 'Tema de Teste');
  });
});
