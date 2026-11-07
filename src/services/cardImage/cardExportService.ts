import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { generateCardSvg } from './svgCardRenderer';
import { CardThemeDefinition, ExportCardOptions, RecordCardData } from './types';
import { getCardThemeById } from './themeRegistry';

interface FileSystemCompat {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  writeAsStringAsync?: (
    uri: string,
    contents: string,
    options?: { encoding?: 'utf8' | 'base64' | string }
  ) => Promise<void>;
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
 * Gera um arquivo físico do cartão no armazenamento seguro local (cache).
 * Suporta SVG vetorial direto e renderização com dimensões exatas do card (1080x1350).
 */
/**
 * Gera um arquivo físico do cartão no armazenamento seguro local (cache).
 * Suporta SVG vetorial direto e renderização com dimensões exatas do card (1080x1350).
 */
export async function generateLocalCardFile(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme: CardThemeDefinition,
  rawSvg: string,
  format: 'png' | 'svg',
  width: number,
  height: number
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

  let pngDataUrl = '';
  try {
    pngDataUrl = await svgToPngDataUrl(rawSvg, width, height);
  } catch {}

  let base64 = '';
  if (pngDataUrl && pngDataUrl.startsWith('data:image/png;base64,')) {
    base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
  } else if (pngDataUrl && pngDataUrl.includes('base64,')) {
    base64 = pngDataUrl.split('base64,')[1];
  } else {
    base64 = Buffer.from(rawSvg).toString('base64');
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
  error?: string;
}

/**
 * Realiza o download/salvamento da imagem estilizada (PNG/SVG no Web, ou compartilhamento/salvamento via expo-sharing no APK nativo)
 */
export async function downloadCardImage(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): Promise<DownloadResult> {
  const data = normalizeRecordCardData(rawInput);
  const format = options.format || 'png';
  const width = options.width || 1080;
  const height = options.height || 1350;

  const rawSvg = generateCardSvg(data, theme, { width, height });
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
  // NUNCA aciona o spooler de impressão de folha A4 (Print.printAsync).
  // Gera o arquivo do cartão com dimensões exatas e despacha via expo-sharing
  try {
    const file = await generateLocalCardFile(data, theme, rawSvg, format, width, height);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: file.mimeType,
        dialogTitle: `Salvar Card ${data.name}`,
        UTI: format === 'svg' ? 'public.svg-image' : file.mimeType === 'image/png' ? 'public.png' : 'com.adobe.pdf',
      });
      return { success: true, fileName: file.fileName, format };
    }

    // Fallback se expo-sharing não estiver disponível:
    await Share.share({
      title: data.name,
      url: file.uri,
      message: formatRecordTextForSharing(data, theme),
    });
    return { success: true, fileName: file.fileName, format };
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismiss')) {
      return { success: true, fileName, format };
    }
    return { success: false, fileName, format, error: err?.message || 'Erro ao exportar card' };
  }
}

/**
 * Compartilha o registro com o arquivo anexado via Web Share API ou expo-sharing em dispositivos móveis.
 */
export async function shareCardImage(
  rawInput: RecordCardData | Partial<RecordCardData>,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): Promise<{ success: boolean; sharedAsFile: boolean }> {
  const data = normalizeRecordCardData(rawInput);
  const text = formatRecordTextForSharing(data, theme);
  const width = options.width || 1080;
  const height = options.height || 1350;
  const format = options.format || 'png';

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    try {
      const rawSvg = generateCardSvg(data, theme, { width, height });
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
  // Gera o arquivo físico do card e compartilha via expo-sharing
  try {
    const rawSvg = generateCardSvg(data, theme, { width, height });
    const file = await generateLocalCardFile(data, theme, rawSvg, format, width, height);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: file.mimeType,
        dialogTitle: `Compartilhar Card ${data.name}`,
        UTI: format === 'svg' ? 'public.svg-image' : file.mimeType === 'image/png' ? 'public.png' : 'com.adobe.pdf',
      });
      return { success: true, sharedAsFile: true };
    }

    // Fallback se expo-sharing não estiver disponível:
    await Share.share({
      title: data.name,
      url: file.uri,
      message: text,
    });
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
