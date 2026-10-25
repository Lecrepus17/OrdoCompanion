import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeDefinition, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';

interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ visible, onClose }) => {
  const { themeId, setThemeId, availableThemes, colors } = useTheme();
  const { openManual } = useApp();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const getThemeIcon = (id: string) => {
    switch (id) {
      case 'dark':
        return 'moon';
      case 'sangue':
        return 'water';
      case 'morte':
        return 'skull';
      case 'conhecimento':
        return 'eye';
      case 'purple':
        return 'flash';
      case 'medo':
        return 'flame';
      case 'light':
        return 'sunny';
      default:
        return 'color-palette';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Cabeçalho */}
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="color-palette" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Aparência & Temas</Text>
                    <Text style={styles.subtitle}>Personalize a estética do aplicativo</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      openManual('themes');
                    }}
                    style={styles.closeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Manual dos Temas"
                  >
                    <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lista de Temas */}
              <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
                {availableThemes.map((item: ThemeDefinition) => {
                  const isSelected = item.id === themeId;
                  const itemIcon = getThemeIcon(item.id);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.themeCard,
                        isSelected && {
                          borderColor: item.colors.primary,
                          borderWidth: 2,
                          backgroundColor: colors.surfaceHighlight,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setThemeId(item.id)}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardInfoLeft}>
                          <View
                            style={[
                              styles.themeIconBox,
                              {
                                backgroundColor: item.colors.primarySoft,
                                borderColor: item.colors.primary,
                              },
                            ]}
                          >
                            <Ionicons name={itemIcon as any} size={18} color={item.colors.primary} />
                          </View>
                          <View style={styles.textWrap}>
                            <View style={styles.nameRow}>
                              <Text style={styles.themeName}>{item.name}</Text>
                              <View
                                style={[
                                  styles.modeBadge,
                                  {
                                    backgroundColor: item.isDark
                                      ? 'rgba(0,0,0,0.4)'
                                      : 'rgba(255,255,255,0.7)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.modeBadgeText,
                                    { color: item.isDark ? '#A1A1AA' : '#475569' },
                                  ]}
                                >
                                  {item.isDark ? 'Escuro' : 'Claro'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.themeSubtitle}>{item.subtitle}</Text>
                          </View>
                        </View>

                        {/* Indicador de Seleção */}
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && {
                              borderColor: item.colors.primary,
                              backgroundColor: item.colors.primary,
                            },
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </View>
                      </View>

                      <Text style={styles.themeDescription}>{item.description}</Text>

                      {/* Amostras da Paleta (Color Swatches) */}
                      <View style={styles.paletteRow}>
                        <Text style={styles.paletteLabel}>Paleta:</Text>
                        <View style={styles.swatches}>
                          {item.previewColors.map((hex, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.swatchCircle,
                                { backgroundColor: hex, borderColor: colors.border },
                              ]}
                            />
                          ))}
                        </View>
                        {isSelected && (
                          <View
                            style={[
                              styles.activeTag,
                              { backgroundColor: item.colors.primarySoft, borderColor: item.colors.primary },
                            ]}
                          >
                            <Text style={[styles.activeTagText, { color: item.colors.primary }]}>
                              TEMA ATIVO
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.footerNote}>
                  <Ionicons name="sparkles-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.footerNoteText}>
                    O tema selecionado é salvo e persistido automaticamente nas preferências do dispositivo.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 18,
    },
    container: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
    },
    scrollList: {
      paddingBottom: 8,
      gap: 12,
    },
    themeCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardInfoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    themeIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themeName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    modeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
    },
    modeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    themeSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeDescription: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    paletteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 2,
    },
    paletteLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    swatches: {
      flexDirection: 'row',
      gap: 6,
    },
    swatchCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
    },
    activeTag: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    activeTagText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    footerNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 10,
      padding: 10,
      marginTop: 6,
    },
    footerNoteText: {
      fontSize: 11,
      color: colors.textMuted,
      flex: 1,
      lineHeight: 15,
    },
  });
