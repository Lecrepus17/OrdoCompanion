import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { TrainingDegree } from '../../types/compendium';

const ATTRIBUTE_VALUES = [-1, 0, 1, 2, 3, 4, 5, 6];
const TRAINING_DEGREES: Array<{ label: string; value: TrainingDegree }> = [
  { label: 'Destreinado (+0)', value: 0 },
  { label: 'Treinado (+5)', value: 5 },
  { label: 'Veterano (+10)', value: 10 },
  { label: 'Expert (+15)', value: 15 },
];

const QUICK_FORMULAS = ['1d4', '1d6', '1d8', '1d10', '1d12', '2d6', '4d6', '6d6', '2d8+4', '3d10+5'];

export default function DiceScreen() {
  const { rollSkillTest, rollFormula, rollHistory, clearRollHistory } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);

  const [attrDice, setAttrDice] = useState<number>(2);
  const [training, setTraining] = useState<TrainingDegree>(5);
  const [otherBonus, setOtherBonus] = useState<number>(0);
  const [customFormula, setCustomFormula] = useState<string>('4d6+4');

  const totalBonus = training + otherBonus;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 90 + bottomInset }]}>
      {/* Card 1: Teste de Perícia (Sistema Ordem Paranormal) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>Teste de Perícia (d20 Ordem Paranormal)</Text>
        </View>

        <Text style={styles.subLabel}>
          Atributo (Dados d20) — 0 rola 2d20 e escolhe o pior; 1+ escolhe o melhor:
        </Text>
        <View style={styles.rowWrap}>
          {ATTRIBUTE_VALUES.map((val) => {
            const active = attrDice === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.numPill, active && styles.numPillActive]}
                onPress={() => setAttrDice(val)}
              >
                <Text style={[styles.numPillText, active && styles.numPillTextActive]}>
                  {val <= 0 ? `${val} (${2 + Math.abs(val)}d20 pior)` : `${val}d20`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subLabel}>Grau de Treinamento:</Text>
        <View style={styles.rowWrap}>
          {TRAINING_DEGREES.map((deg) => {
            const active = training === deg.value;
            return (
              <TouchableOpacity
                key={deg.value}
                style={[styles.numPill, active && styles.numPillActive]}
                onPress={() => setTraining(deg.value)}
              >
                <Text style={[styles.numPillText, active && styles.numPillTextActive]}>
                  {deg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bonusRow}>
          <Text style={styles.subLabel}>Outros Modificadores / Bônus circunstanciais:</Text>
          <View style={styles.stepper}>
            {[-5, -2, -1, 1, 2, 5].map((delta) => (
              <TouchableOpacity
                key={delta}
                style={styles.stepBtn}
                onPress={() => setOtherBonus((b) => b + delta)}
              >
                <Text style={styles.stepBtnText}>{delta > 0 ? `+${delta}` : delta}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.stepBtn} onPress={() => setOtherBonus(0)}>
              <Text style={[styles.stepBtnText, { color: colors.primary }]}>Zerar</Text>
            </TouchableOpacity>
            <Text style={styles.bonusValue}>
              Total Bônus: {totalBonus >= 0 ? `+${totalBonus}` : totalBonus}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.rollMainBtn}
          onPress={() =>
            rollSkillTest(
              attrDice,
              totalBonus,
              `Teste (${attrDice}d20 ${totalBonus >= 0 ? '+' : ''}${totalBonus})`
            )
          }
        >
          <Ionicons name="dice" size={20} color="#FFF" />
          <Text style={styles.rollMainBtnText}>
            Rolar Teste ({attrDice}d20 {totalBonus >= 0 ? '+' : ''}${totalBonus})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card 2: Rolador Livre de Fórmulas */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calculator" size={20} color={colors.accent} />
          <Text style={styles.cardTitle}>Rolador Livre de Fórmulas (Dano / Cura / Efeito)</Text>
        </View>

        <View style={styles.formulaInputRow}>
          <TextInput
            style={styles.formulaInput}
            value={customFormula}
            onChangeText={setCustomFormula}
            placeholder="Ex: 4d6+10, 2d8+1d6, 8d6"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={styles.formulaRollBtn}
            onPress={() => rollFormula(customFormula, `Fórmula (${customFormula})`)}
          >
            <Text style={styles.formulaRollBtnText}>Rolar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowWrap}>
          {QUICK_FORMULAS.map((qf) => (
            <TouchableOpacity
              key={qf}
              style={styles.quickDieBtn}
              onPress={() => rollFormula(qf, `Dados (${qf})`)}
            >
              <Ionicons name="dice-outline" size={14} color={colors.accent} />
              <Text style={styles.quickDieText}>{qf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Histórico de Rolagens */}
      <View style={styles.card}>
        <View style={styles.historyHeader}>
          <Text style={styles.cardTitle}>Histórico da Sessão ({rollHistory.length})</Text>
          {rollHistory.length > 0 && (
            <TouchableOpacity onPress={clearRollHistory}>
              <Text style={styles.clearText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>

        {rollHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>Nenhuma rolagem feita ainda.</Text>
        ) : (
          rollHistory.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyLabel}>
                  {item.label} <Text style={styles.historyTime}>• {item.timestamp}</Text>
                </Text>
                <Text style={styles.historyDetail}>
                  {item.formulaText} → [{item.diceResults.join(', ')}]
                  {item.chosenDie !== undefined ? ` (Dado: ${item.chosenDie})` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.historyTotalBox,
                  item.isCritical && { borderColor: colors.success },
                  item.isFumble && { borderColor: colors.danger },
                ]}
              >
                <Text style={styles.historyTotalText}>{item.total}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 14,
      paddingBottom: 100,
      gap: 14,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    subLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    rowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    numPill: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    numPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    numPillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    numPillTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    bonusRow: {
      gap: 8,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    stepBtn: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    stepBtnText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 12,
    },
    bonusValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      minWidth: 36,
      textAlign: 'center',
    },
    rollMainBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 4,
    },
    rollMainBtnText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '900',
    },
    formulaInputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    formulaInput: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      height: 44,
    },
    formulaRollBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formulaRollBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 14,
    },
    quickDieBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    quickDieText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    clearText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    emptyHistory: {
      color: colors.textMuted,
      fontSize: 13,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    historyLabel: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    historyTime: {
      color: colors.textMuted,
      fontWeight: '400',
      fontSize: 11,
    },
    historyDetail: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    historyTotalBox: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      minWidth: 44,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    historyTotalText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
  });
