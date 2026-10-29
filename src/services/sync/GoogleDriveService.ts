import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

// Client IDs padrão para Web e Mobile (podem ser sobrescritos por variáveis de ambiente ou pelo usuário)
const DEFAULT_CLIENT_ID_WEB =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '556485656355-ef063m1qrjff7g3g6i1j8kriuh2l1i7i.apps.googleusercontent.com';

const DEFAULT_CLIENT_ID_MOBILE =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_MOBILE ||
  '556485656355-grsjjk5ol3keimcnn905f5vrd7lk0jos.apps.googleusercontent.com';

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

      if (savedClientId && !savedClientId.includes('ordemparanormal.apps.googleusercontent.com')) {
        this.customClientId = savedClientId;
      }

      if (savedAuth) {
        const parsed: SyncAuthState = JSON.parse(savedAuth);
        // Verifica se o token expirou
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          if (parsed.refreshToken) {
            // Tenta renovar a sessão em segundo plano usando o refresh_token
            this.authState = parsed;
            try {
              await this.ensureValidToken();
            } catch {
              this.authState = {
                isAuthenticated: false,
                userEmail: parsed.userEmail,
                userName: parsed.userName,
                userPhoto: parsed.userPhoto,
                error: 'Sessão expirada. Reconecte o Google Drive.',
              };
              await this.persistAuthState();
            }
          } else {
            // Sem refresh token, requer reconexão
            this.authState = {
              isAuthenticated: false,
              userEmail: parsed.userEmail,
              userName: parsed.userName,
              userPhoto: parsed.userPhoto,
              error: 'Sessão expirada. Reconecte o Google Drive.',
            };
            await this.persistAuthState();
          }
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
    if (this.customClientId && !this.customClientId.includes('ordemparanormal.apps.googleusercontent.com')) {
      return this.customClientId;
    }
    return Platform.OS === 'web' ? DEFAULT_CLIENT_ID_WEB : DEFAULT_CLIENT_ID_MOBILE;
  }

  public getRedirectUri(): string {
    if (Platform.OS === 'web') {
      return AuthSession.makeRedirectUri({
        scheme: 'com.ordemparanormal.ordo',
        path: 'oauthredirect',
        preferLocalhost: true,
      });
    }
    return AuthSession.makeRedirectUri({
      native: 'com.ordemparanormal.ordo:/oauthredirect',
    });
  }

  public isConfigured(): boolean {
    const cid = this.getClientId();
    return Boolean(
      cid &&
      !cid.includes('ordemparanormal.apps.googleusercontent.com') &&
      cid.endsWith('.apps.googleusercontent.com')
    );
  }

  /**
   * Retorna se um Client ID customizado pelo usuário está ativo atualmente.
   */
  public hasCustomClientId(): boolean {
    return Boolean(this.customClientId);
  }

  public async setCustomClientId(clientId: string): Promise<{ valid: boolean; message?: string }> {
    const cleaned = clientId.trim();
    if (!cleaned) {
      this.customClientId = '';
      await AsyncStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
      return { valid: true };
    }

    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.includes('/')) {
      return {
        valid: false,
        message: 'O Client ID não deve ser um link/URL. Ele deve terminar com .apps.googleusercontent.com',
      };
    }

    if (!cleaned.endsWith('.apps.googleusercontent.com')) {
      return {
        valid: false,
        message: 'Formato inválido. O Client ID do Google deve terminar com .apps.googleusercontent.com',
      };
    }

    this.customClientId = cleaned;
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENT_ID, this.customClientId);
    return { valid: true };
  }

  /**
   * Dispara o fluxo de autenticação OAuth2 do Google
   * Em conformidade com a política moderna do Google (RFC 8252 / PKCE):
   * - Utiliza response_type=code com PKCE ativado (obrigatório pelo Google)
   * - Troca o código pelo access_token e refresh_token via exchangeCodeAsync
   */
  public async signIn(): Promise<SyncAuthState> {
    try {
      const clientId = this.getClientId();
      const redirectUri = this.getRedirectUri();

      if (!this.isConfigured()) {
        this.authState = {
          isAuthenticated: false,
          error: `Client ID do Google não configurado. Adicione seu Client ID do Google Cloud Console em "Configuração Avançada de Client ID". Redirect URI: ${redirectUri}`,
        };
        return this.authState;
      }

            if (Platform.OS !== 'web' && (Constants as any)?.appOwnership === 'expo') {
        this.authState = {
          isAuthenticated: false,
          error:
            'O Google OAuth não é suportado dentro do Expo Go no celular, pois o Expo Go não pode registrar esquemas nativos (com.ordemparanormal.ordo) no Android. Para testar no celular, instale o APK compilado ou use um Development Build. Para testar localmente agora, abra no navegador Web (npm run web) ou utilize o Backup JSON.',
        };
        return this.authState;
      }

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: DRIVE_SCOPES,
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        prompt: AuthSession.Prompt.Consent,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
        },
      });

      const result = await request.promptAsync(GOOGLE_DISCOVERY);

      if (result.type === 'success') {
        let accessToken = result.params.access_token;
        let refreshToken: string | undefined;
        let expiresIn = parseInt(result.params.expires_in || '3600', 10);

        // Se recebeu o código de autorização (Fluxo PKCE padrão), realiza a troca pelo token
        if (result.params.code) {
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId,
              code: result.params.code,
              redirectUri,
              extraParams: {
                code_verifier: request.codeVerifier || '',
              },
            },
            GOOGLE_DISCOVERY
          );

          accessToken = tokenResponse.accessToken;
          refreshToken = tokenResponse.refreshToken;
          if (tokenResponse.expiresIn) {
            expiresIn = tokenResponse.expiresIn;
          }
        }

        if (!accessToken) {
          throw new Error('Nenhum token de acesso retornado pelo Google.');
        }

        const expiresAt = Date.now() + expiresIn * 1000;

        // Busca dados do perfil do usuário no Google
        const userInfo = await this.fetchUserInfo(accessToken);

        this.authState = {
          isAuthenticated: true,
          accessToken,
          refreshToken,
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
        const errorDetail =
          (result as any)?.error?.message ||
          (result as any)?.params?.error_description ||
          (result as any)?.params?.error;
        return {
          ...this.authState,
          error: errorDetail ? `Google OAuth: ${errorDetail}` : 'Falha na autenticação do Google.',
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
   * Garante a validade do token de acesso, renovando-o automaticamente se expirado
   */
  public async ensureValidToken(): Promise<string> {
    if (!this.authState.isAuthenticated || !this.authState.accessToken) {
      throw new Error('Google Drive não está autenticado.');
    }

    if (this.authState.expiresAt && Date.now() > this.authState.expiresAt) {
      if (this.authState.refreshToken) {
        try {
          const refreshed = await AuthSession.refreshAsync(
            {
              clientId: this.getClientId(),
              refreshToken: this.authState.refreshToken,
            },
            GOOGLE_DISCOVERY
          );

          this.authState.accessToken = refreshed.accessToken;
          if (refreshed.refreshToken) {
            this.authState.refreshToken = refreshed.refreshToken;
          }
          const expiresIn = refreshed.expiresIn || 3600;
          this.authState.expiresAt = Date.now() + expiresIn * 1000;
          await this.persistAuthState();
          return this.authState.accessToken;
        } catch (refreshErr) {
          console.warn('[GoogleDriveService] Falha ao renovar token com refresh_token:', refreshErr);
          this.authState.isAuthenticated = false;
          await this.persistAuthState();
          throw new Error('Sessão expirada. Reconecte o Google Drive.');
        }
      }
      throw new Error('Sessão expirada. Reconecte o Google Drive.');
    }

    return this.authState.accessToken;
  }

  /**
   * Desconecta e limpa as credenciais salvas
   */
  public async signOut(): Promise<void> {
    try {
      if (this.authState.accessToken) {
        try {
          await fetch(
            `${GOOGLE_DISCOVERY.revocationEndpoint}?token=${this.authState.accessToken}`,
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        } catch {}
      }
      if (this.authState.refreshToken) {
        try {
          await fetch(
            `${GOOGLE_DISCOVERY.revocationEndpoint}?token=${this.authState.refreshToken}`,
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
    const token = await this.ensureValidToken();
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
    const token = await this.ensureValidToken();
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
    const token = await this.ensureValidToken();
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

  /**
   * Lista todos os arquivos PDF do acervo salvos na pasta oculta (appDataFolder) do Google Drive do usuário
   */
  public async listDrivePdfFiles(): Promise<DriveFileInfo[]> {
    const token = await this.ensureValidToken();
    const query = encodeURIComponent(`name contains 'ordo_pdf__' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,size)&q=${query}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data.files) ? data.files : [];
  }

  /**
   * Salva ou atualiza um arquivo PDF na pasta oculta (appDataFolder) do Google Drive do usuário
   */
  public async uploadPdfToDrive(
    bookId: string,
    fileName: string,
    pdfBytes: Uint8Array,
    existingFileId?: string
  ): Promise<DriveFileInfo> {
    const token = await this.ensureValidToken();
    const driveName = `ordo_pdf__${bookId}.pdf`;

    let targetFileId = existingFileId;
    if (!targetFileId) {
      const files = await this.listDrivePdfFiles();
      const found = files.find((f) => f.name === driveName);
      if (found) {
        targetFileId = found.id;
      }
    }

    if (targetFileId) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`;
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/pdf',
        },
        body: pdfBytes as any,
      });

      if (!res.ok) {
        throw new Error(`Erro ao atualizar PDF no Google Drive: HTTP ${res.status}`);
      }

      return {
        id: targetFileId,
        name: driveName,
        modifiedTime: new Date().toISOString(),
        size: String(pdfBytes.length),
      };
    } else {
      // Cria metadados primeiro e envia o binário via PATCH media para suportar PDFs de qualquer tamanho
      const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          name: driveName,
          parents: ['appDataFolder'],
          mimeType: 'application/pdf',
          description: `PDF Oficial OrdoCompanion: ${fileName} (${bookId})`,
        }),
      });

      if (!createMetaRes.ok) {
        throw new Error(`Erro ao criar registro de PDF no Google Drive: HTTP ${createMetaRes.status}`);
      }

      const createdMeta = await createMetaRes.json();
      const newFileId = createdMeta.id;

      const uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/pdf',
          },
          body: pdfBytes as any,
        }
      );

      if (!uploadRes.ok) {
        throw new Error(`Erro ao enviar conteúdo do PDF ao Google Drive: HTTP ${uploadRes.status}`);
      }

      return {
        id: newFileId,
        name: driveName,
        modifiedTime: new Date().toISOString(),
        size: String(pdfBytes.length),
      };
    }
  }

  /**
   * Baixa os bytes de um PDF salvo no Google Drive do usuário para disponibilizar offline no aparelho
   */
  public async downloadPdfFromDrive(fileId: string): Promise<Uint8Array> {
    const token = await this.ensureValidToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Erro ao baixar PDF do Google Drive: HTTP ${res.status}`);
    }

    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
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
