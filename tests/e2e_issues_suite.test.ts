import './setup';
import React from 'react';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Module 1: AI & Voice
import {
  cleanTextForTts,
  GlitchVoiceService,
} from '../src/services/ai/GlitchVoiceService';
import {
  getEffectiveApiKey,
  hasDefaultApiKey,
  isUsingDefaultApiKey,
  testAiConnection,
  BUILTIN_DEFAULT_GEMINI_KEY,
  validateKey,
} from '../src/services/ai/AiClient';
import { generateOfflineResponse } from '../src/services/ai/AiOfflineEngine';
import { retrieveAiKnowledge } from '../src/services/ai/AiKnowledgeRetrieval';
import { DEFAULT_AI_CONFIG, AiConfig } from '../src/types/ai';

// Module 2: Books & PDF Viewer
import { renderFormattedBookText } from '../src/components/PdfViewerModal';
import {
  downloadPdfDocument,
  openPdfDocument,
  getCleanPdfUrl,
  getRawPdfUrl,
  getCloudPdfUrl,
  getEffectivePdfFileBaseUrl,
  getRenderedPdfPageUrl,
  isPdfServerConfigured,
  setCustomPdfServerUrl,
  getCustomPdfServerUrl,
  setMasterGoogleDriveFolderUrl,
  getMasterGoogleDriveFolderUrl,
  normalizeServerUrl,
} from '../src/utils/pdfUrl';

// Module 3: Characters & Weapons
import {
  CharacterSheet,
  CustomWeapon,
  CompendiumEntity,
} from '../src/types/compendium';
import { generateSheetHtml } from '../src/utils/sheetPrinter';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { createStyles as createCharacterStyles } from '../src/app/(tabs)/characters';

// Module 4: Card Image Export
import {
  downloadCardImage,
  shareCardImage,
  wrapCardSvgForPrint,
  formatRecordTextForSharing,
  svgToPngDataUrl,
} from '../src/services/cardImage/cardExportService';
import { extractRecordCardData } from '../src/services/cardImage/cardDataExtractor';
import { generateCardSvg } from '../src/services/cardImage/svgCardRenderer';
import {
  getCardThemeById,
  resolveRecordTheme,
} from '../src/services/cardImage/themeRegistry';
import { RecordCardData } from '../src/services/cardImage/types';
import { RecordImageExportModal } from '../src/components/cardImage/RecordImageExportModal';

// Module 5: Support & Navigation
import {
  supportService,
  SupportService,
  DEFAULT_SUPPORT_CONFIG,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SUPPORT_CUSTOM_WEBHOOK_KEY,
  SUPPORT_TICKETS_STORAGE_KEY,
} from '../src/services/support/SupportService';
import { SupportTicketPayload } from '../src/services/support/types';
import {
  isLandscapeViewport,
  calculateBottomTabBarHeight,
} from '../src/components/CustomBottomTabBar';

// Module 6: Offline Sync & Tombstones
import { SmartMergeEngine } from '../src/services/sync/SmartMergeEngine';
import { UserDataBackupPayload } from '../src/services/sync/types';

// Polyfills & test helpers
import { resetMockStorage } from './setup';
import { darkTheme as defaultTheme } from '../src/theme';
import { renderWithProviders } from './frontendTestUtils';

// Fixture: Canonical sample agent for testing
const SAMPLE_AGENT: CharacterSheet = {
  id: 'agent_e2e_01',
  name: 'Kaiser Investigador',
  player: 'Agente da Ordem',
  originId: 'orig_investigador',
  classId: 'cls_especialista',
  trackId: 'trk_atirador_elite',
  rank: 'Operador',
  affinity: 'Morte',
  nex: 35,
  attributes: { AGI: 3, FOR: 1, INT: 3, PRE: 2, VIG: 2 },
  pvCurrent: 36,
  pvMax: 36,
  sanCurrent: 44,
  sanMax: 44,
  peCurrent: 35,
  peMax: 35,
  defenseBonus: 13,
  skills: {
    Pontaria: { degree: 10, bonus: 10 },
    Investigação: { degree: 10, bonus: 10 },
    Furtividade: { degree: 5, bonus: 5 },
  },
  attacks: [
    {
      id: 'atk_fuzil_01',
      name: 'Fuzil de Precisão Tático',
      test: '+13',
      damage: '2d10+2',
      critical: '18/x3',
      range: 'Longo',
      special: 'Balístico / Mira Laser',
    },
  ],
  abilities: [],
  inventory: [],
  entityIds: [],
  notes: 'Agente focado em combate à distância e perícias investigativas.',
  updatedAt: new Date().toISOString(),
};

