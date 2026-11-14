import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { generateCardSvg, getSvgDimensions } from './svgCardRenderer';
import { CardThemeDefinition, ExportCardOptions, RecordCardData } from './types';
import { getCardThemeById } from './themeRegistry';
import { utf8ToBase64 } from '../../utils/agentSharing';

interface FileSystemCompat {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  copyAsync?: (options: { from: string; to: string }) => Promise<void>;
  readAsStringAsync?: (
    uri: string,
    options?: { encoding?: 'utf8' | 'base64' | string }
  ) => Promise<string>;
  writeAsStringAsync?: (
    uri: string,
    contents: string,
    options?: { encoding?: 'utf8' | 'base64' | string }
  ) => Promise<void>;
  StorageAccessFramework?: {
    requestDirectoryPermissionsAsync?: () => Promise<{
      granted: boolean;
      directoryUri: string;
    }>;
    createFileAsync?: (
      parentUri: string,
      fileName: string,
      mimeType: string
    ) => Promise<string>;
  };
}

const fs = FileSystem as unknown as FileSystemCompat;

function getSafeCacheDirectory(): string {
  const dir = fs.cacheDirectory || fs.documentDirectory || 'file:///mock-cache/';
  return dir.endsWith('/') ? dir : `${dir}/`;
}

/**
 * Normaliza os dados do registro garantindo integridade defensiva contra
 * propriedades ausentes ou parciais (ex.: stats, description, tags).
 */
export function normalizeRecordCardData(
  data: RecordCardData | Partial<RecordCardData>
): RecordCardData {
  const name = data?.name || 'Registro';
  const rawCat = data?.category || 'compendium';
  const categoryStr = typeof rawCat === 'string' ? rawCat : 'compendium';
  const categoryLabel = data?.categoryLabel || categoryStr.toUpperCase();

  return {
    id: data?.id || 'record_card',
    name,
    category: rawCat,
    categoryLabel,
    subCategory: data?.subCategory,
    element: data?.element,
    bookTitle: data?.bookTitle,
    pageNumber: data?.pageNumber,
    stats: Array.isArray(data?.stats) ? data.stats : [],
    summary: data?.summary,
    description: data?.description || '',
    extraSections: Array.isArray(data?.extraSections) ? data.extraSections : [],
    tags: Array.isArray(data?.tags) ? data.tags : [],
    motto: data?.motto,
  };
}

/**
 * Sanitiza nome para arquivo seguro em qualquer sistema operacional
 */
function sanitizeFileName(name: string): string {
  return (name || 'registro')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
}

/**
 * Converte string SVG em PNG Data URL (no navegador / Web)
 */
export async function svgToPngDataUrl(
  svgString: string,
  width = 1080,
  height = 1350
): Promise<string> {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof Image === 'undefined') {
    // Fallback para ambientes não-DOM ou mobile
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(svgDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const pngUrl = canvas.toDataURL('image/png');
          resolve(pngUrl);
        } catch (canvasErr) {
          console.warn('Canvas conversion fallback to SVG:', canvasErr);
          resolve(svgDataUrl);
        }
      };

      img.onerror = (err) => {
        console.warn('Image render fallback to SVG:', err);
        resolve(svgDataUrl);
      };

      img.src = svgDataUrl;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Converte dataUrl base64 em Blob para Web Share API
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(';base64,');
    if (parts.length !== 2) return null;
    const contentType = parts[0].replace('data:', '');
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: contentType });
  } catch {
    return null;
  }
}

/**
 * Empacota o SVG em uma página HTML autônoma de alta definição para impressão / salvar PDF no Android/iOS
 */
