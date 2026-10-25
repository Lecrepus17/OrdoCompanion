import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import {
  AiCitation,
  AiMessage,
  AiSuggestedAction,
  ConcreteRelicPersona,
  ParanormalRelic,
  RELIC_PERSONAS,
} from '../types/ai';
import { cleanInternalTags, cleanLatex } from '../services/ai/AiClient';

export { cleanInternalTags, cleanLatex };

function renderInlineSpans(text: string, baseStyle: any, keyPrefix: string, accentColor: string) {
  const regex = /(\*\*.*?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text
          key={`${keyPrefix}_bold_${index}`}
          style={[baseStyle, { fontWeight: '800', color: accentColor }]}
        >
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text
          key={`${keyPrefix}_code_${index}`}
          style={[
            baseStyle,
            {
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: accentColor,
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 4,
              fontSize: 12,
              fontWeight: '700',
            },
          ]}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      return (
        <Text key={`${keyPrefix}_italic_${index}`} style={[baseStyle, { fontStyle: 'italic', opacity: 0.9 }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={`${keyPrefix}_txt_${index}`} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

interface AiChatMessageItemProps {
  message: AiMessage;
  isAnfitriaoActive?: boolean;
  activeRelic?: ParanormalRelic;
  onOpenBook: (bookId: string, pageNumber: number) => void;
  onOpenEntity: (entityName: string) => void;
  onRollDice: (formula: string) => void;
  onNavigateTab: (tabName: string) => void;
}

export function AiChatMessageItem({
  message,
  isAnfitriaoActive = false,
  activeRelic,
  onOpenBook,
  onOpenEntity,
  onRollDice,
  onNavigateTab,
}: AiChatMessageItemProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const [isCitationsOpen, setIsCitationsOpen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(true);

  const hasCitations = Boolean(message.citations && message.citations.length > 0);
  const hasActions = Boolean(message.suggestedActions && message.suggestedActions.length > 0);

  // Determina a persona da mensagem: pela mensagem, por keywords ou pela ativa
  const personaKey: ConcreteRelicPersona = (() => {
    if (isUser) return 'none';
    if (message.relicPersona) return message.relicPersona;

    const content = message.content;
    if (content.includes('O ANFITRIÃO') || content.includes('SENHORAS E SENHORES DO CAOS')) {
      return 'anfitriao';
    }
    if (content.includes('A MAGISTRADA') || content.includes('MÁSCARA DO DESESPERO') || content.includes('TRIBUNAL DO EQUILÍBRIO')) {
      return 'magistrada';
    }
    if (content.includes('DEUS DA MORTE') || content.includes('CORAÇÃO DE LODO') || content.includes('TEMPO ESCORRE')) {
      return 'deus_da_morte';
    }
    if (content.includes('O DIABO') || content.includes('TRONO DE SANGUE') || content.includes('SANGUE FERVILHA')) {
      return 'diabo';
    }

    if (activeRelic && activeRelic !== 'random') {
      return activeRelic;
    }
    if (isAnfitriaoActive) {
      return 'anfitriao';
    }
    return 'none';
  })();

  const relicInfo = RELIC_PERSONAS[personaKey];
  const accentColor = personaKey === 'none' ? colors.primary : relicInfo.color;
  const accentBg = personaKey === 'none' ? colors.primarySoft : relicInfo.accentBg;

  const handleCopy = async () => {
    try {
      const clean = cleanInternalTags(message.content);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clean);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const renderActionBtn = (action: AiSuggestedAction, index: number) => {
    let iconName: keyof typeof Ionicons.glyphMap = 'help-circle-outline';
    let cardBg = colors.surfaceElevated;
    let cardBorder = colors.border;
    let iconBg = 'rgba(255, 255, 255, 0.06)';
    let primaryText = colors.text;
    let actionBadgeText = 'Abrir';

    if (action.type === 'open_book') {
      iconName = 'book-outline';
      cardBg = accentBg;
      cardBorder = accentColor;
      iconBg = accentBg;
      primaryText = accentColor;
      actionBadgeText = 'Ler PDF ↗';
    } else if (action.type === 'open_entity') {
      iconName = 'search-outline';
      cardBg = colors.surfaceElevated;
      cardBorder = colors.border;
      iconBg = 'rgba(168, 85, 247, 0.15)';
      primaryText = colors.text;
      actionBadgeText = 'Compêndio ↗';
    } else if (action.type === 'roll_dice') {
      iconName = 'dice-outline';
      cardBg = 'rgba(16, 185, 129, 0.08)';
      cardBorder = 'rgba(16, 185, 129, 0.35)';
      iconBg = 'rgba(16, 185, 129, 0.2)';
      primaryText = '#10B981';
      actionBadgeText = '🎲 Rolar';
    } else if (action.type === 'navigate_tab') {
      iconName = 'arrow-forward-circle-outline';
      cardBg = colors.surfaceElevated;
      cardBorder = colors.border;
      iconBg = 'rgba(255, 255, 255, 0.08)';
      primaryText = colors.text;
      actionBadgeText = 'Ir ↗';
    }

    return (
      <TouchableOpacity
        key={`${action.type}_${index}`}
        onPress={() => {
          if (action.type === 'open_book' && action.payload.bookId && action.payload.pageNumber) {
            onOpenBook(action.payload.bookId, Number(action.payload.pageNumber));
          } else if (action.type === 'open_entity' && action.payload.entityId) {
            const cleanEntity = String(action.payload.entityId).replace(/^["']|["']$/g, '').trim();
            onOpenEntity(cleanEntity);
          } else if (action.type === 'roll_dice' && action.payload.formula) {
            onRollDice(String(action.payload.formula).trim());
          } else if (action.type === 'navigate_tab' && action.payload.tabName) {
            onNavigateTab(String(action.payload.tabName).trim());
          }
        }}
        activeOpacity={0.75}
        style={[
          styles.actionCard,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
        ]}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={15} color={primaryText} />
        </View>
        <Text style={[styles.actionCardTitle, { color: primaryText }]} numberOfLines={1}>
          {action.label}
        </Text>
        <View style={[styles.actionCardBadge, { borderColor: cardBorder }]}>
          <Text style={[styles.actionCardBadgeText, { color: primaryText }]}>
            {actionBadgeText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCitationBtn = (cit: AiCitation, index: number) => {
    return (
      <TouchableOpacity
        key={`cit_${cit.bookId}_${cit.pageNumber}_${index}`}
        onPress={() => onOpenBook(cit.bookId, cit.pageNumber)}
        activeOpacity={0.75}
        style={[
          styles.citationCard,
          {
            backgroundColor: personaKey !== 'none' ? accentBg : colors.surfaceElevated,
            borderColor: personaKey !== 'none' ? accentColor : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.citationIconBadge,
            {
              backgroundColor: accentBg,
            },
          ]}
        >
          <Ionicons
            name="book"
            size={12}
            color={accentColor}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              styles.citationBookTitle,
              { color: personaKey !== 'none' ? accentColor : colors.text },
            ]}
            numberOfLines={1}
          >
            {cit.bookTitle}
          </Text>
          <Text style={[styles.citationPageNumber, { color: colors.textMuted }]}>
            Página {cit.pageNumber} {cit.section ? `• ${cit.section}` : ''}
          </Text>
        </View>
        <Ionicons
          name="open-outline"
          size={14}
          color={accentColor}
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>
    );
  };

  const renderMessageContent = () => {
    const cleaned = cleanInternalTags(message.content);

    if (isUser) {
      return (
        <Text
          style={[
            styles.userMessageText,
            {
              color: '#FFFFFF',
            },
          ]}
          selectable
        >
          {cleaned}
        </Text>
      );
    }

    const lines = cleaned.split('\n');

    return (
      <View style={{ gap: 4 }}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <View key={`blank_${idx}`} style={{ height: 4 }} />;
          }

          // Divisor de seção (---)
          if (trimmed === '---' || trimmed === '___' || trimmed === '***') {
            return (
              <View
                key={`hr_${idx}`}
                style={[
                  styles.divider,
                  {
                    backgroundColor: personaKey !== 'none' ? accentBg : colors.border,
                  },
                ]}
              />
            );
          }

          // Banner de Operação Offline
          if (
            trimmed.includes('[MODO OFFLINE — G.L.I.T.C.H.]') ||
            trimmed.includes('Operando através dos registros locais armazenados no dispositivo')
          ) {
            return (
              <View
                key={`offline_banner_${idx}`}
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: 'rgba(59, 130, 246, 0.25)',
                  },
                ]}
              >
                <Ionicons name="cloud-offline" size={14} color="#3B82F6" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#3B82F6' }}>
                    RESPOSTA DOS REGISTROS LOCAIS (OFFLINE)
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                    Base canônica dos 10 suplementos oficiais e manual do aplicativo
                  </Text>
                </View>
              </View>
            );
          }

          // Banner de Entrada de Relíquia (Anfitrião, Magistrada, Deus da Morte, Diabo)
          if (
            trimmed.includes('OOOPS! O ANFITRIÃO CHEGOU!') ||
            trimmed.includes('O TRIBUNAL DO EQUILÍBRIO SE MANIFESTA!') ||
            trimmed.includes('O TEMPO ESCORRE NO LODO...') ||
            trimmed.includes('O SANGUE FERVILHA NO TRONO!')
          ) {
            return (
              <View
                key={`relic_banner_${idx}`}
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor: accentBg,
                    borderColor: accentColor,
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{relicInfo.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: accentColor, letterSpacing: 0.3 }}>
                    {relicInfo.tagline.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.textSecondary, marginTop: 1, fontStyle: 'italic' }}>
                    Manifestação direta de {relicInfo.name} ({relicInfo.relicName})
                  </Text>
                </View>
              </View>
            );
          }

          // Título Nível 1 ou 2 (## ou #)
          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            const hText = trimmed.replace(/^#{1,2}\s*/, '');
            return (
              <View
                key={`h2_${idx}`}
                style={[
                  styles.headingCard,
                  {
                    backgroundColor: accentBg,
                    borderLeftColor: accentColor,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '900',
                    color: accentColor,
                    letterSpacing: 0.3,
                  }}
                  selectable
                >
                  {hText}
                </Text>
              </View>
            );
          }

          // Título Nível 3 (###)
          if (trimmed.startsWith('### ')) {
            const hText = trimmed.replace(/^###\s*/, '');
            return (
              <View key={`h3_${idx}`} style={styles.subHeadingRow}>
                <View style={[styles.subHeadingBar, { backgroundColor: accentColor }]} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: accentColor,
                  }}
                  selectable
                >
                  {hText}
                </Text>
              </View>
            );
          }

          // Citação em bloco / Fórmula / Regra (> )
          if (trimmed.startsWith('> ')) {
            const quoteContent = trimmed.replace(/^>\s*/, '');
            const isFormula = quoteContent.includes('Regra') || quoteContent.includes('Fórmula') || quoteContent.includes('Dano');
            const isTip = quoteContent.includes('Dica') || quoteContent.includes('Diretriz') || quoteContent.includes('Sussurro');

            return (
              <View
                key={`quote_${idx}`}
                style={[
                  styles.calloutCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderLeftColor: isTip ? '#10B981' : isFormula ? '#3B82F6' : accentColor,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Text style={{ fontSize: 13, marginTop: 1 }}>
                    {isTip ? '💡' : isFormula ? '📐' : '📜'}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      lineHeight: 18,
                      color: colors.textSecondary,
                      fontStyle: isFormula ? 'normal' : 'italic',
                    }}
                    selectable
                  >
                    {renderInlineSpans(quoteContent, { color: colors.textSecondary, fontSize: 12.5 }, `q_${idx}`, accentColor)}
                  </Text>
                </View>
              </View>
            );
          }

          // Item de Lista / Marcador (•, -, *)
          if (
            trimmed.startsWith('• ') ||
            trimmed.startsWith('- ') ||
            (trimmed.startsWith('* ') && !trimmed.startsWith('** '))
          ) {
            const listText = trimmed.replace(/^([•\-*])\s*/, '');
            return (
              <View key={`bullet_${idx}`} style={styles.bulletRow}>
                <View
                  style={[
                    styles.bulletDot,
                    { backgroundColor: accentColor },
                  ]}
                />
                <Text style={styles.bulletText} selectable>
                  {renderInlineSpans(listText, { color: colors.text, fontSize: 13 }, `b_${idx}`, accentColor)}
                </Text>
              </View>
            );
          }

          // Linha normal de texto com suporte a formatação inline (negrito, itálico, código)
          return (
            <Text
              key={`line_${idx}`}
              style={[
                styles.paragraphText,
                {
                  color: colors.text,
                },
              ]}
              selectable
            >
              {renderInlineSpans(line, { color: colors.text, fontSize: 13 }, `l_${idx}`, accentColor)}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.containerUser : styles.containerAssistant,
      ]}
    >
      {/* Avatar do Assistente (Lado Esquerdo) */}
      {!isUser && (
        <View
          style={[
            styles.avatarBox,
            {
              backgroundColor: accentBg,
              borderColor: accentColor,
            },
          ]}
        >
          <Text style={{ fontSize: 15 }}>{relicInfo.emoji}</Text>
        </View>
      )}

      {/* Balão da Mensagem */}
      <View
        style={[
          styles.bubble,
          isUser
            ? [
                styles.bubbleUser,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]
            : [
                styles.bubbleAssistant,
                {
                  backgroundColor: colors.surface,
                  borderColor: personaKey !== 'none' ? accentColor : colors.border,
                },
              ],
        ]}
      >
        {/* Cabeçalho do Assistente */}
        {!isUser && (
          <View style={[styles.assistantHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  styles.assistantName,
                  { color: accentColor },
                ]}
                numberOfLines={1}
              >
                {relicInfo.name.toUpperCase()}
              </Text>

              {/* Tag de Papel da Relíquia */}
              <View
                style={[
                  styles.rolePill,
                  {
                    backgroundColor: accentBg,
                    borderColor: accentColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    { color: accentColor },
                  ]}
                  numberOfLines={1}
                >
                  {relicInfo.roleTag}
                </Text>
              </View>
            </View>

            {/* Ação Rápida de Copiar no Topo */}
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.copyBtn,
                { backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : colors.surfaceElevated },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={12}
                color={copied ? '#10B981' : colors.textMuted}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: copied ? '#10B981' : colors.textMuted,
                }}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Conteúdo Formatado da Mensagem */}
        <View style={styles.bodyWrap}>{renderMessageContent()}</View>

        {/* FONTES E AÇÕES RÁPIDAS (MINIMIZADO / EXPANSÍVEL SOB DEMANDA) */}
        {!isUser && (hasCitations || hasActions) && (
          <View style={[styles.collapsibleFooterContainer, { borderTopColor: colors.border }]}>
            {!isFooterExpanded ? (
              // ESTADO MINIMIZADO (COMPACTO)
              <TouchableOpacity
                onPress={() => setIsFooterExpanded(true)}
                activeOpacity={0.7}
                style={[
                  styles.collapsedPillBar,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: personaKey !== 'none' ? accentColor : colors.border,
                  },
                ]}
                accessibilityLabel="Expandir fontes e ações rápidas"
              >
                <View style={styles.collapsedInfoLeft}>
                  <View style={[styles.collapsedIconBadge, { backgroundColor: accentBg }]}>
                    <Ionicons
                      name={hasCitations ? 'library' : 'flash'}
                      size={12}
                      color={accentColor}
                    />
                  </View>
                  <Text
                    style={[styles.collapsedSummaryText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {hasCitations && hasActions
                      ? `${message.citations!.length} ${message.citations!.length === 1 ? 'Fonte' : 'Fontes'} • ${message.suggestedActions!.length} ${message.suggestedActions!.length === 1 ? 'Ação Rápida' : 'Ações Rápidas'}`
                      : hasCitations
                      ? `${message.citations!.length} ${message.citations!.length === 1 ? 'Fonte citada nos Livros' : 'Fontes citadas nos Livros'}`
                      : `${message.suggestedActions!.length} ${message.suggestedActions!.length === 1 ? 'Ação Rápida no App' : 'Ações Rápidas no App'}`}
                  </Text>
                </View>

                <View style={[styles.collapsedToggleBtn, { backgroundColor: accentBg }]}>
                  <Text style={[styles.collapsedToggleBtnText, { color: accentColor }]}>
                    Exibir
                  </Text>
                  <Ionicons name="chevron-down" size={13} color={accentColor} />
                </View>
              </TouchableOpacity>
            ) : (
              // ESTADO EXPANDIDO
              <View
                style={[
                  styles.expandedBlock,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: personaKey !== 'none' ? accentColor : colors.border,
                  },
                ]}
              >
                {/* Cabeçalho do Drawer */}
                <View style={styles.expandedHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <Ionicons name="layers-outline" size={13} color={accentColor} />
                    <Text
                      style={[
                        styles.expandedHeaderTitle,
                        { color: personaKey !== 'none' ? accentColor : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {personaKey === 'anfitriao'
                        ? 'FONTES DO ESPETÁCULO & AÇÕES'
                        : personaKey === 'magistrada'
                        ? 'AUTOS DO TRIBUNAL & AÇÕES'
                        : personaKey === 'deus_da_morte'
                        ? 'MEMÓRIAS DO TEMPO & AÇÕES'
                        : personaKey === 'diabo'
                        ? 'REGISTROS DE SANGUE & AÇÕES'
                        : 'FONTES & AÇÕES RÁPIDAS'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsFooterExpanded(false)}
                    activeOpacity={0.7}
                    style={[styles.collapsedToggleBtn, { backgroundColor: accentBg }]}
                    accessibilityLabel="Ocultar fontes e ações rápidas"
                  >
                    <Text style={[styles.collapsedToggleBtnText, { color: accentColor }]}>
                      Ocultar
                    </Text>
                    <Ionicons name="chevron-up" size={13} color={accentColor} />
                  </TouchableOpacity>
                </View>

                {/* Citações dos Livros (Card Dedicado) */}
                {hasCitations && (
                  <View style={styles.subBlock}>
                    <TouchableOpacity
                      onPress={() => setIsCitationsOpen(!isCitationsOpen)}
                      activeOpacity={0.7}
                      style={styles.subBlockHeader}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                        <Ionicons name="library" size={12} color={accentColor} />
                        <Text style={[styles.blockTitleText, { color: colors.textSecondary }]}>
                          {personaKey !== 'none'
                            ? `FONTES DE ${relicInfo.name.toUpperCase()} (LIVROS OFICIAIS):`
                            : 'PÁGINAS CITADAS NOS LIVROS:'}
                        </Text>
                        <View style={[styles.countBadge, { backgroundColor: accentBg }]}>
                          <Text style={[styles.countBadgeText, { color: accentColor }]}>
                            {message.citations!.length}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isCitationsOpen ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {isCitationsOpen && (
                      <View style={styles.citationList}>
                        {message.citations!.map((cit, idx) => renderCitationBtn(cit, idx))}
                      </View>
                    )}
                  </View>
                )}

                {/* Ações Rápidas no Aplicativo (Card Dedicado) */}
                {hasActions && (
                  <View style={[styles.subBlock, hasCitations && { marginTop: 6 }]}>
                    <TouchableOpacity
                      onPress={() => setIsActionsOpen(!isActionsOpen)}
                      activeOpacity={0.7}
                      style={styles.subBlockHeader}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                        <Ionicons name="flash" size={12} color={accentColor} />
                        <Text style={[styles.blockTitleText, { color: colors.textSecondary }]}>
                          AÇÕES RÁPIDAS NO APLICATIVO:
                        </Text>
                        <View style={[styles.countBadge, { backgroundColor: accentBg }]}>
                          <Text style={[styles.countBadgeText, { color: accentColor }]}>
                            {message.suggestedActions!.length}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isActionsOpen ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {isActionsOpen && (
                      <View style={styles.actionGrid}>
                        {message.suggestedActions!.map((act, idx) => renderActionBtn(act, idx))}
                      </View>
                    )}
                  </View>
                )}

                {/* Botão de Fechar no Rodapé do Bloco Expandido */}
                <TouchableOpacity
                  onPress={() => setIsFooterExpanded(false)}
                  activeOpacity={0.7}
                  style={[styles.closeBottomBtn, { borderTopColor: colors.border }]}
                >
                  <Ionicons name="chevron-up" size={13} color={colors.textMuted} />
                  <Text style={[styles.closeBottomBtnText, { color: colors.textMuted }]}>
                    Recolher fontes e ações
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Rodapé do Balão */}
        <View style={styles.footerRow}>
          <Text
            style={[
              styles.timestampText,
              { color: isUser ? 'rgba(255, 255, 255, 0.75)' : colors.textMuted },
            ]}
          >
            {message.timestamp}
          </Text>
        </View>
      </View>

      {/* Avatar do Usuário (Lado Direito) */}
      {isUser && (
        <View
          style={[
            styles.avatarBox,
            styles.userAvatarBox,
            { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          <Ionicons name="person" size={15} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  containerUser: {
    justifyContent: 'flex-end',
  },
  containerAssistant: {
    justifyContent: 'flex-start',
  },
  avatarBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 2,
  },
  userAvatarBox: {
    marginLeft: 2,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  bubbleUser: {
    borderTopRightRadius: 4,
  },
  bubbleAssistant: {
    borderTopLeftRadius: 4,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  assistantName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bodyWrap: {
    marginTop: 2,
  },
  userMessageText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  paragraphText: {
    fontSize: 13,
    lineHeight: 20.5,
  },
  divider: {
    height: 1,
    marginVertical: 6,
    borderRadius: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  headingCard: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3.5,
    marginTop: 6,
    marginBottom: 4,
  },
  subHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  subHeadingBar: {
    width: 3.5,
    height: 13,
    borderRadius: 2,
  },
  calloutCard: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderLeftWidth: 3.5,
    marginVertical: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 1.5,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19.5,
  },
  citationsBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionsBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  collapsibleFooterContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  collapsedPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  collapsedInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  collapsedIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  collapsedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  collapsedToggleBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  expandedBlock: {
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  expandedHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subBlock: {
    gap: 6,
  },
  subBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  countBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  closeBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 7,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closeBottomBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  blockTitleText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  citationList: {
    flexDirection: 'column',
    gap: 6,
  },
  citationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    gap: 8,
  },
  citationIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citationBookTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  citationPageNumber: {
    fontSize: 10,
    marginTop: 1,
  },
  actionGrid: {
    flexDirection: 'column',
    gap: 6,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    gap: 7,
  },
  actionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  actionCardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  actionCardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestampText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
});
