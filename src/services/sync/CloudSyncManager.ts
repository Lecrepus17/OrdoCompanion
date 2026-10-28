import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultRepository } from '../../repositories/OfflineDataRepository';
import {
  cacheUnlockedBooksOffline,
  localPdfStorage,
} from '../pdf/PdfAccessService';
import { GoogleDriveService } from './GoogleDriveService';
import { SmartMergeEngine } from './SmartMergeEngine';
import {
  MergeStats,
  SyncAuthState,
  SyncProgressCallback,
  SyncStatus,
  UserDataBackupPayload,
} from './types';

const STORAGE_KEYS = {
  AUTO_SYNC_ENABLED: '@ordem_paranormal:auto_sync_enabled_v1',
  LAST_SYNC_STATS: '@ordem_paranormal:last_sync_stats_v1',
};

export interface SyncExecutionResult {
  success: boolean;
  message: string;
  stats?: MergeStats;
  lastSyncAt?: string;
  error?: string;
}

export class CloudSyncManager {
  private static instance: CloudSyncManager;
  private driveService: GoogleDriveService;
  private currentStatus: SyncStatus = 'idle';
  private statusListeners: Set<SyncProgressCallback> = new Set();
  private reloadListeners: Set<() => void | Promise<void>> = new Set();
  private autoSyncTimer: any = null;
  private isAutoSyncEnabled: boolean = true;
  private lastStats: MergeStats | null = null;
  private isSyncInProgress: boolean = false;

  private constructor() {
    this.driveService = GoogleDriveService.getInstance();
  }

  public static getInstance(): CloudSyncManager {
    if (!CloudSyncManager.instance) {
      CloudSyncManager.instance = new CloudSyncManager();
    }
    return CloudSyncManager.instance;
  }

