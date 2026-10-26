import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CATEGORY_LABELS, COLORS, getElementStyle, ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { PdfViewerModal, PdfViewerMode } from '../../components/PdfViewerModal';
import { getRenderedPdfPageUrl } from '../../utils/pdfUrl';
import { confirmAction } from '../../utils/alert';

export default function EntityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const {
    books,
    getEntityById,
    hasOriginalVersion,
    resetEntityToDefault,
    deleteCustomEntity,
    favoriteIds,
    toggleFavorite,
    savedLists,
    toggleEntityInList,
    rollFormula,
    openManual,
  } = useApp();

  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const entity = getEntityById(id || '');
  const [pageViewerOpen, setPageViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<PdfViewerMode>('pdf_scroll');
  const [listModalOpen, setListModalOpen] = useState(false);

  if (!entity) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Registro não encontrado.</Text>
      </View>
    );
  }

  const isFav = favoriteIds.has(entity.id);
  const elStyle = getElementStyle(entity.element, colors);
  const catInfo = CATEGORY_LABELS[entity.category] || CATEGORY_LABELS.all;
  const entityBook = books.find((b) => b.id === entity.bookId) || null;
  const canRestoreDefault = hasOriginalVersion(entity.id);

  const handleOpenPageReader = (mode: PdfViewerMode = 'pdf_scroll') => {
    setViewerMode(mode);
    setPageViewerOpen(true);
  };

  const handleRestoreOriginal = () => {
    confirmAction({
      title: 'Restaurar versão original do PDF?',
      message: 'Isso desfará suas edições manuais neste registro e restaurará o texto original extraído do livro.',
      confirmText: 'Restaurar',
      destructive: true,
      onConfirm: async () => {
        await resetEntityToDefault(entity.id);
      },
    });
  };

  const handleDeleteCustom = () => {
    confirmAction({
      title: 'Excluir item personalizado?',
      message: `Tem certeza que deseja excluir "${entity.name}"?`,
      confirmText: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        await deleteCustomEntity(entity.id);
        router.back();
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + bottomInset }]}>
        {/* Barra superior de retorno explícito */}
        <TouchableOpacity
          style={styles.topBackBar}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          accessibilityLabel="Voltar para a listagem"
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={styles.topBackBarText}>Voltar para a listagem</Text>
        </TouchableOpacity>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { borderColor: catInfo.color }]}>
              <Text style={[styles.catBadgeText, { color: catInfo.color }]}>
                {entity.subCategory || catInfo.singular}
              </Text>
            </View>
            {entity.element && entity.element !== 'Nenhum' && (
              <View
                style={[
                  styles.elBadge,
                  { backgroundColor: elStyle.bg, borderColor: elStyle.border },
                ]}
              >
                <Text style={[styles.elBadgeText, { color: elStyle.text }]}>
                  {entity.element}
                </Text>
              </View>
            )}
            {entity.isCustom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>CRIADO PELO USUÁRIO</Text>
              </View>
            )}
            {entity.isEdited && !entity.isCustom && (
              <View style={[styles.customBadge, { backgroundColor: 'rgba(245,158,11,0.2)' }]}>
                <Text style={[styles.customBadgeText, { color: '#FBBF24' }]}>EDITADO</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{entity.name}</Text>

          <View style={styles.sourceRow}>
            <Ionicons name="book-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.sourceText}>
              Fonte: {entity.bookTitle} • Página {entity.pageNumber}
            </Text>
          </View>

          {/* Barra de Ações Rápidas */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isFav && styles.actionBtnActive]}
              onPress={() => toggleFavorite(entity.id)}
            >
              <Ionicons
                name={isFav ? 'bookmark' : 'bookmark-outline'}
                size={17}
                color={isFav ? colors.warning : colors.text}
              />
              <Text style={styles.actionBtnText}>{isFav ? 'Favoritado' : 'Favoritar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setListModalOpen(true)}
            >
              <Ionicons name="list-outline" size={17} color={colors.text} />
              <Text style={styles.actionBtnText}>Listas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/entity/editor', params: { editId: entity.id } })
              }
            >
              <Ionicons name="create-outline" size={17} color={colors.text} />
              <Text style={styles.actionBtnText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openManual('entity_detail_editor')}
            >
              <Ionicons name="help-circle-outline" size={17} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Manual</Text>
            </TouchableOpacity>

            {entity.bookId !== 'custom' && entityBook && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnBook]}
                onPress={() => handleOpenPageReader('pdf_scroll')}
              >
                <Ionicons name="document-attach-outline" size={17} color="#FCA5A5" />
                <Text style={[styles.actionBtnText, { color: '#FCA5A5' }]}>
                  Ver no PDF (Pág. {entity.pageNumber})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Metadados Específicos por Categoria */}
        {entity.category === 'ritual' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Parâmetros do Ritual</Text>
            <View style={styles.gridStats}>
              <StatItem label="Círculo" value={`${entity.circle ?? 1}º Círculo`} />
              <StatItem label="Execução" value={entity.execution || 'Padrão'} />
              <StatItem label="Alcance" value={entity.range || 'Curto'} />
              <StatItem label="Alvo / Área" value={entity.target || 'Veja texto'} />
              <StatItem label="Duração" value={entity.duration || 'Instantânea'} />
              <StatItem label="Resistência" value={entity.resistance || 'Nenhuma'} />
            </View>
          </View>
        )}

        {entity.category === 'creature' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Estatísticas da Ameaça</Text>
            <View style={styles.gridStats}>
              <StatItem label="VD (Desafio)" value={String(entity.vd ?? '—')} highlight />
              <StatItem label="Pontos de Vida" value={String(entity.pv ?? '—')} />
              <StatItem label="Defesa" value={String(entity.defense ?? '—')} />
              <StatItem
                label="Presença Perturbadora"
                value={entity.disturbingPresence || 'Nenhuma'}
              />
            </View>
            {entity.attributes && Object.keys(entity.attributes).length > 0 && (
              <View style={styles.attrsRow}>
                {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => (
                  <View key={attr} style={styles.attrBox}>
                    <Text style={styles.attrLabel}>{attr}</Text>
                    <Text style={styles.attrVal}>{entity.attributes?.[attr] ?? '0'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {(entity.category === 'weapon' || entity.category === 'item') &&
          (entity.damage || entity.itemCategory || entity.spaces) && (
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Especificações do Equipamento</Text>
              <View style={styles.gridStats}>
                {entity.itemCategory && (
                  <StatItem label="Categoria" value={`Cat. ${entity.itemCategory}`} />
                )}
                {entity.damage && <StatItem label="Dano" value={entity.damage} highlight />}
                {entity.critical && <StatItem label="Crítico" value={entity.critical} />}
                {entity.range && <StatItem label="Alcance" value={entity.range} />}
                {entity.damageType && <StatItem label="Tipo" value={entity.damageType} />}
                {entity.spaces && <StatItem label="Espaços" value={String(entity.spaces)} />}
              </View>
            </View>
          )}

        {entity.category === 'origin' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Benefícios da Origem</Text>
            <StatItem label="Perícias Treinadas" value={entity.trainedSkills || 'Veja descrição'} />
            <StatItem label="Poder de Origem" value={entity.powerName || 'Veja descrição'} />
          </View>
        )}

        {entity.category === 'class' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Características da Classe</Text>
            <View style={styles.gridStats}>
              <StatItem label="PV Iniciais" value={entity.initialPV || '—'} />
              <StatItem label="PV por NEX" value={entity.pvPerNex || '—'} />
              <StatItem label="PE Iniciais" value={entity.initialPE || '—'} />
              <StatItem label="PE por NEX" value={entity.pePerNex || '—'} />
              <StatItem label="SAN Inicial" value={entity.initialSAN || '—'} />
              <StatItem label="SAN por NEX" value={entity.sanPerNex || '—'} />
            </View>
            {entity.proficiencies && (
              <StatItem label="Proficiências" value={entity.proficiencies} />
            )}
          </View>
        )}

        {entity.category === 'track' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Informações da Trilha</Text>
            <View style={styles.gridStats}>
              <StatItem label="Classe Vinculada" value={entity.className || entity.subCategory} highlight />
              <StatItem label="Elemento" value={entity.element || 'Nenhum'} />
            </View>
          </View>
        )}

        {entity.category === 'power' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Parâmetros do Poder</Text>
            <View style={styles.gridStats}>
              <StatItem label="Tipo de Poder" value={entity.subCategory || 'Geral'} />
              <StatItem label="Elemento" value={entity.element || 'Nenhum'} />
              {Boolean(entity.prerequisite) && (
                <StatItem label="Pré-requisito" value={entity.prerequisite || '—'} />
              )}
              {Boolean(entity.affinity) && (
                <StatItem label="Afinidade" value={entity.affinity || '—'} />
              )}
            </View>
          </View>
        )}

        {entity.category === 'skill' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Parâmetros da Perícia</Text>
            <View style={styles.gridStats}>
              {Boolean(entity.baseAttribute) && (
                <StatItem label="Atributo-Chave" value={entity.baseAttribute || '—'} highlight />
              )}
              <StatItem
                label="Somente Treinada"
                value={entity.trainedOnly ? 'Sim (Exige Treinamento)' : 'Não (Permite Teste Puro)'}
              />
              <StatItem
                label="Penalidade de Armadura"
                value={entity.armorPenalty ? 'Sim (Aplica Penalidade)' : 'Não'}
              />
              {entity.requiresKit && (
                <StatItem label="Exige Kit" value="Sim (Requer Kit de Perícia)" />
              )}
            </View>
          </View>
        )}

        {entity.category === 'condition' && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Detalhes da Condição</Text>
            <View style={styles.gridStats}>
              <StatItem label="Classificação" value={entity.subCategory || 'Condição'} />
              <StatItem label="Elemento" value={entity.element || 'Nenhum'} />
            </View>
          </View>
        )}

        {/* Botões de Rolagem Rápida de Dados */}
        {entity.diceFormulas && entity.diceFormulas.length > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Rolagens Rápidas deste Registro</Text>
            <View style={styles.diceButtonsWrap}>
              {entity.diceFormulas.map((formula) => (
                <TouchableOpacity
                  key={formula}
                  style={styles.rollBigBtn}
                  onPress={() => rollFormula(formula, `${entity.name} (${formula})`)}
                >
                  <Ionicons name="dice" size={18} color="#FFF" />
                  <Text style={styles.rollBigBtnText}>Rolar {formula}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Descrição Principal */}
        <View style={styles.descCard}>
          <Text style={styles.sectionTitle}>Descrição e Regras</Text>
          <Text style={styles.descriptionText}>{entity.description}</Text>

          {Boolean(entity.discente) && (
            <View style={styles.upgradeBox}>
              <Text style={styles.upgradeLabel}>DISCENTE</Text>
              <Text style={styles.upgradeText}>{entity.discente}</Text>
            </View>
          )}

          {Boolean(entity.verdadeiro) && (
            <View style={[styles.upgradeBox, { borderColor: colors.accent }]}>
              <Text style={[styles.upgradeLabel, { color: colors.accent }]}>VERDADEIRO</Text>
              <Text style={styles.upgradeText}>{entity.verdadeiro}</Text>
            </View>
          )}
        </View>

        {/* Seção "Ver Mais" — Prévia Visual e Leitor Real da Página do PDF */}
        {entity.bookId !== 'custom' && entityBook && (
          <View style={styles.bookContextCard}>
            <View style={styles.bookContextHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Página Original do PDF</Text>
                <Text style={styles.bookContextSub}>
                  {entity.bookTitle} ({entityBook.fileName}) • Página {entity.pageNumber} de{' '}
                  {entityBook.pageCount}
                </Text>
              </View>
              <View style={styles.contextButtonsRow}>
                <TouchableOpacity
                  style={styles.openFullPageBtn}
                  onPress={() => handleOpenPageReader('pdf_scroll')}
                >
                  <Ionicons name="expand-outline" size={16} color="#FFF" />
                  <Text style={styles.openFullPageBtnText}>Abrir PDF na Pág. {entity.pageNumber}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.openTextModeBtn}
                  onPress={() => handleOpenPageReader('text')}
                >
                  <Ionicons name="reader-outline" size={16} color={colors.text} />
                  <Text style={styles.openTextModeBtnText}>Modo Texto</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Miniatura clicável da página real do PDF */}
            <TouchableOpacity
              style={styles.pdfPreviewBox}
              activeOpacity={0.88}
              onPress={() => handleOpenPageReader('pdf_scroll')}
            >
              <Image
                source={{
                  uri: getRenderedPdfPageUrl(entityBook.fileName, entity.pageNumber, 120),
                }}
                style={styles.pdfPreviewImage}
                resizeMode="contain"
              />
              <View style={styles.pdfPreviewFooterBadge}>
                <Ionicons name="search-outline" size={14} color="#FFF" />
                <Text style={styles.pdfPreviewFooterText}>
                  Toque para ampliar a página {entity.pageNumber} com Zoom e Sumário
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Ações de Restauração / Exclusão */}
        {canRestoreDefault && (
          <TouchableOpacity style={styles.dangerOutlineBtn} onPress={handleRestoreOriginal}>
            <Ionicons name="refresh-outline" size={18} color={colors.warning} />
            <Text style={[styles.dangerOutlineText, { color: colors.warning }]}>
              Restaurar texto original do PDF
            </Text>
          </TouchableOpacity>
        )}

        {entity.isCustom && (
          <TouchableOpacity style={styles.dangerOutlineBtn} onPress={handleDeleteCustom}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerOutlineText}>Excluir este registro personalizado</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Visualizador Real do PDF */}
      <PdfViewerModal
        visible={pageViewerOpen}
        onClose={() => setPageViewerOpen(false)}
        book={entityBook}
        initialPage={entity.pageNumber}
        highlightTerm={entity.name}
        initialMode={viewerMode}
      />

      {/* Modal Adicionar a Lista Salva */}
      <Modal
        visible={listModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setListModalOpen(false)}
      >
        <View style={[styles.modalBackdrop, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
          <View style={styles.listModalCard}>
            <Text style={styles.sectionTitle}>Salvar em Lista / Grimório</Text>
            {savedLists.length === 0 ? (
              <Text style={styles.emptyListHint}>
                Você ainda não criou listas personalizadas. Crie listas na aba "Salvos".
              </Text>
            ) : (
              savedLists.map((list) => {
                const inList = list.entityIds.includes(entity.id);
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.listOptionRow}
                    onPress={() => toggleEntityInList(list.id, entity.id)}
                  >
                    <Ionicons
                      name={inList ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={inList ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.listOptionName}>{list.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setListModalOpen(false)}
            >
              <Text style={styles.closeModalBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const StatItem: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: colors.primary, fontWeight: '900' }]}>
        {value}
      </Text>
    </View>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBackBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    topBackBarText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 15,
    },
    scrollContent: {
      padding: 14,
      paddingBottom: 100,
      gap: 12,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    catBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    catBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    elBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    elBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    customBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    customBadgeText: {
      color: '#34D399',
      fontSize: 10,
      fontWeight: '800',
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 6,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    sourceText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 10,
    },
    actionBtnActive: {
      borderColor: colors.warning,
    },
    actionBtnBook: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    actionBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    statsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      gap: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },
    gridStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 10,
      minWidth: '47%',
      flex: 1,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    statValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    attrsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 4,
    },
    attrBox: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    attrLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    attrVal: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    diceButtonsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    rollBigBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    rollBigBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 13,
    },
    descCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    descriptionText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    upgradeBox: {
      backgroundColor: colors.surfaceElevated,
      borderLeftWidth: 3,
      borderColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    upgradeLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
    },
    upgradeText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    bookContextCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      gap: 12,
    },
    bookContextHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    bookContextSub: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    contextButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    openFullPageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
    },
    openFullPageBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    openTextModeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 10,
    },
    openTextModeBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    pdfPreviewBox: {
      width: '100%',
      height: 340,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    pdfPreviewImage: {
      width: '100%',
      height: '100%',
    },
    pdfPreviewFooterBadge: {
      position: 'absolute',
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(15, 15, 20, 0.88)',
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    pdfPreviewFooterText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    dangerOutlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dangerOutlineText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
    readerContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    readerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    readerBookTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    readerPageSub: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    readerCloseBtn: {
      padding: 6,
    },
    readerScroll: {
      padding: 18,
    },
    readerFullText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 23,
    },
    readerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pageNavBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    pageNavText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    pageIndicator: {
      color: colors.textSecondary,
      fontWeight: '800',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    listModalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 10,
    },
    emptyListHint: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    listOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    listOptionName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    closeModalBtn: {
      marginTop: 8,
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
    },
    closeModalBtnText: {
      color: colors.text,
      fontWeight: '700',
    },
  });
}
