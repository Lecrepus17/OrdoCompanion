import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { MANUAL_SECTIONS, ManualFeatureItem, ManualSection, searchManual } from '../data/manualData';

interface AppManualModalProps {
  visible: boolean;
  onClose: () => void;
  initialSection?: string | null;
}

export const AppManualModal: React.FC<AppManualModalProps> = ({
  visible,
  onClose,
  initialSection,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [expandedFeatureIds, setExpandedFeatureIds] = useState<Record<string, boolean>>({});

  // Atualiza a seção inicial quando a modal abre
  useEffect(() => {
    if (visible) {
      if (initialSection && MANUAL_SECTIONS.some((s) => s.id === initialSection)) {
        setSelectedSectionId(initialSection);
      } else {
        setSelectedSectionId('all');
      }
      setSearchQuery('');
      // Scroll to top
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }
  }, [visible, initialSection]);

  // Seções filtradas por busca e categoria
  const filteredSections = useMemo(() => {
    let result = searchManual(searchQuery);
    if (selectedSectionId !== 'all') {
      result = result.filter((s) => s.id === selectedSectionId);
    }
    return result;
  }, [searchQuery, selectedSectionId]);

  const toggleFeatureExpand = (featureId: string) => {
    setExpandedFeatureIds((prev) => ({
      ...prev,
      [featureId]: prev[featureId] === undefined ? false : !prev[featureId],
    }));
  };

  const handleNavigateToScreen = (route?: string) => {
    if (!route) return;
    onClose();
    try {
      router.push(route as any);
    } catch {
      // Fallback seguro de navegação
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Header Superior */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="book" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Manual do Aplicativo</Text>
              <Text style={styles.headerSubtitle}>
                Guia completo de telas e funcionalidades
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Fechar Manual"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Barra de Pesquisa no Manual */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar telas, regras, passos de dano, rituais..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              if (txt.trim().length > 0 && selectedSectionId !== 'all') {
                setSelectedSectionId('all');
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Carrossel de Pílulas / Seções */}
        <View style={styles.pillsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
          >
            <TouchableOpacity
              style={[
                styles.pill,
                selectedSectionId === 'all' && styles.pillActive,
              ]}
              onPress={() => setSelectedSectionId('all')}
            >
              <Ionicons
                name="grid"
                size={14}
                color={selectedSectionId === 'all' ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.pillText,
                  selectedSectionId === 'all' && styles.pillTextActive,
                ]}
              >
                Todas as Telas
              </Text>
            </TouchableOpacity>

            {MANUAL_SECTIONS.map((sec) => {
              const active = selectedSectionId === sec.id;
              return (
                <TouchableOpacity
                  key={sec.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSelectedSectionId(sec.id)}
                >
                  <Ionicons
                    name={sec.icon as any}
                    size={14}
                    color={active ? '#FFF' : colors.textSecondary}
                  />
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {sec.badge}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Conteúdo Principal do Manual */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {filteredSections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="help-buoy-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum tópico encontrado</Text>
              <Text style={styles.emptyDesc}>
                Não encontramos tópicos para "{searchQuery}". Tente pesquisar por
                termos como "dados", "crítico", "atributos", "mira laser" ou "nuvem".
              </Text>
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedSectionId('all');
                }}
              >
                <Text style={styles.clearSearchBtnText}>Ver Todos os Tópicos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSections.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                {/* Cabeçalho da Seção */}
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleArea}>
                    <View style={styles.sectionIconWrap}>
                      <Ionicons
                        name={section.icon as any}
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{section.badge}</Text>
                        </View>
                      </View>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                    </View>
                  </View>
                </View>

                {/* Ação de ir para a tela se houver rota */}
                {section.route && (
                  <TouchableOpacity
                    style={styles.goToScreenBtn}
                    onPress={() => handleNavigateToScreen(section.route)}
                  >
                    <Ionicons name="open-outline" size={15} color={colors.primary} />
                    <Text style={styles.goToScreenBtnText}>Ir para esta tela no App</Text>
                  </TouchableOpacity>
                )}

                {/* Propósito / Resumo */}
                <View style={styles.purposeBox}>
                  <Text style={styles.purposeLabel}>🎯 O QUE ESTA TELA FAZ</Text>
                  <Text style={styles.purposeText}>{section.purpose}</Text>
                  <Text style={styles.summaryText}>{section.summary}</Text>
                </View>

                {/* Lista de Funcionalidades */}
                <Text style={styles.featuresHeader}>Funcionalidades e Como Usar:</Text>
                <View style={styles.featuresList}>
                  {section.features.map((feat, fIdx) => {
                    const isExpanded = expandedFeatureIds[feat.id] !== false; // Padrão aberto
                    return (
                      <View key={feat.id} style={styles.featureItemCard}>
                        <TouchableOpacity
                          style={styles.featureItemHeader}
                          onPress={() => toggleFeatureExpand(feat.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.featureTitleRow}>
                            <View style={styles.featureIndexBullet}>
                              <Text style={styles.featureIndexBulletText}>
                                {fIdx + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.featureTitle}>{feat.title}</Text>
                              {feat.badge && (
                                <Text style={styles.featureBadgeText}>
                                  {feat.badge}
                                </Text>
                              )}
                            </View>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={colors.textMuted}
                            />
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.featureItemBody}>
                            <Text style={styles.featureDescription}>
                              {feat.description}
                            </Text>

                            <View style={styles.howToUseWrap}>
                              <Text style={styles.howToUseTitle}>
                                📋 Passo a passo de uso:
                              </Text>
                              {feat.howToUse.map((step, sIdx) => (
                                <View key={sIdx} style={styles.stepRow}>
                                  <Text style={styles.stepDot}>•</Text>
                                  <Text style={styles.stepText}>{step}</Text>
                                </View>
                              ))}
                            </View>

                            {feat.formulaOrExample && (
                              <View style={styles.formulaBox}>
                                <Ionicons
                                  name="calculator-outline"
                                  size={15}
                                  color={colors.primary}
                                />
                                <Text style={styles.formulaText}>
                                  {feat.formulaOrExample}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Dica de Mestre */}
                {section.proTip && (
                  <View style={styles.proTipCard}>
                    <View style={styles.proTipHeader}>
                      <Ionicons name="bulb" size={17} color="#F59E0B" />
                      <Text style={styles.proTipTitle}>Dica de Mestre / Pro Tip</Text>
                    </View>
                    <Text style={styles.proTipText}>{section.proTip}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    headerIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 6,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      height: 42,
      fontSize: 13.5,
      color: colors.text,
    },
    pillsWrap: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    pillsContent: {
      paddingHorizontal: 16,
      gap: 8,
      alignItems: 'center',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    scrollBody: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 20,
      paddingBottom: 40,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    sectionTitleArea: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      flex: 1,
    },
    sectionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    badge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    badgeText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 2,
    },
    sectionSubtitle: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    goToScreenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    goToScreenBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.primary,
    },
    purposeBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      gap: 6,
    },
    purposeLabel: {
      fontSize: 10.5,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.8,
    },
    purposeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 18,
    },
    summaryText: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    featuresHeader: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginTop: 4,
    },
    featuresList: {
      gap: 10,
    },
    featureItemCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    featureItemHeader: {
      padding: 12,
    },
    featureTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureIndexBullet: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureIndexBulletText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    featureTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
    },
    featureBadgeText: {
      fontSize: 10.5,
      color: colors.primary,
      fontWeight: '600',
      marginTop: 1,
    },
    featureItemBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      paddingTop: 2,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    featureDescription: {
      fontSize: 12.5,
      color: colors.text,
      lineHeight: 18,
    },
    howToUseWrap: {
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      borderRadius: 8,
      padding: 10,
      gap: 5,
    },
    howToUseTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    stepDot: {
      fontSize: 13,
      color: colors.primary,
      lineHeight: 17,
    },
    stepText: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      lineHeight: 17,
    },
    formulaBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 9,
      borderRadius: 6,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    formulaText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    proTipCard: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#F59E0B',
      padding: 12,
      gap: 6,
    },
    proTipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    proTipTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#F59E0B',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    proTipText: {
      fontSize: 12.5,
      color: colors.text,
      lineHeight: 18,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    emptyDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    clearSearchBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    clearSearchBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
