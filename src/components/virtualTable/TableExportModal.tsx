import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { TableRollEvent, VirtualTableRoomState } from '../../types/virtualTable';
import {
  buildTableSessionExportData,
  exportSessionToJsonFile,
  exportSessionToPdfFile,
} from '../../services/virtualTable/tableSessionExportService';
import { showAlert } from '../../utils/alert';

interface TableExportModalProps {
  visible: boolean;
  onClose: () => void;
  virtualTable: VirtualTableRoomState | null;
  tableRecentRolls: TableRollEvent[];
  campaignTitle?: string;
}

export function TableExportModal({
  visible,
  onClose,
  virtualTable,
  tableRecentRolls,
  campaignTitle,
}: TableExportModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isExporting, setIsExporting] = useState<'json' | 'pdf' | null>(null);

  if (!virtualTable) return null;

  const exportData = buildTableSessionExportData(
    virtualTable,
    tableRecentRolls,
    campaignTitle
  );

  const handleExportJson = async () => {
    setIsExporting('json');
    try {
      const res = await exportSessionToJsonFile(exportData);
      if (res.success) {
        showAlert('Exportação Concluída', `Histórico da sessão exportado com sucesso (${res.filename}).`);
        onClose();
      } else {
        showAlert('Erro na Exportação', res.error || 'Não foi possível exportar os dados em JSON.');
      }
    } catch (err: any) {
      showAlert('Erro na Exportação', err?.message || 'Falha inesperada ao exportar JSON.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting('pdf');
    try {
      const res = await exportSessionToPdfFile(exportData);
      if (res.success) {
        showAlert('Resumo Tático Gerado', `Dossiê em PDF pronto para compartilhamento (${res.filename}).`);
        onClose();
      } else {
        showAlert('Erro ao Gerar PDF', res.error || 'Não foi possível gerar o resumo tático em PDF.');
      }
    } catch (err: any) {
      showAlert('Erro ao Gerar PDF', err?.message || 'Falha inesperada ao gerar PDF.');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="document-text" size={22} color={colors.primary} />
              <View>
                <Text style={styles.modalTitle}>Exportar Histórico de Sessão</Text>
                <Text style={styles.modalSub}>
                  Mesa {virtualTable.roomId} • {virtualTable.title || 'Sessão da Ordem'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isExporting !== null}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fechar Modal de Exportação"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Resumo da Sessão */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>DADOS DISPONÍVEIS NESTA SESSÃO</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricNum}>{exportData.metrics.totalRolls}</Text>
                  <Text style={styles.metricLabel}>Rolagens</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricNum, { color: '#F59E0B' }]}>
                    {exportData.metrics.criticalHits} / {exportData.metrics.fumbles}
                  </Text>
                  <Text style={styles.metricLabel}>Crít./Desastre</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricNum, { color: '#EF4444' }]}>
                    {exportData.metrics.totalCombatants}
                  </Text>
                  <Text style={styles.metricLabel}>Combatentes</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricNum, { color: '#38BDF8' }]}>
                    {exportData.metrics.cluesFound}/{exportData.metrics.totalClues}
                  </Text>
                  <Text style={styles.metricLabel}>Pistas</Text>
                </View>
              </View>
            </View>

            {/* Opções de Exportação */}
            <Text style={styles.sectionHeader}>FORMATO DE EXPORTAÇÃO</Text>

            {/* Opção 1: JSON */}
            <TouchableOpacity
              style={[styles.exportOptionCard, isExporting !== null && { opacity: 0.6 }]}
              onPress={handleExportJson}
              disabled={isExporting !== null}
              testID="export-json-btn"
            >
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                {isExporting === 'json' ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Ionicons name="code-download-outline" size={24} color="#3B82F6" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Exportar JSON Estruturado</Text>
                <Text style={styles.optionDesc}>
                  Logs completos com dados rolados, modificadores de combate, danos sofridos, iniciativas e eventos de cena para arquivo ou análise externa.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Opção 2: PDF Tático */}
            <TouchableOpacity
              style={[
                styles.exportOptionCard,
                { borderColor: 'rgba(239, 68, 68, 0.4)' },
                isExporting !== null && { opacity: 0.6 },
              ]}
              onPress={handleExportPdf}
              disabled={isExporting !== null}
              testID="export-pdf-btn"
            >
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                {isExporting === 'pdf' ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="newspaper-outline" size={24} color="#EF4444" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Gerar Resumo Tático (PDF)</Text>
                <Text style={styles.optionDesc}>
                  Dossiê oficial da Ordo Realitas formatado em alta resolução, pronto para compartilhar via Expo Sharing com jogadores e mestres.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </ScrollView>

          {/* Rodapé do Modal */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isExporting !== null}
            >
              <Text style={styles.cancelBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    modalSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    summaryBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 8,
    },
    summaryTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricNum: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.text,
    },
    metricLabel: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 2,
      fontWeight: '700',
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginTop: 4,
    },
    exportOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    optionDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 3,
      lineHeight: 16,
    },
    modalFooter: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'flex-end',
    },
    cancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
  });
