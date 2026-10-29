import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CardThemeDefinition, RecordCardData } from '../../services/cardImage/types';

export interface RecordImageCardProps {
  data: RecordCardData;
  theme: CardThemeDefinition;
  compact?: boolean;
}

export const RecordImageCard: React.FC<RecordImageCardProps> = ({
  data,
  theme,
  compact = false,
}) => {
  const { colors } = theme;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.bgGradientStart,
          borderColor: colors.borderColor,
        },
      ]}
      testID="record-image-card-preview"
    >
      {/* Moldura Interna Ornamental */}
      <View style={[styles.innerFrame, { borderColor: colors.borderColor }]}>
        {/* Cantoneiras Visuais */}
        <View style={[styles.cornerTL, { borderColor: colors.accent }]} />
        <View style={[styles.cornerTR, { borderColor: colors.accent }]} />
        <View style={[styles.cornerBL, { borderColor: colors.accent }]} />
        <View style={[styles.cornerBR, { borderColor: colors.accent }]} />

        {/* 1. Header Badges: Categoria, Elemento e Livro */}
        <View style={styles.headerBadgesRow}>
          <View style={[styles.badge, { backgroundColor: colors.badgeBg, borderColor: colors.borderColor }]}>
            <Text style={[styles.badgeText, { color: colors.badgeText }]}>
              {(data.categoryLabel || data.category).toUpperCase()}
            </Text>
          </View>

          {data.element && (
            <View style={[styles.badge, { backgroundColor: colors.badgeBg, borderColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>
                {theme.elementGlyph} {data.element.toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.sourceWrap}>
            <Text style={[styles.sourceText, { color: colors.textMuted }]}>
              {data.bookTitle || 'Compêndio'}{data.pageNumber ? ` • p. ${data.pageNumber}` : ''}
            </Text>
          </View>
        </View>

        {/* 2. Título do Registro */}
        <Text style={[styles.title, { color: colors.textColor }]} numberOfLines={2}>
          {data.name}
        </Text>

        {data.subCategory && data.subCategory !== data.name && (
          <Text style={[styles.subCategory, { color: colors.accent }]}>
            {data.subCategory.toUpperCase()}
          </Text>
        )}

        {/* Divisória com Cor do Tema */}
        <View style={[styles.divider, { backgroundColor: colors.accent }]} />

        {/* 3. Grid de Estatísticas / Parâmetros */}
        {data.stats.length > 0 && (
          <View style={styles.statsGrid}>
            {data.stats.slice(0, 6).map((st, i) => (
              <View
                key={i}
                style={[
                  styles.statBox,
                  {
                    backgroundColor: colors.surfaceBg,
                    borderColor: st.highlight ? colors.accent : colors.borderColor,
                    borderWidth: st.highlight ? 1.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {st.label.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: st.highlight ? colors.accent : colors.textColor },
                  ]}
                  numberOfLines={1}
                >
                  {st.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. Resumo em Itálico (se houver) */}
        {data.summary && (
          <View
            style={[
              styles.summaryBox,
              {
                backgroundColor: colors.surfaceBg,
                borderColor: colors.borderColor,
                borderLeftColor: colors.accent,
              },
            ]}
          >
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              "{data.summary}"
            </Text>
          </View>
        )}

        {/* 5. Descrição do Registro */}
        <View style={styles.descriptionWrap}>
          <Text
            style={[styles.descriptionText, { color: colors.textColor }]}
            numberOfLines={compact ? 4 : 12}
          >
            {data.description}
          </Text>
        </View>

        {/* 6. Seções Extras (Discente, Verdadeiro, etc.) */}
        {data.extraSections && data.extraSections.length > 0 && (
          <View style={styles.extraSectionsWrap}>
            {data.extraSections.slice(0, 2).map((sec, idx) => (
              <View key={idx} style={styles.extraSecItem}>
                <Text style={[styles.extraSecTitle, { color: sec.accentColor || colors.accent }]}>
                  {sec.title}
                </Text>
                <Text style={[styles.extraSecContent, { color: colors.textSecondary }]} numberOfLines={2}>
                  {sec.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 7. Rodapé Institucional Ordo Realitas */}
        <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
          <Text style={[styles.mottoText, { color: colors.textMuted }]} numberOfLines={1}>
            "{theme.motto}"
          </Text>
          <View style={styles.footerBrandRow}>
            <Text style={[styles.sealText, { color: colors.primary }]}>
              ORDO REALITAS • COMPÊNDIO OFICIAL
            </Text>
            <Text style={[styles.appBrandText, { color: colors.textMuted }]}>
              ORDO COMPANION
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  innerFrame: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 16,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 14,
    height: 14,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerTR: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 14,
    height: 14,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sourceWrap: {
    marginLeft: 'auto',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subCategory: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  divider: {
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  summaryBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  descriptionWrap: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13.5,
    lineHeight: 20,
    opacity: 0.95,
  },
  extraSectionsWrap: {
    gap: 8,
    marginBottom: 12,
  },
  extraSecItem: {
    paddingTop: 4,
  },
  extraSecTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  extraSecContent: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  mottoText: {
    fontSize: 10.5,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  footerBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sealText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  appBrandText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
