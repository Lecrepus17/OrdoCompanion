import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CATEGORY_LABELS, ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { EntityCategory } from '../../types/compendium';

const EDITABLE_CATEGORIES: EntityCategory[] = [
  'ritual',
  'power',
  'origin',
  'class',
  'track',
  'weapon',
  'item',
  'creature',
  'skill',
  'condition',
  'rule',
];

const ELEMENTS = ['Nenhum', 'Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo', 'Variável'];

export default function EntityEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);
  const { editId, defaultCategory } = useLocalSearchParams<{
    editId?: string;
    defaultCategory?: EntityCategory;
  }>();
  const { getEntityById, createEntity, updateEntity, openManual } = useApp();

  const existing = editId ? getEntityById(editId) : undefined;

  const [category, setCategory] = useState<EntityCategory>(
    existing?.category || (defaultCategory as EntityCategory) || 'ritual'
  );
  const [name, setName] = useState(existing?.name || '');
  const [subCategory, setSubCategory] = useState(
    existing?.subCategory || CATEGORY_LABELS[category]?.singular || 'Ritual'
  );
  const [element, setElement] = useState(existing?.element || 'Nenhum');
  const [summary, setSummary] = useState(existing?.summary || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [bookTitle, setBookTitle] = useState(
    existing?.bookTitle || 'Conteúdo Pessoal (Homebrew)'
  );
  const [pageNumber, setPageNumber] = useState(String(existing?.pageNumber || 1));
  const [diceFormulasText, setDiceFormulasText] = useState(
    (existing?.diceFormulas || []).join(', ')
  );

  // Category-specific fields
  const [circle, setCircle] = useState(String(existing?.circle || 1));
  const [execution, setExecution] = useState(existing?.execution || 'padrão');
  const [range, setRange] = useState(existing?.range || 'curto');
  const [target, setTarget] = useState(existing?.target || '1 ser');
  const [duration, setDuration] = useState(existing?.duration || 'instantânea');
  const [resistance, setResistance] = useState(existing?.resistance || 'Nenhuma');
  const [discente, setDiscente] = useState(existing?.discente || '');
  const [verdadeiro, setVerdadeiro] = useState(existing?.verdadeiro || '');

  const [vd, setVd] = useState(String(existing?.vd || 20));
  const [pv, setPv] = useState(String(existing?.pv || 40));
  const [defense, setDefense] = useState(String(existing?.defense || 18));

  const [itemCategory, setItemCategory] = useState(existing?.itemCategory || 'I');
  const [damage, setDamage] = useState(existing?.damage || '');
  const [critical, setCritical] = useState(existing?.critical || 'x2');
  const [spaces, setSpaces] = useState(String(existing?.spaces || '1'));

  const [trainedSkills, setTrainedSkills] = useState(existing?.trainedSkills || '');
  const [powerName, setPowerName] = useState(existing?.powerName || '');

  // Power fields
  const [prerequisite, setPrerequisite] = useState(existing?.prerequisite || '');
  const [powerAffinity, setPowerAffinity] = useState(existing?.affinity || '');

  // Track fields
  const [className, setClassName] = useState(existing?.className || 'Combatente');

  // Skill fields
  const [baseAttribute, setBaseAttribute] = useState<string>(existing?.baseAttribute || 'AGI');
  const [trainedOnly, setTrainedOnly] = useState<boolean>(Boolean(existing?.trainedOnly));
  const [armorPenalty, setArmorPenalty] = useState<boolean>(Boolean(existing?.armorPenalty));
  const [requiresKit, setRequiresKit] = useState<boolean>(Boolean(existing?.requiresKit));

  // Class fields
  const [initialPV, setInitialPV] = useState(existing?.initialPV || '12 + Vigor');
  const [pvPerNex, setPvPerNex] = useState(existing?.pvPerNex || '3 PV (+Vig)');
  const [initialPE, setInitialPE] = useState(existing?.initialPE || '2 + Presença');
  const [pePerNex, setPePerNex] = useState(existing?.pePerNex || '2 PE (+Pre)');
  const [initialSAN, setInitialSAN] = useState(existing?.initialSAN || '16');
  const [sanPerNex, setSanPerNex] = useState(existing?.sanPerNex || '4 SAN');
  const [proficiencies, setProficiencies] = useState(existing?.proficiencies || 'Armas simples.');

  const handleSave = async () => {
    if (!name.trim()) return;

    const parsedFormulas = diceFormulasText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      category,
      subCategory: subCategory.trim() || CATEGORY_LABELS[category]?.singular || 'Item',
      name: name.trim(),
      bookId: existing?.bookId || 'custom',
      bookTitle: bookTitle.trim() || 'Conteúdo Pessoal (Homebrew)',
      pageNumber: parseInt(pageNumber, 10) || 1,
      element,
      summary: summary.trim() || description.trim().slice(0, 140),
      description: description.trim(),
      tags: [CATEGORY_LABELS[category]?.singular || category, element, bookTitle.trim()],
      diceFormulas: parsedFormulas,
      ...(category === 'ritual'
        ? {
            circle: parseInt(circle, 10) || 1,
            execution,
            range,
            target,
            duration,
            resistance,
            discente,
            verdadeiro,
          }
        : {}),
      ...(category === 'creature'
        ? {
            vd: parseInt(vd, 10) || 20,
            pv: parseInt(pv, 10) || 40,
            defense: parseInt(defense, 10) || 15,
          }
        : {}),
      ...(category === 'weapon' || category === 'item'
        ? {
            itemCategory,
            damage,
            critical,
            spaces,
          }
        : {}),
      ...(category === 'origin'
        ? {
            trainedSkills,
            powerName,
          }
        : {}),
      ...(category === 'power'
        ? {
            prerequisite,
            affinity: powerAffinity,
          }
        : {}),
      ...(category === 'track'
        ? {
            className,
          }
        : {}),
      ...(category === 'skill'
        ? {
            baseAttribute: baseAttribute as any,
            trainedOnly,
            armorPenalty,
            requiresKit,
          }
        : {}),
      ...(category === 'class'
        ? {
            initialPV,
            pvPerNex,
            initialPE,
            pePerNex,
            initialSAN,
            sanPerNex,
            proficiencies,
          }
        : {}),
    };

    if (existing) {
      await updateEntity(existing.id, payload);
      router.back();
    } else {
      const created = await createEntity(payload);
      router.replace({ pathname: '/entity/[id]', params: { id: created.id } });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomInset }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={styles.cancelTopBtn}
          accessibilityLabel="Cancelar e voltar"
        >
          <Ionicons name="arrow-back" size={17} color={colors.text} />
          <Text style={styles.cancelTopBtnText}>Cancelar</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>
          {existing ? `Editar: ${existing.name}` : 'Novo Registro no Compêndio'}
        </Text>
        <TouchableOpacity
          onPress={() => openManual('entity_detail_editor')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: colors.primary,
          }}
        >
          <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Manual</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Categoria</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
        {EDITABLE_CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => {
                setCategory(cat);
                if (!existing) {
                  setSubCategory(CATEGORY_LABELS[cat]?.singular || cat);
                }
              }}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {CATEGORY_LABELS[cat]?.label || cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>Nome *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Lâmina de Sangue, Aberração Sombria..."
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Subcategoria / Tipo</Text>
          <TextInput
            style={styles.input}
            value={subCategory}
            onChangeText={setSubCategory}
            placeholder="Ex: 2º Círculo, Poder Geral..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={{ width: 100 }}>
          <Text style={styles.label}>Página</Text>
          <TextInput
            style={styles.input}
            value={pageNumber}
            onChangeText={setPageNumber}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.label}>Elemento Paranormal</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
        {ELEMENTS.map((el) => {
          const active = element === el;
          return (
            <TouchableOpacity
              key={el}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setElement(el)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{el}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Campos específicos de Ritual */}
      {category === 'ritual' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Parâmetros de Ritual</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Círculo (1 a 4)</Text>
              <TextInput style={styles.input} value={circle} onChangeText={setCircle} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Execução</Text>
              <TextInput style={styles.input} value={execution} onChangeText={setExecution} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Alcance</Text>
              <TextInput style={styles.input} value={range} onChangeText={setRange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Alvo / Área</Text>
              <TextInput style={styles.input} value={target} onChangeText={setTarget} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Duração</Text>
              <TextInput style={styles.input} value={duration} onChangeText={setDuration} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Resistência</Text>
              <TextInput style={styles.input} value={resistance} onChangeText={setResistance} />
            </View>
          </View>
          <Text style={styles.label}>Discente (opcional)</Text>
          <TextInput style={styles.input} value={discente} onChangeText={setDiscente} placeholder="(+2 PE) ..." placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Verdadeiro (opcional)</Text>
          <TextInput style={styles.input} value={verdadeiro} onChangeText={setVerdadeiro} placeholder="(+5 PE) ..." placeholderTextColor={colors.textMuted} />
        </View>
      )}

      {/* Campos específicos de Criatura */}
      {category === 'creature' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Estatísticas da Ameaça</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>VD</Text>
              <TextInput style={styles.input} value={vd} onChangeText={setVd} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PV</Text>
              <TextInput style={styles.input} value={pv} onChangeText={setPv} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Defesa</Text>
              <TextInput style={styles.input} value={defense} onChangeText={setDefense} keyboardType="numeric" />
            </View>
          </View>
        </View>
      )}

      {/* Campos específicos de Arma / Item */}
      {(category === 'weapon' || category === 'item') && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Dados de Equipamento</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Categoria (0, I, II, III, IV)</Text>
              <TextInput style={styles.input} value={itemCategory} onChangeText={setItemCategory} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Espaços</Text>
              <TextInput style={styles.input} value={spaces} onChangeText={setSpaces} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Dano (ex: 2d8)</Text>
              <TextInput style={styles.input} value={damage} onChangeText={setDamage} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Crítico (ex: 19/x3)</Text>
              <TextInput style={styles.input} value={critical} onChangeText={setCritical} />
            </View>
          </View>
        </View>
      )}

      {/* Campos específicos de Origem */}
      {category === 'origin' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Dados da Origem</Text>
          <Text style={styles.label}>Perícias Treinadas</Text>
          <TextInput style={styles.input} value={trainedSkills} onChangeText={setTrainedSkills} placeholder="Ex: Investigação e Percepção" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Nome do Poder de Origem</Text>
          <TextInput style={styles.input} value={powerName} onChangeText={setPowerName} />
        </View>
      )}

      {/* Campos específicos de Poder */}
      {category === 'power' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Dados do Poder</Text>
          <Text style={styles.label}>Pré-requisito</Text>
          <TextInput style={styles.input} value={prerequisite} onChangeText={setPrerequisite} placeholder="Ex: Treinado em Ocultismo, NEX 30%..." placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Afinidade (Efeito adicional ao atingir afinidade)</Text>
          <TextInput style={styles.input} value={powerAffinity} onChangeText={setPowerAffinity} placeholder="Ex: Você recebe +2d20..." placeholderTextColor={colors.textMuted} />
        </View>
      )}

      {/* Campos específicos de Trilha */}
      {category === 'track' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Dados da Trilha</Text>
          <Text style={styles.label}>Classe Vinculada</Text>
          <TextInput style={styles.input} value={className} onChangeText={setClassName} placeholder="Combatente, Especialista, Ocultista..." placeholderTextColor={colors.textMuted} />
        </View>
      )}

      {/* Campos específicos de Perícia */}
      {category === 'skill' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Dados da Perícia</Text>
          <Text style={styles.label}>Atributo-Chave (AGI, FOR, INT, PRE, VIG)</Text>
          <TextInput style={styles.input} value={baseAttribute} onChangeText={setBaseAttribute} placeholder="AGI" placeholderTextColor={colors.textMuted} />
          <View style={[styles.row, { marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.pill, trainedOnly && styles.pillActive]}
              onPress={() => setTrainedOnly(!trainedOnly)}
            >
              <Text style={[styles.pillText, trainedOnly && styles.pillTextActive]}>
                {trainedOnly ? '✓ Somente Treinada' : 'Permite Não-Treinada'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, armorPenalty && styles.pillActive]}
              onPress={() => setArmorPenalty(!armorPenalty)}
            >
              <Text style={[styles.pillText, armorPenalty && styles.pillTextActive]}>
                {armorPenalty ? '✓ Aplica Penalidade Armadura' : 'Sem Penalidade'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Campos específicos de Classe */}
      {category === 'class' && (
        <View style={styles.specificBox}>
          <Text style={styles.specificTitle}>Progressão da Classe</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PV Iniciais</Text>
              <TextInput style={styles.input} value={initialPV} onChangeText={setInitialPV} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PV por NEX</Text>
              <TextInput style={styles.input} value={pvPerNex} onChangeText={setPvPerNex} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PE Iniciais</Text>
              <TextInput style={styles.input} value={initialPE} onChangeText={setInitialPE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PE por NEX</Text>
              <TextInput style={styles.input} value={pePerNex} onChangeText={setPePerNex} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>SAN Inicial</Text>
              <TextInput style={styles.input} value={initialSAN} onChangeText={setInitialSAN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>SAN por NEX</Text>
              <TextInput style={styles.input} value={sanPerNex} onChangeText={setSanPerNex} />
            </View>
          </View>
          <Text style={styles.label}>Proficiências</Text>
          <TextInput style={styles.input} value={proficiencies} onChangeText={setProficiencies} />
        </View>
      )}

      <Text style={styles.label}>Resumo Curto (exibido na listagem)</Text>
      <TextInput
        style={styles.input}
        value={summary}
        onChangeText={setSummary}
        placeholder="Breve descrição de 1 linha..."
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Descrição Completa / Regras *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Digite o texto completo e regras..."
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Fórmulas de Dados (separadas por vírgula)</Text>
      <TextInput
        style={styles.input}
        value={diceFormulasText}
        onChangeText={setDiceFormulasText}
        placeholder="Ex: 4d6+4, 2d10, 3d20+10"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Fonte / Livro</Text>
      <TextInput style={styles.input} value={bookTitle} onChangeText={setBookTitle} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>
          {existing ? 'Salvar Alterações' : 'Criar Registro no Compêndio'}
        </Text>
      </TouchableOpacity>
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
      padding: 16,
      paddingBottom: 80,
    },
    cancelTopBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelTopBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    heading: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 14,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 10,
      marginBottom: 5,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
    },
    textArea: {
      minHeight: 130,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    pillsRow: {
      gap: 8,
      paddingVertical: 4,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    pillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    pillTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    specificBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginTop: 12,
    },
    specificTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    saveBtn: {
      marginTop: 22,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