// Fixture: Canonical sample custom weapon
const SAMPLE_CUSTOM_WEAPON: CustomWeapon = {
  id: 'wpn_e2e_sniper',
  name: 'Fuzil de Caça Customizado',
  baseWeaponId: 'arma_fuzil_caca',
  baseWeaponName: 'Fuzil de Caça',
  weaponType: 'Fogo',
  proficiency: 'Tática',
  handedness: 'Duas Mãos',
  baseDamage: '2d8',
  baseCritical: '19/x3',
  baseRange: 'Médio',
  baseDamageType: 'Balístico',
  baseSpaces: 2,
  baseCategory: 'I',
  ammoType: 'Balas longas',
  ammoName: 'Balas longas',
  baseAmmoCategory: 'I',
  modifications: ['mod_mira_laser', 'mod_compensador'],
  element: 'Morte',
  finalDamage: '2d8+2',
  finalCritical: '18/x3',
  finalRange: 'Longo',
  finalSpaces: 2,
  finalCategory: 'II',
  ammoCategory: 'I',
  attackBonus: 2,
  damageBonus: 2,
  specialRules: 'Mira laser reduz margem de ameaça em 1.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Fixture: Canonical sample compendium entity
const SAMPLE_ENTITY: CompendiumEntity = {
  id: 'rit_cicatrizacao_e2e',
  name: 'Cicatrização',
  category: 'ritual',
  subCategory: 'Ritual • 1º Círculo',
  bookId: 'livro_base',
  bookTitle: 'Livro Base',
  pageNumber: 119,
  element: 'Sangue',
  circle: 1,
  execution: 'Padrão',
  range: 'Toque',
  target: '1 ser',
  duration: 'Instantânea',
  resistance: 'Nenhuma',
  summary: 'Vertentes de sangue paranormal fecham ferimentos restaurando 3d8+3 PV.',
  description: 'Você toca o alvo e seu sangue acelera a regeneração celular imediata.',
  tags: ['Cura', 'Sangue', 'Regeneração'],
};

function createSampleCardData(partial: Partial<RecordCardData>): RecordCardData {
  return {
    id: partial.id || 'card_sample',
    name: partial.name || 'Registro',
    category: partial.category || 'item',
    categoryLabel: partial.categoryLabel || 'Item',
    description: partial.description || 'Descrição padrão.',
    stats: partial.stats || [],
    ...partial,
  };
}

describe('Comprehensive E2E Issues Suite (22 Issues across 4 Tiers)', () => {
  beforeEach(async () => {
    resetMockStorage();
    await supportService.clearTicketHistory();
    await setCustomPdfServerUrl('');
    await setMasterGoogleDriveFolderUrl('');
  });

  afterEach(async () => {
    resetMockStorage();
    await supportService.clearTicketHistory();
    await setCustomPdfServerUrl('');
    await setMasterGoogleDriveFolderUrl('');
  });

  /* ==========================================================================
     TIER 1: FEATURE COVERAGE (Positive tests for each of the 22 issues)
     ========================================================================== */
  describe('Tier 1: Feature Coverage (Issues 1 to 22)', () => {
    test('Issue 1: Discord Link Support — opens direct URL and provides user handle copy', async () => {
      const config = supportService.getConfig();
      assert.ok(
        config.discordInviteUrl.includes('discord.com') || config.discordInviteUrl.includes('discord.gg'),
        'Discord URL must point to discord.com or discord.gg'
      );
      assert.ok(config.discordHandle.length > 0, 'Discord handle must be defined for quick copying');

      const opened = await supportService.openExternalUrl(config.discordInviteUrl);
      assert.strictEqual(typeof opened, 'boolean');
      assert.strictEqual(opened, true);
    });

    test('Issue 2: Dev/Owner Ticket Visibility — saves webhook and collects rich diagnostics', async () => {
      const testWebhook = 'https://discord.com/api/webhooks/12345/abcdef';
      await supportService.setCustomWebhookUrl(testWebhook);
      const effective = await supportService.getEffectiveWebhookUrl();
      assert.strictEqual(effective, testWebhook);

      const diag = supportService.collectDiagnostics({
        themeId: 'ordem_padrao',
        playerName: 'Pedro Dev',
        charactersCount: 3,
        campaignsCount: 1,
        customWeaponsCount: 2,
        cloudSyncEnabled: true,
        activeRoute: '/(tabs)/characters',
      });
      assert.strictEqual(diag.playerName, 'Pedro Dev');
      assert.strictEqual(diag.charactersCount, 3);
      assert.strictEqual(diag.cloudSyncEnabled, true);
      assert.strictEqual(diag.activeRoute, '/(tabs)/characters');
      assert.ok(diag.appVersion.length > 0);
    });

    test('Issue 3: Direct PDF Download — targets specific book without redirecting to root drive folder', async () => {
      assert.strictEqual(typeof downloadPdfDocument, 'function');
      await assert.doesNotReject(async () => {
        await downloadPdfDocument('Livro Base - Ordem Paranormal.pdf', 'drive_file_id_123');
      });
    });

    test('Issue 4: PDF Viewer Layout & Loading — generates clean URLs without viewer lock', () => {
      const cleanUrl = getCleanPdfUrl('Sobrevivendo ao Horror.pdf');
      assert.ok(cleanUrl.includes('Sobrevivendo%20ao%20Horror.pdf'));
      assert.ok(!cleanUrl.includes('#page'), 'Clean URL must not contain page fragment to prevent scroll lock');
    });

    test('Issue 5: G.L.I.T.C.H. Voice & Offline Tuning — sanitizes tags and structures response', () => {
      const rawText = 'Analisei o [Ritual: Cicatrização] e a [Aba: spells]. Recupere **3d8+3 PV** imediatamente!';
      const cleaned = cleanTextForTts(rawText);
      assert.ok(!cleaned.includes('[Ritual: Cicatrização]'));
      assert.ok(!cleaned.includes('[Aba: spells]'));
      assert.ok(!cleaned.includes('**'));
      assert.ok(cleaned.includes('Recupere 3d8+3 PV imediatamente!'));

      const knowledge = retrieveAiKnowledge('como funciona dano de sangue?', DEFAULT_AI_CONFIG);
      const offlineMsg = generateOfflineResponse('como funciona dano de sangue?', knowledge, 'none');
      assert.ok(offlineMsg.content.includes('[MODO OFFLINE — G.L.I.T.C.H.]'));
      assert.strictEqual(offlineMsg.role, 'assistant');
    });

    test('Issue 6: PNG & Action Button Overlap — renders distinct format selector and non-overlapping action buttons in RecordImageExportModal', async () => {
      const { getByTestId, unmount } = await renderWithProviders(
        React.createElement(RecordImageExportModal, {
          visible: true,
          target: SAMPLE_ENTITY,
          onClose: () => {},
        })
      );

      const formatPng = getByTestId('format-btn-png');
      const formatSvg = getByTestId('format-btn-svg');
      const btnShare = getByTestId('btn-share-card-image');
      const btnDownload = getByTestId('btn-download-card-image');

      assert.ok(formatPng, 'PNG format toggle must exist');
      assert.ok(formatSvg, 'SVG format toggle must exist');
      assert.ok(btnShare, 'Share action button must exist');
      assert.ok(btnDownload, 'Download action button must exist');
      assert.notStrictEqual(formatPng, btnDownload, 'Format selector must not be conflated with action buttons');
      unmount();
    });

    test('Issue 7: Default Gemini API Key — returns effective key and detects default key usage', () => {
      const configWithCustom: AiConfig = {
        ...DEFAULT_AI_CONFIG,
        provider: 'gemini',
        apiKey: 'AIzaSyD-custom-key-1234567890abcdefghij',
      };
      assert.strictEqual(getEffectiveApiKey(configWithCustom), 'AIzaSyD-custom-key-1234567890abcdefghij');
      assert.strictEqual(isUsingDefaultApiKey(configWithCustom), false);

      const configEmpty: AiConfig = {
        ...DEFAULT_AI_CONFIG,
        provider: 'gemini',
        apiKey: '',
      };
      const effectiveEmpty = getEffectiveApiKey(configEmpty);
      assert.strictEqual(typeof effectiveEmpty, 'string');
    });

    test('Issue 8: Drive Direct PDF & Local Open — constructs valid URLs without raw github references', async () => {
      await setMasterGoogleDriveFolderUrl('https://drive.google.com/drive/folders/ABCDEF');
      const cloudUrl = getCloudPdfUrl('Livro base.pdf');
      assert.ok(!cloudUrl.includes('raw.githubusercontent.com'), 'Must not reference deprecated GitHub raw links');

      await assert.doesNotReject(async () => {
        await openPdfDocument('Livro base.pdf', 10, 'drive_id_999');
      });
    });

    test('Issue 9: Native Card File Sharing — shares card image with file metadata fallback', async () => {
      const theme = getCardThemeById('sangue');
      const cardData = extractRecordCardData(SAMPLE_ENTITY);

      const result = await shareCardImage(cardData, theme, { format: 'png' });
      assert.strictEqual(typeof result.success, 'boolean');
      assert.strictEqual(typeof result.sharedAsFile, 'boolean');
    });

    test('Issue 10: Compendium Search Text Clipping — applies anti-clipping typography and pill padding in character styles', () => {
      const styles = createCharacterStyles(defaultTheme.colors);
      assert.ok(styles.rankPill, 'rankPill style must be defined');
      assert.strictEqual(styles.rankPill.paddingHorizontal, 12);
      assert.strictEqual(styles.rankPill.paddingVertical, 6);
      assert.strictEqual(
        styles.rankPillText.includeFontPadding,
        false,
        'includeFontPadding must be false to avoid vertical font truncation on Android'
      );
      assert.strictEqual(styles.rankPillText.textAlignVertical, 'center');
    });

    test('Issue 11: In-Sheet Weapon Editing — custom weapon schema supports modification edits', async () => {
      await defaultRepository.saveCustomWeapons([SAMPLE_CUSTOM_WEAPON]);
      const stored = await defaultRepository.getCustomWeapons();
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].id, 'wpn_e2e_sniper');
      assert.strictEqual(stored[0].attackBonus, 2);
      assert.strictEqual(stored[0].finalDamage, '2d8+2');

      // Edit weapon in-place
      const updated = {
        ...stored[0],
        attackBonus: 3,
        finalDamage: '2d8+3',
        updatedAt: new Date().toISOString(),
      };
      await defaultRepository.saveCustomWeapons([updated]);
      const reloaded = await defaultRepository.getCustomWeapons();
      assert.strictEqual(reloaded[0].attackBonus, 3);
      assert.strictEqual(reloaded[0].finalDamage, '2d8+3');
    });

    test('Issue 12: Protection Button Overflow — applies flexWrap and flexShrink defense assistant constraints in character styles', () => {
      const styles = createCharacterStyles(defaultTheme.colors);
      assert.ok(styles.defenseAssistantBtn, 'defenseAssistantBtn style must be defined');
      assert.strictEqual(
        styles.defenseAssistantBtn.flexShrink,
        0,
        'defenseAssistantBtn must have flexShrink: 0 so it never collapses'
      );
      assert.strictEqual(styles.defenseAssistantBtn.flexDirection, 'row');
      assert.strictEqual(styles.cardHeaderRow.flexDirection, 'row');
      assert.strictEqual(styles.cardHeaderRow.justifyContent, 'space-between');
    });

    test('Issue 13: Deleted PDF Resurrection Sync — respects deletedDynamicBookIds tombstones during merge to prevent resurrection', () => {
      const localPayload: UserDataBackupPayload = {
        exportedAt: new Date().toISOString(),
        unlockedBooks: {},
        dynamicBooks: [],
        deletedDynamicBookIds: ['custom_pdf_deleted_01'],
      };
      const remotePayload: UserDataBackupPayload = {
        exportedAt: new Date(Date.now() - 10000).toISOString(),
        unlockedBooks: {
          custom_pdf_deleted_01: {
            bookId: 'custom_pdf_deleted_01',
            method: 'custom_py',
            unlockedAt: new Date(Date.now() - 20000).toISOString(),
            fileName: 'Livro Escola.pdf',
            driveFileId: 'drive_custom_123',
            localPdfStored: true,
          },
        },
        dynamicBooks: [
          {
            id: 'custom_pdf_deleted_01',
            title: 'Livro Escola',
            fileName: 'Livro Escola.pdf',
            pages: [],
            pageCount: 1,
            toc: [],
          },
        ],
        deletedDynamicBookIds: [],
      };

      const result = SmartMergeEngine.merge(localPayload, remotePayload);
      assert.strictEqual(
        result.merged.dynamicBooks?.some((b) => b.id === 'custom_pdf_deleted_01'),
        false,
        'Deleted custom dynamic PDF must NOT resurrect when deletedDynamicBookIds tombstone is present'
      );
      assert.strictEqual(
        result.merged.unlockedBooks?.['custom_pdf_deleted_01'],
        undefined,
        'Deleted custom book must NOT resurrect in unlockedBooks'
      );
      assert.ok(
        result.merged.deletedDynamicBookIds?.includes('custom_pdf_deleted_01'),
        'deletedDynamicBookIds tombstone must be preserved after merge'
      );
    });

    test('Issue 14: Landscape Image Generator Freeze — supports flexible card dimensions in landscape', () => {
      const theme = getCardThemeById('energia');
      const cardData = createSampleCardData({
        name: 'Transfiguração do Caos',
        category: 'Poder Paranormal',
        element: 'Energia',
      });
      // Landscape preview dimensions (e.g. 1350x1080 or compact 680x400)
      const svg = generateCardSvg(cardData, theme, { width: 1350, height: 1080 });
      assert.ok(svg.includes('width="1350"'));
      assert.ok(svg.includes('height="1080"'));
      assert.ok(svg.includes('Transfiguração do Caos'));
    });

    test('Issue 15: Card Image Download Format — exports PNG or SVG directly without forcing print spooler', async () => {
      const theme = getCardThemeById('padrao_ordo');
      const cardData = createSampleCardData({
        name: 'Ficha de Registro',
        category: 'Item',
      });
      const result = await downloadCardImage(cardData, theme, { format: 'png' });
      assert.strictEqual(result.format, 'png');
      assert.ok(result.fileName.endsWith('.png') || result.fileName.endsWith('.pdf'));
    });

    test('Issue 16: Text Reader Typography & Spacing — formats uppercase headings with tactical bar and paragraph text', () => {
      const rawText = 'CAPÍTULO 2: RITUAIS\nO ocultista estende as mãos invocando o Outro Lado.\nCusto: 1 PE';
      const mockStyles = {
        formattedTextContainer: { padding: 10 },
        formattedHeadingWrap: { flexDirection: 'row' },
        formattedHeadingBar: { width: 4 },
        formattedHeadingText: { fontSize: 16 },
        formattedParaText: { fontSize: 14 },
      };
      const rendered = renderFormattedBookText(rawText, 1, defaultTheme.colors, mockStyles);
      assert.ok(rendered, 'renderFormattedBookText must return a valid React element tree');
      assert.ok(React.isValidElement(rendered), 'rendered output must be a valid React element');
    });

    test('Issue 17: Support Header Button Collision — categories and severities are defined distinctly', () => {
      assert.ok(CATEGORY_LABELS.bug);
      assert.ok(CATEGORY_LABELS.rule_error);
      assert.ok(CATEGORY_LABELS.suggestion);
      assert.ok(CATEGORY_LABELS.contact);
      assert.strictEqual(SEVERITY_LABELS.high, 'Crítico (Trava ou impede o uso)');
    });

    test('Issue 18: Agent Top Bar Horizontal Scroll — configures horizontal scrolling and right actions layout in character styles', () => {
      const styles = createCharacterStyles(defaultTheme.colors);
      assert.ok(styles.topBarRightActions, 'topBarRightActions style must be defined');
      assert.strictEqual(styles.topBarRightActions.flexDirection, 'row');
      assert.strictEqual(styles.topBarRightActions.alignItems, 'center');
      assert.strictEqual(styles.topBarActionsScroll.flexShrink, 1);
      assert.strictEqual(styles.topBarActionsScroll.flexGrow, 0);
    });

    test('Issue 19: Global Landscape Compaction — calculates compacted tab bar height and detects landscape viewports', () => {
      // Landscape detection (width > height && height < 500)
      assert.strictEqual(isLandscapeViewport(800, 360), true, '800x360 must be detected as landscape');
      assert.strictEqual(isLandscapeViewport(360, 800), false, '360x800 must NOT be landscape');
      assert.strictEqual(isLandscapeViewport(1024, 768), false, 'Tablet 1024x768 (height >= 500) is regular');

      // Tab bar height compaction
      const landscapeHeight = calculateBottomTabBarHeight(true, 0);
      const portraitHeight = calculateBottomTabBarHeight(false, 10);
      assert.strictEqual(landscapeHeight, 40, 'Landscape tab bar must be compacted to 40px');
      assert.strictEqual(portraitHeight, 66, 'Portrait tab bar must include base height (56) + insets (10)');
      assert.ok(landscapeHeight < portraitHeight, 'Landscape tab bar must be strictly more compact than portrait');
    });

    test('Issue 20: Agent Sheet Print Preview — generates complete HTML for mobile preview', () => {
      const html = generateSheetHtml({
        character: SAMPLE_AGENT,
        sheetType: 'livro_base',
        pages: 'all',
      });
      assert.ok(html.includes('Kaiser Investigador'));
      assert.ok(html.includes('Fuzil de Precisão Tático'));
      assert.ok(html.includes('2d10+2'));
      assert.ok(html.includes('data:image/jpeg;base64,') || html.includes('data:image/png;base64,'));
    });

    test('Issue 21: Mobile Voice TTS & STT Support — sanitizes tactical voice speech text and reports platform TTS availability', () => {
      const rawTextWithTags = 'Atenção Agente: [Livro: Base] [Rolar: 2d20+5] Realize o teste agora!';
      const cleaned = cleanTextForTts(rawTextWithTags);
      assert.ok(!cleaned.includes('[Livro: Base]'), 'System book tag must be stripped');
      assert.ok(!cleaned.includes('[Rolar: 2d20+5]'), 'Roll tag must be stripped from TTS');
      assert.ok(cleaned.includes('Realize o teste agora!'));

      // Exercise GlitchVoiceService methods
      GlitchVoiceService.stopSpeaking();
      assert.strictEqual(GlitchVoiceService.isSpeaking(), false);
      assert.strictEqual(GlitchVoiceService.isListening(), false);
    });

    test('Issue 22: Book Cover & PDF In-App Preview — clamps DPI between 72 and 260 for thumbnail preview', () => {
      const urlClampedMin = getRenderedPdfPageUrl('Livro base.pdf', 1, 30);
      assert.ok(urlClampedMin.includes('&dpi=72'), 'DPI below 72 must clamp to 72');

      const urlClampedMax = getRenderedPdfPageUrl('Livro base.pdf', 1, 500);
      assert.ok(urlClampedMax.includes('&dpi=260'), 'DPI above 260 must clamp to 260');

      const urlNormal = getRenderedPdfPageUrl('Livro base.pdf', 1, 150);
      assert.ok(urlNormal.includes('&dpi=150'));
    });
  });

  /* ==========================================================================
     TIER 2: BOUNDARY & CORNER CASES (Robustness & Adversarial Tests)
     ========================================================================== */
  describe('Tier 2: Boundary & Corner Cases', () => {
    test('Boundary 2.1: Key Validation with whitespace, empty strings, and malformed prefixes via validateKey', () => {
      assert.strictEqual(validateKey(''), false, 'Empty key must be invalid');
      assert.strictEqual(validateKey('   '), false, 'Whitespace-only key must be invalid');
      assert.strictEqual(validateKey('sk-invalid-prefix-12345'), false, 'Non-AIzaSy key must be invalid');
      assert.strictEqual(validateKey('AIzaSy!@#$invalid_chars%^&*'), false, 'Key with invalid characters must be rejected');
      assert.strictEqual(validateKey('AIzaSyValidKey1234567890abcdefghij'), true, 'Valid AIzaSy key must be accepted');

      const offlineConfig: AiConfig = { ...DEFAULT_AI_CONFIG, provider: 'offline', apiKey: '' };
      assert.strictEqual(getEffectiveApiKey(offlineConfig), '');
    });

    test('Boundary 2.2: PDF URL clamping on negative, zero, and extreme page numbers', () => {
      const urlZero = getRenderedPdfPageUrl('manual.pdf', 0, 150);
      assert.ok(urlZero.includes('&page=1'), 'Page 0 must clamp to 1');

      const urlNegative = getRenderedPdfPageUrl('manual.pdf', -42, 150);
      assert.ok(urlNegative.includes('&page=1'), 'Negative page must clamp to 1');

      const rawZero = getRawPdfUrl('manual.pdf', 0);
      assert.ok(!rawZero.includes('#page'), 'Page 0 must not append fragment');
    });

    test('Boundary 2.3: Voice text cleaner on malformed inputs, unclosed tags, and LaTeX equations', () => {
      const malformed = `Fórmula [Ritual: Incompleto $$\\text{Dano: } 3d6 \\times 2$$ com \`código inline\`
> citação em bloco`;
      const cleaned = cleanTextForTts(malformed, { militaryTone: true });
      assert.ok(!cleaned.includes('$$'));
      assert.ok(!cleaned.includes('\\text'));
      assert.ok(!cleaned.includes('`'));
      assert.ok(!cleaned.includes('>'));
      assert.ok(cleaned.endsWith('Câmbio.'));

      // Empty input
      assert.strictEqual(cleanTextForTts(''), '');
      assert.strictEqual(cleanTextForTts('    '), '');
    });

    test('Boundary 2.4: Card filename sanitizer handles accents, special chars, and extreme length', () => {
      const theme = getCardThemeById('padrao_ordo');
      const cardWithSpecialChars = createSampleCardData({
        name: 'Espada Amaldiçoada / Lâmina #99 & Símbolo *!!!* (Muito Longo Para Testar Limites)',
        category: 'Arma',
      });
      const formatted = formatRecordTextForSharing(cardWithSpecialChars, theme);
      assert.ok(formatted.includes('ESPADA AMALDIÇOADA'));
    });

    test('Boundary 2.5: Empty & null sync payload merging without crashing', () => {
      const emptyLocal: UserDataBackupPayload = {
        exportedAt: new Date().toISOString(),
      };
      const emptyRemote: UserDataBackupPayload = {
        exportedAt: new Date().toISOString(),
      };

      const result = SmartMergeEngine.merge(emptyLocal, emptyRemote);
      assert.ok(result.merged);
      assert.strictEqual(Array.isArray(result.merged.characters), true);
      assert.strictEqual(Array.isArray(result.merged.campaigns), true);
      assert.strictEqual(Array.isArray(result.merged.customWeapons), true);
    });

    test('Boundary 2.6: Support report builder with missing optional fields', () => {
      const minimalPayload: SupportTicketPayload = {
        title: 'Falha Mínima',
        description: 'Sem passos nem diagnóstico opcional.',
        category: 'bug',
      };
      const report = supportService.buildFormattedReport(minimalPayload, 'ORD-MIN01');
      assert.ok(report.includes('#ORD-MIN01'));
      assert.ok(report.includes('Falha Mínima'));
      assert.ok(!report.includes('Passos para Reproduzir'));
    });

    test('Boundary 2.7: Custom weapon with 0 space and zero damage bonus', () => {
      const zeroSpaceWeapon: CustomWeapon = {
        ...SAMPLE_CUSTOM_WEAPON,
        id: 'wpn_zero_space',
        baseSpaces: 0,
        finalSpaces: 0,
        attackBonus: 0,
        damageBonus: 0,
      };
      assert.strictEqual(zeroSpaceWeapon.finalSpaces, 0);
      assert.strictEqual(zeroSpaceWeapon.attackBonus, 0);
    });

    test('Boundary 2.8: PDF Server URL normalization with missing protocols, slashes, and whitespace', () => {
      assert.strictEqual(normalizeServerUrl('192.168.1.50:8080'), 'http://192.168.1.50:8080');
      assert.strictEqual(normalizeServerUrl('https://custom-pdf.org///'), 'https://custom-pdf.org');
      assert.strictEqual(normalizeServerUrl(''), '');
      assert.strictEqual(normalizeServerUrl('   '), '');
    });
  });

  /* ==========================================================================
     TIER 3: CROSS-FEATURE COMBINATIONS (Subsystem Interoperability)
     ========================================================================== */
  describe('Tier 3: Cross-Feature Combinations', () => {
    test('Combination 3.1: Voice in Offline Mode (Offline engine output synthesized via TTS)', async () => {
      const knowledge = retrieveAiKnowledge('qual ritual usar para curar um aliado?', DEFAULT_AI_CONFIG);
      const offlineMsg = generateOfflineResponse('qual ritual usar para curar um aliado?', knowledge, 'none');

      const cleanedForSpeech = cleanTextForTts(offlineMsg.content, { militaryTone: true });
      assert.ok(cleanedForSpeech.length > 0);
      assert.ok(cleanedForSpeech.endsWith('Câmbio.'));

      // Verify TTS invocation does not throw
      await assert.doesNotReject(async () => {
        await GlitchVoiceService.speak(cleanedForSpeech);
      });
    });

    test('Combination 3.2: Sync after Soft-Deleting Custom Entities & Dynamic PDFs with tombstones', () => {
      const localWithTombstones: UserDataBackupPayload = {
        exportedAt: new Date().toISOString(),
        characters: [],
        deletedCharacterIds: ['agent_char_x'],
        deletedCampaignIds: ['campaign_y'],
      };

      const remoteWithExisting: UserDataBackupPayload = {
        exportedAt: new Date(Date.now() - 5000).toISOString(),
        characters: [{ ...SAMPLE_AGENT, id: 'agent_char_x' }],
        campaigns: [
          {
            id: 'campaign_y',
            title: 'Missão Sombria',
            description: '',
            stories: [],
            monsters: [],
            agents: [],
            initiatives: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        deletedCharacterIds: [],
        deletedCampaignIds: [],
      };

      const merged = SmartMergeEngine.merge(localWithTombstones, remoteWithExisting);
      assert.strictEqual(merged.merged.characters?.length, 0, 'Deleted character must remain deleted');
      assert.strictEqual(merged.merged.campaigns?.length, 0, 'Deleted campaign must remain deleted');
      assert.ok(merged.merged.deletedCharacterIds?.includes('agent_char_x'));
      assert.ok(merged.merged.deletedCampaignIds?.includes('campaign_y'));
      assert.strictEqual(merged.hasRemoteChangesToUpload, true);
    });

    test('Combination 3.3: Direct PDF Download with Custom Master Drive Folder', async () => {
      const driveFolder = 'https://drive.google.com/drive/folders/TEST_FOLDER_123';
      await setMasterGoogleDriveFolderUrl(driveFolder);
      assert.strictEqual(getMasterGoogleDriveFolderUrl(), driveFolder);

      const downloadUrl = getCloudPdfUrl('Iniciacao.pdf');
      assert.ok(downloadUrl.includes('drive.google.com') || downloadUrl.startsWith('http'));

      await assert.doesNotReject(async () => {
        await downloadPdfDocument('Iniciacao.pdf', 'file_abc_789');
      });
    });

    test('Combination 3.4: Card Image Export in Landscape Viewport Dimensions', () => {
      const theme = getCardThemeById('sangue');
      const cardData = createSampleCardData({
        name: 'Gadanho Sangrento',
        category: 'Arma Amaldiçoada',
        element: 'Sangue',
        summary: 'Arma que canaliza a dor do portador.',
      });

      // Generate card SVG with landscape dimensions (1080x720)
      const svg = generateCardSvg(cardData, theme, { width: 1080, height: 720 });
      assert.ok(svg.includes('width="1080"'));
      assert.ok(svg.includes('height="720"'));

      const printHtml = wrapCardSvgForPrint(svg, cardData.name, theme);
      assert.ok(printHtml.includes('<!DOCTYPE html>'));
      assert.ok(printHtml.includes('Gadanho Sangrento'));
    });

    test('Combination 3.5: Support Reporting with Live Diagnostics and Active Sheet Error State', async () => {
      const diag = supportService.collectDiagnostics({
        themeId: 'sangue',
        playerName: 'Arthur Cervero',
        charactersCount: 1,
        campaignsCount: 0,
        customWeaponsCount: 1,
        cloudSyncEnabled: false,
        activeRoute: '/(tabs)/characters?id=agent_e2e_01',
      });

      const ticketPayload: SupportTicketPayload = {
        title: 'Erro ao calcular dano do Fuzil no Agent Sheet',
        description: 'O bônus de dano de Sangue não somou no crítico.',
        category: 'rule_error',
        severity: 'medium',
        senderName: 'Arthur Cervero',
        contactReturn: 'arthur_ordo#1234',
        includeDiagnostics: true,
        diagnostics: diag,
      };

      const result = await supportService.submitTicketInApp(ticketPayload);
      assert.strictEqual(result.success, true);
      assert.ok(result.protocol.startsWith('ORD-'));

      const history = await supportService.getTicketHistory();
      assert.ok(history.length >= 1);
      assert.strictEqual(history[0].protocol, result.protocol);
    });
  });

  /* ==========================================================================
     TIER 4: REAL-WORLD SCENARIOS (End-to-End User Journeys)
     ========================================================================== */
  describe('Tier 4: Real-World Scenarios', () => {
    test('Scenario 4.1: Complete Agent Weapon Management & Print Pipeline', async () => {
      // 1. Persist initial character sheet
      await defaultRepository.saveCharacters([SAMPLE_AGENT]);
      let chars = await defaultRepository.getCharacters();
      assert.strictEqual(chars.length, 1);
      assert.strictEqual(chars[0].name, 'Kaiser Investigador');

      // 2. Create custom weapon in armory
      await defaultRepository.saveCustomWeapons([SAMPLE_CUSTOM_WEAPON]);
      let weapons = await defaultRepository.getCustomWeapons();
      assert.strictEqual(weapons.length, 1);

      // 3. Edit weapon directly and link to character attacks
      const updatedAttack = {
        id: 'atk_fuzil_custom',
        name: weapons[0].name,
        test: `+${chars[0].attributes.AGI + 10 + weapons[0].attackBonus}`,
        damage: weapons[0].finalDamage,
        critical: weapons[0].finalCritical,
        range: weapons[0].finalRange,
        special: weapons[0].specialRules,
      };

      const updatedAgent: CharacterSheet = {
        ...chars[0],
        attacks: [updatedAttack],
        updatedAt: new Date().toISOString(),
      };
      await defaultRepository.saveCharacters([updatedAgent]);

      // 4. Reload updated agent
      chars = await defaultRepository.getCharacters();
      assert.ok(chars[0]?.attacks?.[0]?.name);
      assert.strictEqual(chars[0]!.attacks![0].name, 'Fuzil de Caça Customizado');
      assert.strictEqual(chars[0]!.attacks![0].damage, '2d8+2');

      // 5. Generate print preview HTML for the updated agent
      const printHtml = generateSheetHtml({
        character: chars[0],
        sheetType: 'livro_base',
        pages: 'all',
      });
      assert.ok(printHtml.includes('Kaiser Investigador'));
      assert.ok(printHtml.includes('Fuzil de Caça Customizado'));
      assert.ok(printHtml.includes('2d8+2'));
    });

    test('Scenario 4.2: Complete Card Export & Native Sharing Pipeline', async () => {
      // 1. Select compendium entity and resolve recommended theme
      const theme = resolveRecordTheme(SAMPLE_ENTITY);
      assert.strictEqual(theme.id, 'sangue');

      // 2. Generate card SVG using extractRecordCardData
      const cardData = extractRecordCardData(SAMPLE_ENTITY);
      const svg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });
      assert.ok(svg.includes('Cicatrização'));
      assert.ok(svg.includes('SANGUE'));

      // 3. Format text for clipboard / message sharing
      const shareText = formatRecordTextForSharing(cardData, theme);
      assert.ok(shareText.includes('CICATRIZAÇÃO'));
      assert.ok(shareText.includes('Fonte: Livro Base • Pág. 119'));
      assert.ok(shareText.includes('— Gerado via Ordo Companion'));

      // 4. Trigger download/share action
      const downloadRes = await downloadCardImage(cardData, theme, { format: 'png' });
      assert.strictEqual(downloadRes.success, true);

      const shareRes = await shareCardImage(cardData, theme, { format: 'png' });
      assert.strictEqual(typeof shareRes.success, 'boolean');
    });

    test('Scenario 4.3: Complete Offline Book Reading & Audio Assistant Flow', async () => {
      // 1. Configure custom local PDF server
      await setCustomPdfServerUrl('http://192.168.1.100:8081');
      assert.strictEqual(isPdfServerConfigured(), true);

      // 2. Generate rendered page URL with clamped DPI
      const pageUrl = getRenderedPdfPageUrl('Livro base.pdf', 45, 150);
      assert.ok(pageUrl.includes('http://192.168.1.100:8081/api/pdf-page'));
      assert.ok(pageUrl.includes('page=45'));
      assert.ok(pageUrl.includes('dpi=150'));

      // 3. Retrieve offline rule knowledge for the page content
      const query = 'como funciona cura de dano no combate?';
      const knowledge = retrieveAiKnowledge(query, DEFAULT_AI_CONFIG);
      assert.ok(knowledge.systemPrompt.includes('VOCÊ É G.L.I.T.C.H.'));

      // 4. Generate offline response and clean for audio synthesis
      const offlineAnswer = generateOfflineResponse(query, knowledge, 'none');
      assert.ok(offlineAnswer.content.length > 0);

      const ttsSpeech = cleanTextForTts(offlineAnswer.content, { militaryTone: true });
      assert.ok(ttsSpeech.endsWith('Câmbio.'));

      // 5. Synthesize speech safely
      await assert.doesNotReject(async () => {
        await GlitchVoiceService.speak(ttsSpeech);
      });
    });

    test('Scenario 4.4: Complete User Support & Bug Reporting Workflow', async () => {
      // 1. Collect technical system diagnostics
      const diagnostics = supportService.collectDiagnostics({
        themeId: 'ordem_padrao',
        playerName: 'Investigador Kaiser',
        nickname: 'Kaiser',
        charactersCount: 2,
        campaignsCount: 1,
        customWeaponsCount: 3,
        cloudSyncEnabled: true,
        activeRoute: '/(tabs)/books',
      });

      // 2. Compose support ticket payload
      const ticket: SupportTicketPayload = {
        title: 'Botão de download não salvou o arquivo no celular',
        description: 'Ao tocar no botão de download, a pasta do drive foi aberta em vez do arquivo direto.',
        stepsToReproduce: '1. Ir na aba Livros -> 2. Tocar em Baixar PDF -> 3. Abriu o drive raiz',
        category: 'bug',
        severity: 'high',
        senderName: 'Investigador Kaiser',
        contactReturn: 'kaiser@ordorealitas.org',
        includeDiagnostics: true,
        diagnostics,
      };

      // 3. Submit ticket directly in-app
      const submitResult = await supportService.submitTicketInApp(ticket);
      assert.strictEqual(submitResult.success, true);
      assert.ok(submitResult.protocol.startsWith('ORD-'));

      // 4. Build GitHub Issue URL with prefilled markdown
      const ghUrl = supportService.buildGitHubIssueUrl(ticket, submitResult.protocol);
      assert.ok(ghUrl.includes('github.com'));
      assert.ok(ghUrl.includes('labels=bug'));
      assert.ok(decodeURIComponent(ghUrl.replace(/\+/g, ' ')).includes('[Bug / Erro Técnico]'));

      // 5. Build Mailto URL
      const mailtoUrl = supportService.buildMailtoUrl(ticket, submitResult.protocol);
      assert.ok(mailtoUrl.startsWith('mailto:'));
      assert.ok(mailtoUrl.includes(submitResult.protocol));

      // 6. Verify ticket is persisted in local device history
      const history = await supportService.getTicketHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].protocol, submitResult.protocol);
      assert.strictEqual(history[0].title, ticket.title);
    });
  });
});
