import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { getTabMetadata } from '../types/compendium';

interface MoreTabsModalProps {
  visible: boolean;
  onClose: () => void;
  overflowTabs: string[];
  activeRouteName: string;
  onSelectTab: (routeKey: string) => void;
  onOpenCustomize: () => void;
}

export const MoreTabsModal: React.FC<MoreTabsModalProps> = ({
  visible,
  onClose,
  overflowTabs,
  activeRouteName,
  onSelectTab,
  onOpenCustomize,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: bottomPadding,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Barra de Arraste Superior */}
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          {/* Cabeçalho do Modal */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <View style={styles.headerBadge}>
                <Ionicons name="apps" size={14} color={colors.primary} />
                <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
                  MENU DE TELAS
                </Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Outras Telas
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Selecione uma tela para navegar ou personalize as abas da barra inferior
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Lista de Abas do Modal */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {overflowTabs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Todas as abas estão na barra inferior
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Você fixou todas as telas disponíveis. O botão Mais não é mais necessário.
                </Text>
              </View>
            ) : (
              overflowTabs.map((tabKey) => {
                const meta = getTabMetadata(tabKey);
                const isActive = tabKey === activeRouteName;

                return (
                  <TouchableOpacity
                    key={tabKey}
                    style={[
                      styles.tabItem,
                      {
                        backgroundColor: isActive
                          ? colors.primarySoft
                          : colors.surfaceElevated,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      onSelectTab(tabKey);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.surfaceHighlight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={meta.icon as any}
                        size={20}
                        color={isActive ? '#FFFFFF' : colors.primary}
                      />
                    </View>

                    <View style={styles.tabInfo}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.tabTitle,
                            {
                              color: isActive ? colors.primary : colors.text,
                              fontWeight: isActive ? '900' : '700',
                            },
                          ]}
                        >
                          {meta.label}
                        </Text>
                        {isActive && (
                          <View
                            style={[
                              styles.activeBadge,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text style={styles.activeBadgeText}>Tela Atual</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.tabDescription, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {meta.description}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={isActive ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Botão de Atalho para Personalização no Rodapé */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.customizeButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                onClose();
                onOpenCustomize();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="reorder-four-outline" size={18} color={colors.primary} />
              <Text style={[styles.customizeButtonText, { color: colors.text }]}>
                Personalizar Ordem & Abas
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitles: {
    flex: 1,
    marginRight: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  headerBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabTitle: {
    fontSize: 14,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
  },
  tabDescription: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  customizeButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    flex: 1,
    marginLeft: 8,
  },
});