  /**
   * Inicializa o gerenciador de sincronização
   */
  public async initialize(): Promise<void> {
    await this.driveService.initialize();

    try {
      const [savedAutoSync, savedStats] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_STATS),
      ]);

      if (savedAutoSync !== null) {
        this.isAutoSyncEnabled = savedAutoSync === 'true';
      }

      if (savedStats) {
        this.lastStats = JSON.parse(savedStats);
      }
    } catch {}

    // Se estiver autenticado e auto-sync ativado, sincroniza em segundo plano no boot
    const auth = this.driveService.getAuthState();
    if (auth.isAuthenticated && this.isAutoSyncEnabled) {
      setTimeout(() => {
        this.syncNow({ quiet: true }).catch(() => {});
      }, 1500);
    }
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public getAuthState(): SyncAuthState {
    return this.driveService.getAuthState();
  }

  public isAutoSyncActive(): boolean {
    return this.isAutoSyncEnabled;
  }

  public async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    this.isAutoSyncEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, String(enabled));
  }

  public getLastStats(): MergeStats | null {
    return this.lastStats;
  }

  public addStatusListener(listener: SyncProgressCallback): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  public addDataReloadListener(listener: () => void | Promise<void>): () => void {
    this.reloadListeners.add(listener);
    return () => this.reloadListeners.delete(listener);
  }

  private async notifyDataReload(): Promise<void> {
    for (const listener of this.reloadListeners) {
      try {
        await listener();
      } catch (err) {
        console.warn('[CloudSyncManager] Erro no listener de recarregamento reativo:', err);
      }
    }
  }

  private notifyStatus(status: SyncStatus, message?: string) {
    this.currentStatus = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status, message);
      } catch {}
    }
  }

  /**
   * Conecta a conta do Google Drive
   */
  public async connectGoogleDrive(): Promise<SyncAuthState> {
    this.notifyStatus('checking', 'Conectando ao Google Drive...');
    const auth = await this.driveService.signIn();
    if (auth.isAuthenticated) {
      this.notifyStatus('idle', 'Conectado com sucesso!');
      // Executa sincronização inicial automaticamente
      this.syncNow({ quiet: false }).catch(() => {});
    } else {
      this.notifyStatus('error', auth.error || 'Não foi possível conectar.');
    }
    return auth;
  }

  /**
   * Desconecta a conta do Google Drive
   */
  public async disconnectGoogleDrive(): Promise<void> {
    await this.driveService.signOut();
    this.notifyStatus('idle');
  }

  /**
   * Agenda sincronização automática debounced (útil após criar/editar fichas)
   */
  public scheduleAutoSync(delayMs: number = 3000): void {
    if (!this.isAutoSyncEnabled) return;
    const auth = this.driveService.getAuthState();
    if (!auth.isAuthenticated) return;

    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }

    this.autoSyncTimer = setTimeout(() => {
      this.syncNow({ quiet: true }).catch(() => {});
    }, delayMs);
  }

  /**
   * Envia imediatamente o binário de um PDF para o Google Drive próprio do usuário (caso esteja autenticado)
   * e vincula o driveFileId ao livro desbloqueado.
   */
  public async uploadPdfToUserDriveIfConnected(
    bookId: string,
    fileName: string,
    pdfBytes?: Uint8Array
  ): Promise<string | undefined> {
    const auth = this.driveService.getAuthState();
    if (!auth.isAuthenticated) return undefined;

    try {
      const bytesToUpload = pdfBytes || (await localPdfStorage.getPdfBytes(bookId));
      if (!bytesToUpload || bytesToUpload.length === 0) return undefined;

      const recMap = defaultRepository.getUnlockedBooksRecordMap();
      const existingDriveId = recMap[bookId]?.driveFileId;
      const driveInfo = await this.driveService.uploadPdfToDrive(
        bookId,
        fileName,
        bytesToUpload,
        existingDriveId
      );
      if (driveInfo?.id) {
        await defaultRepository.unlockBook(bookId, {
          driveFileId: driveInfo.id,
          localPdfStored: true,
        });
        return driveInfo.id;
      }
    } catch (e) {
      console.warn('[CloudSyncManager] Aviso ao salvar PDF no Google Drive do usuário:', e);
    }
    return undefined;
  }

  /**
   * Sincroniza os arquivos .pdf entre o armazenamento offline local (LocalPdfStorage)
   * e a pasta appDataFolder do Google Drive do usuário.
   */
  private async syncPdfBinariesWithDrive(): Promise<number> {
    let syncedCount = 0;
    try {
      const driveFiles = await this.driveService.listDrivePdfFiles();
      const driveByBookId = new Map<string, string>();
      for (const df of driveFiles) {
        const m = df.name.match(/^ordo_pdf__(.+)\.pdf$/i);
        if (m && m[1]) {
          driveByBookId.set(m[1], df.id);
        }
      }

      const unlockedMap = defaultRepository.getUnlockedBooksRecordMap();
      const allUnlockedIds = Object.keys(unlockedMap);

      // Garante cache offline para todos os livros desbloqueados
      if (allUnlockedIds.length > 0) {
        await cacheUnlockedBooksOffline(allUnlockedIds);
      }

      for (const bookId of allUnlockedIds) {
        const rec = unlockedMap[bookId];
        const remoteDriveId = rec?.driveFileId || driveByBookId.get(bookId);
        const localBytes = await localPdfStorage.getPdfBytes(bookId);

        if (localBytes && localBytes.length > 0 && !remoteDriveId) {
          // Temos o PDF localmente, mas ainda não está no Google Drive do usuário -> faz upload!
          const uploaded = await this.driveService.uploadPdfToDrive(
            bookId,
            rec?.fileName || `${bookId}.pdf`,
            localBytes
          );
          if (uploaded?.id) {
            await defaultRepository.unlockBook(bookId, {
              driveFileId: uploaded.id,
              localPdfStored: true,
            });
            syncedCount++;
          }
        } else if ((!localBytes || localBytes.length === 0) && remoteDriveId) {
          // O PDF está salvo no Google Drive do usuário, mas ainda não foi baixado neste aparelho -> baixa para offline!
          try {
            const downloadedBytes = await this.driveService.downloadPdfFromDrive(remoteDriveId);
            if (downloadedBytes && downloadedBytes.length > 0) {
              await localPdfStorage.savePdfOffline(
                bookId,
                rec?.fileName || `${bookId}.pdf`,
                downloadedBytes,
                rec?.sha256
              );
              await defaultRepository.unlockBook(bookId, {
                driveFileId: remoteDriveId,
                localPdfStored: true,
              });
              syncedCount++;
            }
          } catch {}
        } else if (remoteDriveId && !rec?.driveFileId) {
          await defaultRepository.unlockBook(bookId, {
            driveFileId: remoteDriveId,
            localPdfStored: true,
          });
        }
      }
    } catch (e) {
      console.warn('[CloudSyncManager] Aviso durante sincronização de arquivos PDF no Drive:', e);
    }
    return syncedCount;
  }

  /**
   * Executa a sincronização completa entre dados locais e Google Drive
   */
  public async syncNow(options?: { quiet?: boolean }): Promise<SyncExecutionResult> {
    if (this.isSyncInProgress) {
      return {
        success: false,
        message: 'Uma sincronização já está em andamento.',
      };
    }

    const auth = this.driveService.getAuthState();
    if (!auth.isAuthenticated) {
      this.notifyStatus('idle');
      return {
        success: false,
        message: 'Google Drive não conectado. Faça login para sincronizar.',
      };
    }

    this.isSyncInProgress = true;
    this.notifyStatus('syncing', 'Consultando dados no Google Drive...');

    try {
      // 1. Obtém os dados locais completos
      const localJsonStr = await defaultRepository.exportUserDataJson();
      const localData: UserDataBackupPayload = JSON.parse(localJsonStr);

      // 2. Procura arquivo de backup existente no Google Drive
      const remoteFile = await this.driveService.findBackupFile();

      let mergedPayload: UserDataBackupPayload;
      let stats: MergeStats;

      if (!remoteFile) {
        // Primeiro backup: envia todos os dados locais para o Google Drive
        this.notifyStatus('syncing', 'Criando backup inicial no Google Drive...');
        const uploaded = await this.driveService.uploadBackup(localData);

        stats = {
          charactersCount: localData.characters?.length || 0,
          weaponsCount: localData.customWeapons?.length || 0,
          customEntitiesCount: localData.customEntities?.length || 0,
          favoritesCount: localData.favorites?.length || 0,
          listsCount: localData.savedLists?.length || 0,
          conflictsResolved: 0,
        };

        // Atualiza perfil local com data de sincronização
        if (localData.userProfile) {
          await defaultRepository.saveUserProfile({
            ...localData.userProfile,
            cloudSyncEnabled: true,
            lastSyncAt: uploaded.modifiedTime,
          });
        }
      } else {
        // Arquivo remoto existe: baixa e realiza o Smart Merge
        this.notifyStatus('syncing', 'Baixando dados remotos para mesclagem...');
        const remoteData = await this.driveService.downloadBackup(remoteFile.id);

        this.notifyStatus('syncing', 'Mesclando alterações inteligentes...');
        const mergeResult = SmartMergeEngine.merge(localData, remoteData);
        mergedPayload = mergeResult.merged;
        stats = mergeResult.stats;

        // Se houver dados mais novos ou complementares para aplicar localmente
        if (mergeResult.hasLocalChangesToApply) {
          this.notifyStatus('syncing', 'Atualizando armazenamento local...');
          await defaultRepository.importUserDataJson(JSON.stringify(mergedPayload));
          await this.notifyDataReload();
        } else if (localData.userProfile) {
          // Apenas atualiza o timestamp de sync
          await defaultRepository.saveUserProfile({
            ...localData.userProfile,
            cloudSyncEnabled: true,
            lastSyncAt: new Date().toISOString(),
          });
        }

        // Se houver dados locais para subir para o Drive
        if (mergeResult.hasRemoteChangesToUpload || !remoteFile) {
          this.notifyStatus('syncing', 'Enviando alterações para o Google Drive...');
          await this.driveService.uploadBackup(mergedPayload, remoteFile.id);
        }
      }

      // 3. Sincroniza também os arquivos PDF (.pdf) entre o Google Drive do usuário e o armazenamento offline
      this.notifyStatus('syncing', 'Sincronizando PDFs offline com o Google Drive...');
      const pdfsSynced = await this.syncPdfBinariesWithDrive();
      if (pdfsSynced > 0) {
        stats.pdfsSyncedCount = (stats.pdfsSyncedCount || 0) + pdfsSynced;
        await this.notifyDataReload();
      }

      const nowIso = new Date().toISOString();
      this.lastStats = stats;
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATS, JSON.stringify(stats));

      this.notifyStatus('synced', 'Sincronização concluída com sucesso!');
      setTimeout(() => {
        if (this.currentStatus === 'synced') {
          this.notifyStatus('idle');
        }
      }, 4000);

      return {
        success: true,
        message: 'Dados sincronizados com sucesso!',
        stats,
        lastSyncAt: nowIso,
      };
    } catch (err: any) {
      console.error('Falha na sincronização com Google Drive:', err);
      const errMsg = err?.message || 'Erro durante a sincronização.';
      this.notifyStatus('error', errMsg);
      return {
        success: false,
        message: errMsg,
        error: errMsg,
      };
    } finally {
      this.isSyncInProgress = false;
    }
  }
}

export const cloudSyncManager = CloudSyncManager.getInstance();
