import React, { useEffect } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export interface PrerequisiteAlertModalProps {
  visible: boolean;
  entityName: string;
  unmetDetails: string[];
  category?: 'power' | 'ritual' | 'entity';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PrerequisiteAlertModal({
  visible,
  entityName,
  unmetDetails,
  category = 'entity',
  onConfirm,
  onCancel,
}: PrerequisiteAlertModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Intercepta botão físico de retorno no Android
  useEffect(() => {
    if (Platform.OS === 'web' || typeof document !== 'undefined' || !visible) return;
    const onBackPress = () => {
      onCancel();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onCancel]);

  if (!visible) return null;

  const categoryLabel =
    category === 'power'
      ? 'este poder'
      : category === 'ritual'
      ? 'este ritual'
      : 'este elemento';

  const detailsList =
    unmetDetails && unmetDetails.length > 0
      ? unmetDetails
      : ['Pré-requisito específico não atendido pelo personagem atual.'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID="prerequisite-alert-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.warningIconBadge}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Pré-requisitos Não Atendidos</Text>
                <Text style={styles.headerSubtitle}>
                  Validação Permissiva • Ordem Paranormal
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onCancel}
              accessibilityLabel="Fechar alerta de pré-requisitos"
              testID="btn-close-prereq-modal"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.explanationText}>
              O personagem não cumpre todos os pré-requisitos exigidos para selecionar{' '}
              {categoryLabel}{' '}
              <Text style={styles.entityNameHighlight}>"{entityName}"</Text>:
            </Text>

            <View style={styles.unmetListContainer}>
              <Text style={styles.unmetSectionLabel}>Requisitos Pendentes:</Text>
              {detailsList.map((detail, idx) => (
                <View key={`${idx}-${detail}`} style={styles.unmetItemRow}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.unmetItemText}>{detail}</Text>
                </View>
              ))}
            </View>

            <View style={styles.permissiveNoteBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.permissiveNoteText}>
                Caso tenha autorização do Mestre ou esteja utilizando regras customizadas de mesa, você pode adicionar {categoryLabel} mesmo assim.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              testID="btn-cancel-prereq"
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              testID="btn-confirm-permissive-prereq"
            >
              <Ionicons name="checkmark-circle-outline" size={17} color="#FFF" />
              <Text style={styles.confirmBtnText}>Adicionar mesmo assim</Text>
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
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 460,
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#F59E0B60',
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.65)',
        } as any,
        default: {
          elevation: 10,
        },
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    warningIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#F59E0B20',
      borderWidth: 1,
      borderColor: '#F59E0B60',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceHighlight,
    },
    body: {
      paddingHorizontal: 16,
    },
    bodyContent: {
      paddingVertical: 14,
      gap: 12,
    },
    explanationText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    entityNameHighlight: {
      fontWeight: '800',
      color: colors.text,
    },
    unmetListContainer: {
      backgroundColor: '#EF444412',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: '#EF444445',
      gap: 8,
    },
    unmetSectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#EF4444',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    unmetItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    unmetItemText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 18,
    },
    permissiveNoteBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    permissiveNoteText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: '#D97706',
    },
    confirmBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFF',
    },
  });