export function wrapCardSvgForPrint(
  svgString: string,
  title: string,
  theme: CardThemeDefinition
): string {
  const bgColor = theme.colors.bgGradientStart || '#05070B';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Ordo Realitas</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    @page {
      size: auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background-color: ${bgColor};
      display: flex;
      justify-content: center;
      align-items: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card-wrapper {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    svg {
      width: 100%;
      height: auto;
      max-height: 94vh;
      display: block;
    }
  </style>
</head>
<body>
  <div class="card-wrapper">
    ${svgString}
  </div>
</body>
</html>`;
}

/**
 * Formata os dados do registro como texto estilizado para Discord ou WhatsApp
 */
export function formatRecordTextForSharing(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme?: CardThemeDefinition
): string {
  const activeTheme = theme || getCardThemeById('padrao_ordo');
  const data = normalizeRecordCardData(rawInput);
  const parts: string[] = [];
  const glyph = activeTheme.elementGlyph ? `${activeTheme.elementGlyph} ` : '';

  parts.push(`*${glyph}${(data.name || 'REGISTRO').toUpperCase()}*`);
  parts.push(`Categoria: ${data.categoryLabel || data.category}${data.subCategory ? ` • ${data.subCategory}` : ''}`);
  if (data.element) {
    parts.push(`Elemento: ${data.element}`);
  }
  if (data.bookTitle) {
    parts.push(`Fonte: ${data.bookTitle}${data.pageNumber ? ` • Pág. ${data.pageNumber}` : ''}`);
  }

  if (data.stats && data.stats.length > 0) {
    parts.push('');
    parts.push('━━━ PARÂMETROS ━━━');
    for (const st of data.stats) {
      parts.push(`• ${st.label}: ${st.value}`);
    }
  }

  if (data.summary) {
    parts.push('');
    parts.push(`> _"${data.summary}"_`);
  }

  if (data.description) {
    parts.push('');
    parts.push('━━━ DESCRIÇÃO ━━━');
    parts.push(data.description);
  }

  if (data.extraSections && data.extraSections.length > 0) {
    for (const sec of data.extraSections) {
      parts.push('');
      parts.push(`[${sec.title.toUpperCase()}]`);
      parts.push(sec.content);
    }
  }

  parts.push('');
  parts.push(`_${activeTheme.motto}_`);
  parts.push('— Gerado via Ordo Companion');

  return parts.join('\n');
}

/**
 * Empacota o SVG com dimensões exatas de cartão (1080x1350) e margens zeradas
 * para geração fiel de arquivo sem margens brancas de folha A4.
 */
export function wrapCardSvgExactDimensions(
  svgString: string,
  title: string,
  theme?: CardThemeDefinition,
  width = 1080,
  height = 1350
): string {
  const safeTheme = theme || getCardThemeById('padrao_ordo');
  const bgColor = safeTheme.colors?.bgGradientStart || '#05070B';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Ordo Realitas</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    @page {
      size: ${width}px ${height}px;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: ${bgColor};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card-wrapper {
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    svg {
      width: ${width}px;
      height: ${height}px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="card-wrapper">
    ${svgString}
  </div>
</body>
</html>`;
}

/**
 * Captura a View nativa do card (RecordImageCard) como arquivo PNG real usando react-native-view-shot.
 * Retorna null com segurança caso o módulo nativo não esteja disponível (ex.: Web, testes ou APK antigo).
 */
export async function captureCardViewToPng(viewRef: unknown): Promise<string | null> {
  if (!viewRef || Platform.OS === 'web') return null;
  try {
    const RN = require('react-native');
    const hasNativeModule = Boolean(
      RN?.TurboModuleRegistry?.get?.('RNViewShot') || RN?.NativeModules?.RNViewShot
    );
    if (!hasNativeModule) return null;

    const viewShot = require('react-native-view-shot');
    const captureFn = viewShot?.captureRef || viewShot?.default?.captureRef;
    if (typeof captureFn !== 'function') return null;

    const uri = await captureFn(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return typeof uri === 'string' && uri.length > 0 ? uri : null;
  } catch (err) {
    console.warn('[cardExportService] Falha ao capturar view do card em PNG:', err);
    return null;
  }
}

/**
 * Gera um arquivo físico do cartão no armazenamento seguro local (cache).
 * Prioriza PNG real capturado da View nativa no Mobile ou Canvas no Web,
 * sem dependência de Node Buffer (inexistente no motor Hermes do Android).
 */
export async function generateLocalCardFile(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme: CardThemeDefinition,
  rawSvg: string,
  format: 'png' | 'svg',
  width: number,
  height: number,
  capturedPngUri?: string | null
): Promise<{ uri: string; fileName: string; mimeType: string }> {
  const data = normalizeRecordCardData(rawInput);
  const baseName = sanitizeFileName(data.name);
  const cacheDir = getSafeCacheDirectory();

  if (format === 'svg') {
    const fileName = `Ordo_${baseName}_${theme.id}.svg`;
    const fileUri = `${cacheDir}${fileName}`;
    if (fs.writeAsStringAsync) {
      await fs.writeAsStringAsync(fileUri, rawSvg, {
        encoding: 'utf8',
      });
    }
    return { uri: fileUri, fileName, mimeType: 'image/svg+xml' };
  }

  // format === 'png':
  const fileName = `Ordo_${baseName}_${theme.id}.png`;
  const fileUri = `${cacheDir}${fileName}`;

  if (capturedPngUri) {
    if (fs.copyAsync && capturedPngUri !== fileUri) {
      try {
        await fs.copyAsync({ from: capturedPngUri, to: fileUri });
        return { uri: fileUri, fileName, mimeType: 'image/png' };
      } catch {}
    }
    return { uri: capturedPngUri, fileName, mimeType: 'image/png' };
  }

  let pngDataUrl = '';
  try {
    pngDataUrl = await svgToPngDataUrl(rawSvg, width, height);
  } catch {}

  let base64 = '';
  if (pngDataUrl && pngDataUrl.startsWith('data:image/png;base64,')) {
    base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
  } else if (pngDataUrl && pngDataUrl.includes('base64,')) {
    base64 = pngDataUrl.split('base64,')[1];
  } else if (Platform.OS !== 'web' && typeof Print?.printToFileAsync === 'function') {
    // Fallback em APK caso o módulo nativo react-native-view-shot não esteja presente no binário:
    // gera documento PDF com dimensões exatas do card em vez de gravar SVG inválido em .png.
    try {
      const html = wrapCardSvgExactDimensions(rawSvg, data.name, theme, width, height);
      const printRes = await Print.printToFileAsync({
        html,
        width,
        height,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      if (printRes?.uri) {
        return {
          uri: printRes.uri,
          fileName: `Ordo_${baseName}_${theme.id}_card.pdf`,
          mimeType: 'application/pdf',
        };
      }
    } catch (printErr) {
      console.warn('[cardExportService] Fallback Print.printToFileAsync falhou:', printErr);
    }
    base64 = utf8ToBase64(rawSvg);
  } else {
    // Fallback 100% JS compatível com Hermes/Web (sem Node Buffer)
    base64 = utf8ToBase64(rawSvg);
  }

  if (fs.writeAsStringAsync) {
    await fs.writeAsStringAsync(fileUri, base64, {
      encoding: 'base64',
    });
  }

  return { uri: fileUri, fileName, mimeType: 'image/png' };
}

export interface DownloadResult {
  success: boolean;
  fileName: string;
  format: 'png' | 'svg';
  cancelled?: boolean;
  error?: string;
}

/**
 * Despacha o arquivo gerado no Mobile via expo-sharing com fallback para Share nativo.
 */
async function dispatchMobileFileShare(
  file: { uri: string; fileName: string; mimeType: string },
  dialogTitle: string,
  shareTitle: string,
  fallbackText: string
): Promise<void> {
  const uti =
    file.mimeType === 'image/png'
      ? 'public.png'
      : file.mimeType === 'image/svg+xml'
        ? 'public.svg-image'
        : 'com.adobe.pdf';

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType,
      dialogTitle,
      UTI: uti,
    });
    return;
  }

  await Share.share({
    title: shareTitle,
    url: file.uri,
    message: fallbackText,
  });
}

/**
 * Realiza o download/salvamento da imagem estilizada (PNG no Web, ou salvamento direto / expo-sharing no APK nativo)
 */
export async function downloadCardImage(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): Promise<DownloadResult> {
  const data = normalizeRecordCardData(rawInput);
  const format = options.format || 'png';

  // Altura automática ajustada ao conteúdo (evita imagens enormes com espaço vazio)
  const rawSvg = generateCardSvg(data, theme, { width: options.width, height: options.height });
  const { width, height } = getSvgDimensions(rawSvg);
  const baseName = sanitizeFileName(data.name);
  const fileName = `Ordo_${baseName}_${theme.id}.${format}`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      let downloadUrl = '';

      if (format === 'png') {
        downloadUrl = await svgToPngDataUrl(rawSvg, width, height);
      } else {
        downloadUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();

      setTimeout(() => {
        try {
          document.body.removeChild(anchor);
        } catch {}
      }, 1000);

      return { success: true, fileName, format };
    } catch (err: any) {
      return { success: false, fileName, format, error: err?.message || 'Falha ao baixar imagem' };
    }
  }

  // Mobile / APK Nativo:
  // Captura a imagem PNG real do cartão e salva na pasta escolhida (SAF Android) ou via expo-sharing
  try {
    const capturedPngUri =
      options.capturedPngUri ||
      (format === 'png' && options.cardViewRef
        ? await captureCardViewToPng(options.cardViewRef)
        : null);

    const file = await generateLocalCardFile(
      data,
      theme,
      rawSvg,
      format,
      width,
      height,
      capturedPngUri
    );

    if (
      Platform.OS === 'android' &&
      fs.StorageAccessFramework?.requestDirectoryPermissionsAsync &&
      fs.StorageAccessFramework?.createFileAsync &&
      fs.readAsStringAsync &&
      fs.writeAsStringAsync
    ) {
      try {
        const permissions = await fs.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions?.granted) {
          return { success: false, fileName: file.fileName, format, cancelled: true };
        }
        const cleanNameNoExt = file.fileName.replace(/\.[^.]+$/, '');
        const destUri = await fs.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          cleanNameNoExt,
          file.mimeType
        );
        const base64Content = await fs.readAsStringAsync(file.uri, { encoding: 'base64' });
        await fs.writeAsStringAsync(destUri, base64Content, { encoding: 'base64' });
        return { success: true, fileName: file.fileName, format };
      } catch (safErr) {
        console.warn('[cardExportService] SAF indisponível, usando Sharing:', safErr);
      }
    }

    await dispatchMobileFileShare(
      file,
      `Salvar Card ${data.name}`,
      data.name,
      formatRecordTextForSharing(data, theme)
    );
    return { success: true, fileName: file.fileName, format };
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismiss')) {
      return { success: true, fileName, format, cancelled: true };
    }
    return { success: false, fileName, format, error: err?.message || 'Erro ao exportar card' };
  }
}

