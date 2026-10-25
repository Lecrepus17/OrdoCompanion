import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { DriveFileInfo, SyncAuthState, UserDataBackupPayload } from './types';

// Garante o fechamento do navegador in-app após autenticação OAuth
WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEYS = {
  AUTH_STATE: '@ordem_paranormal:gdrive_auth_session_v2',
  CLIENT_ID: '@ordem_paranormal:google_client_id_v1',
  REMOTE_FILE_ID: '@ordem_paranormal:gdrive_remote_file_id_v1',
};

// Nome do arquivo protegido armazenado na pasta appDataFolder do Google Drive
export const BACKUP_FILE_NAME = 'ordem_paranormal_backup_v1.json';

// Escopos necessários: pasta oculta de dados do app e perfil do usuário
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Client ID padrão (pode ser sobrescrito pelo usuário nas configurações do app ou via env)
const DEFAULT_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '984364023774-ordemparanormal.apps.googleusercontent.com';

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private authState: SyncAuthState = { isAuthenticated: false };
  private customClientId: string = '';

  private constructor() {}

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Inicializa o serviço carregando credenciais previamente salvas
   */
  public async initialize(): Promise<SyncAuthState> {
    try {
      const [savedAuth, savedClientId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE),
        AsyncStorage.getItem(STORAGE_KEYS.CLIENT_ID),
      ]);

      if (savedClientId) {
        this.customClientId = savedClientId;
      }

      if (savedAuth) {
        const parsed: SyncAuthState = JSON.parse(savedAuth);
        // Verifica se o token expirou
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          // Token expirado
          this.authState = {
            isAuthenticated: false,
            userEmail: parsed.userEmail,
            userName: parsed.userName,
            userPhoto: parsed.userPhoto,
            error: 'Sessão expirada. Reconecte o Google Drive.',
          };
          await this.persistAuthState();
        } else {
          this.authState = parsed;
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar sessão Google Drive:', err);
      this.authState = { isAuthenticated: false };
    }
    return this.authState;
  }

  public getAuthState(): SyncAuthState {
    return { ...this.authState };
  }

  public getClientId(): string {
    return this.customClientId || DEFAULT_CLIENT_ID;
  }

  public async setCustomClientId(clientId: string): Promise<void> {
    this.customClientId = clientId.trim();
    if (this.customClientId) {
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENT_ID, this.customClientId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
    }
  }

  /**
   * Dispara o fluxo de autenticação OAuth2 do Google
   */
  public async signIn(): Promise<SyncAuthState> {
    try {
      const clientId = this.getClientId();
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'ordemguide',
        preferLocalhost: true,
      });

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: DRIVE_SCOPES,
        responseType: AuthSession.ResponseType.Token,
        redirectUri,
        prompt: AuthSession.Prompt.SelectAccount,
      });

      const result = await request.promptAsync(GOOGLE_DISCOVERY);

      if (result.type === 'success' && result.params.access_token) {
        const accessToken = result.params.access_token;
        const expiresIn = parseInt(result.params.expires_in || '3600', 10);
        const expiresAt = Date.now() + expiresIn * 1000;

        // Busca dados do perfil do usuário no Google
        const userInfo = await this.fetchUserInfo(accessToken);

        this.authState = {
          isAuthenticated: true,
          accessToken,
          expiresAt,
          userEmail: userInfo.email,
          userName: userInfo.name,
          userPhoto: userInfo.picture,
        };

        await this.persistAuthState();
        return this.authState;
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        return {
          ...this.authState,
          error: 'Conexão cancelada pelo usuário.',
        };
      } else {
        return {
          ...this.authState,
          error: 'Falha na autenticação do Google.',
        };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro inesperado ao conectar ao Google Drive.';
      this.authState = {
        ...this.authState,
        error: errorMsg,
      };
      return this.authState;
    }
  }

  /**
   * Desconecta e limpa as credenciais salvas
   */
  public async signOut(): Promise<void> {
    try {
      if (this.authState.accessToken) {
        // Tenta revogar o token no Google
        try {
          await fetch(
            `${GOOGLE_DISCOVERY.revocationEndpoint}?token=${this.authState.accessToken}`,
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        } catch {}
      }
    } finally {
      this.authState = { isAuthenticated: false };
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
      await AsyncStorage.removeItem(STORAGE_KEYS.REMOTE_FILE_ID);
    }
  }

  /**
   * Busca dados do perfil Google através da API OAuth2
   */
  private async fetchUserInfo(token: string): Promise<{ email?: string; name?: string; picture?: string }> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {};
  }

  /**
   * Localiza o arquivo de backup na pasta oculta do app (appDataFolder)
   */
  public async findBackupFile(): Promise<DriveFileInfo | null> {
    const token = this.getValidToken();
    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,size)&q=${query}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.authState.isAuthenticated = false;
        await this.persistAuthState();
        throw new Error('Sessão expirada. Por favor, conecte o Google Drive novamente.');
      }
      throw new Error(`Falha ao consultar Google Drive: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      await AsyncStorage.setItem(STORAGE_KEYS.REMOTE_FILE_ID, file.id);
      return file;
    }
    return null;
  }

  /**
   * Baixa o conteúdo do backup remoto do Google Drive
   */
  public async downloadBackup(fileId: string): Promise<UserDataBackupPayload> {
    const token = this.getValidToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Erro ao baixar backup do Drive: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json;
  }

  /**
   * Envia ou atualiza o arquivo de backup no Google Drive (appDataFolder)
   */
  public async uploadBackup(
    payload: UserDataBackupPayload,
    existingFileId?: string
  ): Promise<DriveFileInfo> {
    const token = this.getValidToken();
    const jsonStr = JSON.stringify(payload, null, 2);

    let targetFileId = existingFileId;
    if (!targetFileId) {
      const existing = await this.findBackupFile();
      if (existing) {
        targetFileId = existing.id;
      }
    }

    if (targetFileId) {
      // Atualiza arquivo existente via PATCH media
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`;
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonStr,
      });

      if (!res.ok) {
        throw new Error(`Erro ao atualizar arquivo no Drive: HTTP ${res.status}`);
      }

      const updated = await res.json();
      return {
        id: targetFileId,
        name: BACKUP_FILE_NAME,
        modifiedTime: new Date().toISOString(),
        size: String(jsonStr.length),
      };
    } else {
      // Cria novo arquivo na pasta appDataFolder via multipart/related
      const boundary = 'ordem_paranormal_boundary_' + Date.now();
      const metadata = JSON.stringify({
        name: BACKUP_FILE_NAME,
        parents: ['appDataFolder'],
        description: 'Backup de Fichas e Compêndio do Guia Ordem Paranormal',
      });

      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${jsonStr}\r\n` +
        `--${boundary}--`;

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ao criar arquivo no Drive (HTTP ${res.status}): ${errorText}`);
      }

      const created = await res.json();
      await AsyncStorage.setItem(STORAGE_KEYS.REMOTE_FILE_ID, created.id);
      return {
        id: created.id,
        name: BACKUP_FILE_NAME,
        modifiedTime: new Date().toISOString(),
        size: String(jsonStr.length),
      };
    }
  }

  private getValidToken(): string {
    if (!this.authState.isAuthenticated || !this.authState.accessToken) {
      throw new Error('Google Drive não está autenticado.');
    }
    if (this.authState.expiresAt && Date.now() > this.authState.expiresAt) {
      throw new Error('Sessão expirada. Reconecte o Google Drive.');
    }
    return this.authState.accessToken;
  }

  private async persistAuthState(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(this.authState));
    } catch {}
  }
}
