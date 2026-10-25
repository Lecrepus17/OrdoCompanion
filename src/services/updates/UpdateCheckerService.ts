import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking } from 'react-native';
import {
  GitHubReleaseResponse,
  RemoteVersionManifest,
  UpdateCheckResult,
} from './types';

export const DISMISSED_UPDATE_VERSION_KEY = '@ordo_dismissed_update_version';
export const DISMISSED_UPDATE_TIME_KEY = '@ordo_dismissed_update_time';
export const LAST_UPDATE_CHECK_KEY = '@ordo_last_update_check_time';

export const DEFAULT_MANIFEST_URL =
  'https://raw.githubusercontent.com/Lecrepus17/OrdoCompanion/main/version.json';
export const GITHUB_RELEASES_API_URL =
  'https://api.github.com/repos/Lecrepus17/OrdoCompanion/releases/latest';

/**
 * Compara duas versões semânticas (ex: '1.0.0' vs '1.1.0' ou 'v1.0.1' vs '1.0.0').
 * Retorna:
 *  - 1 se v1 > v2
 *  - -1 se v1 < v2
 *  - 0 se v1 == v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = (v1 || '').trim().replace(/^v/i, '');
  const clean2 = (v2 || '').trim().replace(/^v/i, '');

  const parts1 = clean1.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = clean2.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length, 3);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Formata changelog vindo como string simples ou markdown em lista de itens limpos.
 */
export function normalizeChangelog(changelog: string[] | string | undefined): string[] {
  if (!changelog) return [];
  if (Array.isArray(changelog)) {
    return changelog.map((item) => item.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
  }

  return changelog
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('##') && !line.startsWith('#'))
    .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean);
}

export class UpdateCheckerService {
  private manifestUrl: string;
  private githubApiUrl: string;

  constructor(
    manifestUrl: string = DEFAULT_MANIFEST_URL,
    githubApiUrl: string = GITHUB_RELEASES_API_URL
  ) {
    this.manifestUrl = manifestUrl;
    this.githubApiUrl = githubApiUrl;
  }

  /**
   * Obtém a versão instalada atualmente no aplicativo.
   */
  public getCurrentVersion(): string {
    const expoVersion = Constants.expoConfig?.version;
    return expoVersion || '1.0.0';
  }

  /**
   * Verifica se o usuário dispensou uma versão específica recentemente (dentro de 24 horas).
   */
  public async isUpdateDismissed(targetVersion: string): Promise<boolean> {
    try {
      const dismissedVersion = await AsyncStorage.getItem(DISMISSED_UPDATE_VERSION_KEY);
      if (dismissedVersion !== targetVersion) {
        return false;
      }

      const dismissedTimeStr = await AsyncStorage.getItem(DISMISSED_UPDATE_TIME_KEY);
      if (!dismissedTimeStr) return false;

      const dismissedTime = parseInt(dismissedTimeStr, 10);
      const now = Date.now();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      // Se passou mais de 24 horas, permite notificar novamente
      return now - dismissedTime < twentyFourHoursMs;
    } catch {
      return false;
    }
  }

  /**
   * Marca a versão como dispensada ("Lembrar mais tarde") pelo usuário.
   */
  public async dismissUpdate(targetVersion: string): Promise<void> {
    try {
      await AsyncStorage.setItem(DISMISSED_UPDATE_VERSION_KEY, targetVersion);
      await AsyncStorage.setItem(DISMISSED_UPDATE_TIME_KEY, Date.now().toString());
    } catch (e) {
      console.warn('[UpdateCheckerService] Erro ao salvar dispensa de versão:', e);
    }
  }

  /**
   * Limpa qualquer dispensa salva (útil para testes ou verificação manual).
   */
  public async clearDismissedUpdate(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DISMISSED_UPDATE_VERSION_KEY);
      await AsyncStorage.removeItem(DISMISSED_UPDATE_TIME_KEY);
    } catch {}
  }

  /**
   * Consulta a fonte remota (version.json ou GitHub Releases API).
   */
  public async fetchRemoteManifest(): Promise<RemoteVersionManifest | null> {
    // 1. Tentar version.json primeiro (rápido, sem rate limit e com controle customizado)
    try {
      const response = await fetch(`${this.manifestUrl}?t=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = (await response.json()) as RemoteVersionManifest;
        if (data && data.version) {
          return data;
        }
      }
    } catch (err) {
      // Falha silenciosa, segue para o fallback do GitHub
    }

    // 2. Fallback para API pública do GitHub Releases
    try {
      const ghResponse = await fetch(this.githubApiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OrdoCompanion-App',
        },
      });

      if (ghResponse.ok) {
        const ghData = (await ghResponse.json()) as GitHubReleaseResponse;
        if (ghData && ghData.tag_name) {
          const apkAsset = ghData.assets?.find(
            (a) => a.name.endsWith('.apk') || a.browser_download_url.endsWith('.apk')
          );

          return {
            version: ghData.tag_name.replace(/^v/i, ''),
            releaseName: ghData.name || `Ordo Companion ${ghData.tag_name}`,
            releaseDate: ghData.published_at,
            downloadUrl: ghData.html_url,
            apkUrl: apkAsset ? apkAsset.browser_download_url : undefined,
            changelog: ghData.body || 'Atualização com melhorias e correções no aplicativo.',
            forceUpdate: false,
          };
        }
      }
    } catch (err) {
      // Dispositivo offline ou sem rede
    }

    return null;
  }

  /**
   * Executa a checagem completa de atualização.
   * @param forceCheck Se true, ignora se o usuário já dispensou e sempre retorna os dados da atualização.
   */
  public async checkForAppUpdate(forceCheck = false): Promise<UpdateCheckResult | null> {
    const currentVersion = this.getCurrentVersion();
    const manifest = await this.fetchRemoteManifest();

    if (!manifest || !manifest.version) {
      return null;
    }

    const hasNewerVersion = compareSemVer(manifest.version, currentVersion) > 0;
    const isMandatory = Boolean(
      manifest.forceUpdate ||
      (manifest.minVersion && compareSemVer(manifest.minVersion, currentVersion) > 0)
    );

    const isDismissed = !forceCheck && !isMandatory && (await this.isUpdateDismissed(manifest.version));

    // Grava timestamp da última checagem
    try {
      await AsyncStorage.setItem(LAST_UPDATE_CHECK_KEY, Date.now().toString());
    } catch {}

    const result: UpdateCheckResult = {
      hasUpdate: hasNewerVersion,
      currentVersion,
      latestVersion: manifest.version,
      releaseName: manifest.releaseName || `Versão ${manifest.version}`,
      releaseDate: manifest.releaseDate,
      changelog: normalizeChangelog(manifest.changelog),
      downloadUrl: manifest.downloadUrl,
      apkUrl: manifest.apkUrl,
      isMandatory,
      isDismissed,
    };

    return result;
  }

  /**
   * Abre o link de download/release no navegador do usuário.
   */
  public async openDownloadUrl(url?: string): Promise<boolean> {
    const targetUrl =
      url || 'https://github.com/Lecrepus17/OrdoCompanion/releases/latest';

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('[UpdateCheckerService] Erro ao abrir URL de atualização:', error);
      return false;
    }
  }
}

export const updateCheckerService = new UpdateCheckerService();