/**
 * Compartilha o registro com o arquivo PNG anexado via Web Share API ou expo-sharing em dispositivos móveis.
 */
export async function shareCardImage(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): Promise<{ success: boolean; sharedAsFile: boolean }> {
  const data = normalizeRecordCardData(rawInput);
  const text = formatRecordTextForSharing(data, theme);
  const format = options.format || 'png';
  const rawSvg = generateCardSvg(data, theme, { width: options.width, height: options.height });
  const { width, height } = getSvgDimensions(rawSvg);

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    try {
      const pngUrl = await svgToPngDataUrl(rawSvg, width, height);
      const blob = dataUrlToBlob(pngUrl);

      if (blob && typeof File !== 'undefined' && navigator.canShare) {
        const file = new File([blob], `Ordo_${sanitizeFileName(data.name)}_${theme.id}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: data.name,
            text: `${data.name} - Ordo Realitas`,
          });
          return { success: true, sharedAsFile: true };
        }
      }

      // Fallback para share padrão sem arquivo na Web se files não suportado
      if (navigator.share) {
        await navigator.share({
          title: data.name,
          text,
        });
        return { success: true, sharedAsFile: false };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return { success: false, sharedAsFile: false };
      }
      console.warn('Web share falhou:', e);
    }
  }

  // Mobile / APK Nativo:
  // Captura o arquivo PNG físico do card e compartilha via expo-sharing
  try {
    const capturedPngUri =
      options.capturedPngUri ||
      (format === 'png' && options.cardViewRef
        ? await captureCardViewToPng(options.cardViewRef)
        : null);

    const file = await generateLocalCardFile(
      data,
      theme,
      rawSvg,
      format,
      width,
      height,
      capturedPngUri
    );

    await dispatchMobileFileShare(
      file,
      `Compartilhar Card ${data.name}`,
      data.name,
      text
    );
    return { success: true, sharedAsFile: true };
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismiss')) {
      return { success: false, sharedAsFile: false };
    }
    // Fallback de texto puro somente se a geração de arquivo falhar completamente
    try {
      await Share.share({
        title: data.name,
        message: text,
      });
      return { success: true, sharedAsFile: false };
    } catch {
      return { success: false, sharedAsFile: false };
    }
  }
}
