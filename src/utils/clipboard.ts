import { Platform, Share } from 'react-native';

/**
 * Utilitário unificado de área de transferência e compartilhamento de texto para o Ordo Companion.
 * Funciona de forma resiliente tanto no navegador (Web) quanto no runtime nativo Android APK (Hermes) e iOS.
 *
 * No Android/iOS: Como o Hermes nativo não possui a API `navigator.clipboard`,
 * utiliza a API nativa `Share.share` para permitir copiar/compartilhar o texto diretamente.
 */

export async function copyToClipboard(text: string, title?: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    }

    // Ambiente móvel nativo (Android APK / iOS) ou fallback quando navigator.clipboard não está disponível
    await Share.share({
      message: text,
      title: title || 'Ordo Companion',
    });
    return true;
  } catch (error) {
    console.warn('[clipboard] Falha ao copiar ou compartilhar texto:', error);
    return false;
  }
}

/**
 * Lê texto da área de transferência com segurança, sem lançar exceções não tratadas no runtime Hermes nativo.
 */
export async function readFromClipboard(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        return await navigator.clipboard.readText();
      }
    }
  } catch (error) {
    console.warn('[clipboard] Falha ao ler da área de transferência:', error);
  }
  return '';
}
