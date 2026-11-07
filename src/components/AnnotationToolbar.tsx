import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnnotationToolType } from '../types/annotations';
import { ThemeColors, useTheme } from '../theme';

export interface AnnotationToolbarProps {
  currentTool: AnnotationToolType;
  onSelectTool: (tool: AnnotationToolType) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  currentWidth: number;
  onSelectWidth: (width: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onClearPage: () => void;
  onCloseToolbar: () => void;
  isTablet?: boolean;
}

const PRESET_COLORS = [
  { id: 'sangue', label: 'Sangue', hex: '#EF4444' },
  { id: 'conhecimento', label: 'Conhecimento', hex: '#EAB308' },
  { id: 'energia', label: 'Energia', hex: '#3B82F6' },
  { id: 'morte', label: 'Morte', hex: '#9CA3AF' },
  { id: 'lodo', label: 'Medo', hex: '#10B981' },
  { id: 'branco', label: 'Branco', hex: '#FFFFFF' },
];

const PRESET_WIDTHS = [
  { label: 'Fino', value: 2.5, iconSize: 4 },
  { label: 'Médio', value: 6, iconSize: 8 },
  { label: 'Grosso', value: 14, iconSize: 14 },
];

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  currentWidth,
  onSelectWidth,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  onClearPage,
  onCloseToolbar,
  isTablet = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, isTablet && styles.tabletContainer]}>
      {/* Indicador Tático Stylus / Tablet */}
      <View style={styles.headerRow}>
        <View style={styles.badgeWrap}>
          <Ionicons name="pencil" size={13} color="#EF4444" />
          <Text style={styles.badgeText}>
            {isTablet ? 'Mesa Digitalizadora & Tablet Ativo' : 'Anotações Manuais'}
          </Text>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={[styles.actionBtn, !canUndo && styles.disabledBtn]}
            onPress={onUndo}
            disabled={!canUndo}
            accessibilityLabel="Desfazer traço"
          >
            <Ionicons
              name="arrow-undo-outline"
              size={16}
              color={canUndo ? colors.text : colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, !canRedo && styles.disabledBtn]}
            onPress={onRedo}
            disabled={!canRedo}
            accessibilityLabel="Refazer traço"
          >
            <Ionicons
              name="arrow-redo-outline"
              size={16}
              color={canRedo ? colors.text : colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.clearBtn]}
            onPress={onClearPage}
            accessibilityLabel="Limpar todas as anotações desta página"
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onCloseToolbar}
            accessibilityLabel="Concluir anotações"
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
            <Text style={styles.closeBtnText}>Concluir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.controlsScroll}
      >
        {/* Seletor de Ferramenta */}
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={[
              styles.toolBtn,
              currentTool === 'pen' && styles.toolBtnActive,
            ]}
            onPress={() => onSelectTool('pen')}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={currentTool === 'pen' ? '#FFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.toolBtnText,
                currentTool === 'pen' && styles.toolBtnTextActive,
              ]}
            >
              Caneta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolBtn,
              currentTool === 'highlighter' && styles.toolBtnActive,
            ]}
            onPress={() => onSelectTool('highlighter')}
          >
            <Ionicons
              name="brush-outline"
              size={16}
              color={currentTool === 'highlighter' ? '#FFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.toolBtnText,
                currentTool === 'highlighter' && styles.toolBtnTextActive,
              ]}
            >
              Marca-Texto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolBtn,
              currentTool === 'eraser' && styles.toolBtnActive,
            ]}
            onPress={() => onSelectTool('eraser')}
          >
            <Ionicons
              name="backspace-outline"
              size={16}
              color={currentTool === 'eraser' ? '#FFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.toolBtnText,
                currentTool === 'eraser' && styles.toolBtnTextActive,
              ]}
            >
              Borracha
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Cores (apenas quando caneta ou marca-texto) */}
        {currentTool !== 'eraser' && (
          <View style={styles.sectionGroup}>
            {PRESET_COLORS.map((c) => {
              const isSelected = currentColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <TouchableOpacity
                  key={`color_${c.id}`}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.hex },
                    isSelected && styles.colorCircleSelected,
                  ]}
                  onPress={() => onSelectColor(c.hex)}
                  accessibilityLabel={`Cor ${c.label}`}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={c.hex === '#FFFFFF' || c.hex === '#EAB308' ? '#000' : '#FFF'}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {currentTool !== 'eraser' && <View style={styles.divider} />}

        {/* Espessura do Traço */}
        {currentTool !== 'eraser' && (
          <View style={styles.sectionGroup}>
            {PRESET_WIDTHS.map((w) => {
              const isSelected = Math.abs(currentWidth - w.value) < 1;
              return (
                <TouchableOpacity
                  key={`width_${w.label}`}
                  style={[
                    styles.widthBtn,
                    isSelected && styles.widthBtnActive,
                  ]}
                  onPress={() => onSelectWidth(w.value)}
                  accessibilityLabel={`Espessura ${w.label}`}
                >
                  <View
                    style={[
                      styles.widthDot,
                      {
                        width: w.iconSize,
                        height: w.iconSize,
                        borderRadius: w.iconSize / 2,
                        backgroundColor: isSelected ? '#FFF' : colors.textSecondary,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.widthText,
                      isSelected && styles.widthTextActive,
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 35,
  },
  tabletContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.35,
  },
  clearBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  controlsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  sectionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: '#DC2626',
  },
  toolBtnText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },
  toolBtnTextActive: {
    color: '#FFF',
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorCircleSelected: {
    borderColor: '#FFF',
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  widthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#27272A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  widthBtnActive: {
    backgroundColor: '#3F3F46',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  widthDot: {
    backgroundColor: '#FFF',
  },
  widthText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
  },
  widthTextActive: {
    color: '#FFF',
  },
});
