import { Platform, Share } from 'react-native';
import { generateCardSvg } from './svgCardRenderer';
import { CardThemeDefinition, ExportCardOptions, RecordCardData } from './types';

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
 * Formata os dados do registro como texto estilizado para Discord ou WhatsApp
 */
export function formatRecordTextForSharing(
  data: RecordCardData,
  theme: CardThemeDefinition
): string {
  const parts: string[] = [];
  const glyph = theme.elementGlyph ? `${theme.elementGlyph} ` : '';

  parts.push(`*${glyph}${data.name.toUpperCase()}*`);
  parts.push(`Categoria: ${data.categoryLabel}${data.subCategory ? ` • ${data.subCategory}` : ''}`);
  if (data.element) {
    parts.push(`Elemento: ${data.element}`);
  }
  if (data.bookTitle) {
    parts.push(`Fonte: ${data.bookTitle}${data.pageNumber ? ` • Pág. ${data.pageNumber}` : ''}`);
  }

  if (data.stats.length > 0) {
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
  parts.push(`_${theme.motto}_`);
  parts.push('— Gerado via Ordo Companion');

  return parts.join('\n');
}

export interface DownloadResult {
  success: boolean;
  fileName: string;
  format: 'png' | 'svg';
  error?: string;
}

/**
 * Realiza o download da imagem estilizada (PNG ou SVG)
 */
export async function downloadCardImage(
  data: RecordCardData,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): Promise<DownloadResult> {
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

  // Mobile / Fallback Nativo: Compartilha dados textuais ou salva link
  try {
    const text = formatRecordTextForSharing(data, theme);
    await Share.share({
      title: data.name,
      message: text,
    });
    return { success: true, fileName, format };
  } catch (err: any) {
    return { success: false, fileName, format, error: err?.message || 'Erro no compartilhamento móvel' };
  }
}

/**
 * Compartilha o registro via Web Share API com anexo de imagem quando suportado,
 * ou via Share nativo de React Native.
 */
export async function shareCardImage(
  data: RecordCardData,
  theme: CardThemeDefinition,
  options: ExportCardOptions = {}
): Promise<{ success: boolean; sharedAsFile: boolean }> {
  const text = formatRecordTextForSharing(data, theme);
  const width = options.width || 1080;
  const height = options.height || 1350;

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

      // Fallback para share padrão sem arquivo
      if (navigator.share) {
        await navigator.share({
          title: data.name,
          text,
        });
        return { success: true, sharedAsFile: false };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Usuário apenas fechou o diálogo nativo
        return { success: false, sharedAsFile: false };
      }
      console.warn('Web share falhou:', e);
    }
  }

  // React Native Share
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
