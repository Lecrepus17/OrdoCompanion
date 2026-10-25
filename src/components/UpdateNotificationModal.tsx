import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { UpdateCheckResult } from '../services/updates/types';
import { updateCheckerService } from '../services/updates/UpdateCheckerService';

interface UpdateNotificationModalProps {
  visible: boolean;
  updateInfo: UpdateCheckResult | null;
  onDismiss: () => void;
  onDownload?: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  visible,
  updateInfo,
  onDismiss,
  onDownload,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  if (!visible || !updateInfo) {
    return null;
  }

  const {
    currentVersion,
    latestVersion,
    releaseName,
    releaseDate,
    changelog,
    downloadUrl,
    apkUrl,
    isMandatory,
  } = updateInfo;

  const handleDownload = async () => {
    const targetUrl = apkUrl || downloadUrl;
    if (onDownload) {
      onDownload();
    }
    await updateCheckerService.openDownloadUrl(targetUrl);
  };

  const handleOpenGitHub = async () => {
    await updateCheckerService.openDownloadUrl(downloadUrl);
  };

  const handleDismiss = async () => {
    if (!isMandatory) {
      await updateCheckerService.dismissUpdate(latestVersion);
      onDismiss();
    }
  };

  const formattedDate = releaseDate
    ? new Date(releaseDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isMandatory ? undefined : handleDismiss}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.card}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, isMandatory && styles.iconCircleMandatory]}>
              <Ionicons
                name={isMandatory ? 'alert-circle' : 'cloud-download'}
                size={28}
                color={isMandatory ? colors.danger : colors.primary}
              />
            </View>

            <View style={styles.headerTextContainer}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isMandatory ? 'rgba(239, 68, 68, 0.15)' : colors.primarySoft,
                      borderColor: isMandatory ? colors.danger : colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isMandatory ? colors.danger : colors.primary },
                    ]}
                  >
                    {isMandatory ? 'ATUALIZAÇÃO OBRIGATÓRIA' : 'NOVA VERSÃO DISPONÍVEL'}
                  </Text>
                </View>
              </View>

              <Text style={styles.title} numberOfLines={2}>
                {releaseName || `Versão ${latestVersion}`}
              </Text>

              {formattedDate && (
                <Text style={styles.releaseDate}>Lançado em: {formattedDate}</Text>
              )}
            </View>
          </View>

          {/* Comparativo de Versão */}
          <View style={styles.versionRow}>
            <View style={styles.versionBox}>
              <Text style={styles.versionBoxLabel}>Sua Versão</Text>
              <Text style={styles.versionBoxValue}>v{currentVersion}</Text>
            </View>

            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} style={styles.versionArrow} />

            <View style={[styles.versionBox, styles.versionBoxNew]}>
              <Text style={[styles.versionBoxLabel, { color: colors.primary }]}>Nova Versão</Text>
              <Text style={[styles.versionBoxValue, { color: colors.primary }]}>v{latestVersion}</Text>
            </View>
          </View>

          {isMandatory && (
            <View style={styles.mandatoryAlert}>
              <Ionicons name="warning" size={16} color={colors.danger} />
              <Text style={styles.mandatoryAlertText}>
                Esta atualização é necessária para manter a compatibilidade do sistema e das suas fichas.
              </Text>
            </View>
          )}

          {/* Lista de Novidades (Changelog) */}
          <Text style={styles.changelogHeader}>O que há de novo:</Text>
          <ScrollView style={styles.changelogScroll} showsVerticalScrollIndicator>
            {changelog.length > 0 ? (
              changelog.map((item, index) => (
                <View key={index} style={styles.changelogItem}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.primary} style={styles.bulletIcon} />
                  <Text style={styles.changelogText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.changelogEmptyText}>
                Correções gerais, otimizações de performance e melhorias no compêndio paranormal.
              </Text>
            )}
          </ScrollView>

          {/* Dica para Instalação de APK no Android */}
          <View style={styles.apkTipBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.apkTipText}>
              No Android, toque no arquivo baixado para atualizar. Todas as suas fichas, campanhas e configurações são preservadas!
            </Text>
          </View>

          {/* Ações */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: colors.primary }]}
              onPress={handleDownload}
              activeOpacity={0.8}
            >
              <Ionicons name={apkUrl ? 'logo-android' : 'download-outline'} size={18} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>
                {apkUrl ? 'Baixar Nova Versão (APK)' : 'Baixar Nova Versão'}
              </Text>
            </TouchableOpacity>

            {apkUrl && downloadUrl && apkUrl !== downloadUrl && (
              <TouchableOpacity
                style={styles.githubButton}
                onPress={handleOpenGitHub}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-github" size={16} color={colors.textSecondary} />
                <Text style={styles.githubButtonText}>Ver Notas no GitHub</Text>
              </TouchableOpacity>
            )}

            {!isMandatory && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissButtonText}>Lembrar mais tarde</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    card: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    iconCircleMandatory: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: colors.danger,
    },
    headerTextContainer: {
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 22,
    },
    releaseDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    versionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionBox: {
      alignItems: 'center',
      flex: 1,
    },
    versionBoxNew: {
      borderLeftWidth: 1,
      borderColor: colors.border,
    },
    versionArrow: {
      paddingHorizontal: 8,
    },
    versionBoxLabel: {
      fontSize: 11,
      color: colors.textMuted,
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: 2,
    },
    versionBoxValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    mandatoryAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      gap: 8,
      marginBottom: 14,
    },
    mandatoryAlertText: {
      flex: 1,
      fontSize: 12,
      color: colors.danger,
      lineHeight: 16,
      fontWeight: '600',
    },
    changelogHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    changelogScroll: {
      maxHeight: 160,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 16,
    },
    changelogItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 8,
    },
    bulletIcon: {
      marginTop: 2,
    },
    changelogText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    changelogEmptyText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    apkTipBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      gap: 8,
      marginBottom: 16,
    },
    apkTipText: {
      flex: 1,
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 15,
    },
    actions: {
      gap: 8,
    },
    downloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    downloadButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    githubButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    githubButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    dismissButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    dismissButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
