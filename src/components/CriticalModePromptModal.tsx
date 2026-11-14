import React, { useEffect } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { CriticalDamageMode } from '../types/compendium';

export interface CriticalModePromptModalProps {
  visible: boolean;
  weaponName?: string;
  isMaxDamage?: boolean;
  onSelect: (mode: Exclude<CriticalDamageMode, 'ask_user'>) => void;
  onClose: () => void;
}

/**
 * Modal exibido quando o perfil do usuário está em "Perguntar Sempre" (`ask_user`)
 * para escolher entre multiplicar a quantidade de dados ou multiplicar o resultado
 * dos dados base no acerto crítico.
 */
export const CriticalModePromptModal: React.FC<CriticalModePromptModalProps> = ({
  visible,
  weaponName,
  isMaxDamage,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS !== 'web' && typeof document === 'undefined') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => sub.remove();
    }
    return undefined;
  }, [visible, onClose]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="flame" size={20} color="#EF4444" />
              <Text style={styles.title} numberOfLines={2}>
                {isMaxDamage ? 'Crítico Máximo' : 'Acerto Crítico'}
                {weaponName ? ` • ${weaponName}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Como deseja calcular os dados multiplicados deste crítico?
          </Text>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => onSelect('multiply_dice')}
            testID="btn-crit-choice-multiply-dice"
          >
            <View style={styles.optionIconWrap}>
              <Ionicons name="dice" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Multiplica Dados (Padrão)</Text>
              <Text style={styles.optionDesc}>
                Multiplica a quantidade de dados base da arma (ex.: 1d4+2 em x2 → 2d4+2).
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => onSelect('multiply_damage')}
            testID="btn-crit-choice-multiply-damage"
          >
            <View style={[styles.optionIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
              <Ionicons name="calculator" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Multiplica Resultado</Text>
              <Text style={styles.optionDesc}>
                Rola os dados base e multiplica o resultado deles (ex.: 1d4+2 em x2 → (1d4 × 2) + 2).
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            testID="btn-crit-choice-cancel"
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flex: 1,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    optionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    optionDesc: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    cancelBtn: {
      marginTop: 2,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
