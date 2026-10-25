import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AiConfig, AiProvider, ParanormalRelic, RELIC_PERSONAS } from '../types/ai';
import { hasDefaultApiKey, isUsingDefaultApiKey, testAiConnection } from '../services/ai/AiClient';

interface AiConfigModalProps {
  visible: boolean;
  config: AiConfig;
  onSave: (newConfig: AiConfig) => void;
  onClose: () => void;
}

const RELIC_OPTIONS: ParanormalRelic[] = [
  'none',
  'anfitriao',
  'magistrada',
  'deus_da_morte',
  'diabo',
  'random',
];

export function AiConfigModal({
  visible,
  config,
  onSave,
  onClose,
}: AiConfigModalProps) {
  const { colors } = useTheme();

  const [provider, setProvider] = useState<AiProvider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(
    config.model === 'gemini-2.5-flash' || config.model === 'gemini-1.5-flash'
      ? 'gemini-flash-lite-latest'
      : config.model || 'gemini-flash-lite-latest'
  );
  const [relicPersona, setRelicPersona] = useState<ParanormalRelic>(
    config.relicPersona || (config.anfitriaoMode ? 'anfitriao' : 'none')
  );
  const [customInstructions, setCustomInstructions] = useState(config.customInstructions || '');
  const [offlineFallback, setOfflineFallback] = useState(config.offlineFallback);
  const [showKey, setShowKey] = useState(false);

  const defaultKeyAvailable = hasDefaultApiKey(provider);
  const isUsingDefault = !apiKey.trim() && defaultKeyAvailable;
  const hasCustomKey = Boolean(apiKey.trim());

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sincroniza o estado interno sempre que o modal for aberto ou a config externa for alterada
  useEffect(() => {
    if (visible) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setModel(
        config.model === 'gemini-2.5-flash' || config.model === 'gemini-1.5-flash'
          ? 'gemini-flash-lite-latest'
          : config.model || 'gemini-flash-lite-latest'
      );
      setRelicPersona(config.relicPersona || (config.anfitriaoMode ? 'anfitriao' : 'none'));
      setCustomInstructions(config.customInstructions || '');
      setOfflineFallback(config.offlineFallback);
      setTestResult(null);
    }
  }, [visible, config]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection({
        provider,
        apiKey: apiKey.trim(),
        model,
        temperature: config.temperature,
        offlineFallback,
        relicPersona,
        anfitriaoMode: relicPersona === 'anfitriao',
        customInstructions,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Erro inesperado' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      provider,
      apiKey: apiKey.trim(),
      model,
      temperature: config.temperature,
      offlineFallback,
      relicPersona,
      anfitriaoMode: relicPersona === 'anfitriao',
      customInstructions: customInstructions.trim(),
    });
    onClose();
  };

  const openGoogleAiStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  const openGroqConsole = () => {
    Linking.openURL('https://console.groq.com/keys');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Configuração do G.L.I.T.C.H.</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Inteligência Artificial & Relíquias do Outro Lado
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Bloco Educativo Custo Zero */}
            <View style={[styles.zeroCostCard, { backgroundColor: '#1E1B4B', borderColor: '#4338CA' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={18} color="#A5B4FC" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  100% Gratuito e Sem Cartão de Crédito
                </Text>
              </View>
              <Text style={{ color: '#C7D2FE', fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                O OrdoCompanion não cobra nada e se conecta diretamente à API gratuita do Google Gemini ou Groq. Sua chave fica gravada apenas no seu celular.
              </Text>
              <TouchableOpacity
                onPress={openGoogleAiStudio}
                style={[styles.linkBtn, { backgroundColor: '#4F46E5', marginTop: 10 }]}
              >
                <Ionicons name="key-outline" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                  Obter Chave Grátis no Google AI Studio (30 seg)
                </Text>
              </TouchableOpacity>
            </View>

            {/* SELEÇÃO DO PROVEDOR */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Provedor de IA</Text>
            <View style={styles.providerRow}>
              <TouchableOpacity
                onPress={() => {
                  setProvider('gemini');
                  setModel('gemini-flash-lite-latest');
                  setTestResult(null);
                }}
                style={[
                  styles.providerBtn,
                  {
                    backgroundColor: provider === 'gemini' ? colors.primarySoft : colors.surfaceElevated,
                    borderColor: provider === 'gemini' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons name="logo-google" size={16} color={provider === 'gemini' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.providerBtnText,
                    { color: provider === 'gemini' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Google Gemini (Recomendado)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProvider('groq');
                  setModel('llama-3.3-70b-versatile');
                  setTestResult(null);
                }}
                style={[
                  styles.providerBtn,
                  {
                    backgroundColor: provider === 'groq' ? colors.primarySoft : colors.surfaceElevated,
                    borderColor: provider === 'groq' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons name="flash-outline" size={16} color={provider === 'groq' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.providerBtnText,
                    { color: provider === 'groq' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Groq Cloud (Llama 3)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProvider('offline');
                  setTestResult(null);
                }}
                style={[
                  styles.providerBtn,
                  {
                    backgroundColor: provider === 'offline' ? colors.primarySoft : colors.surfaceElevated,
                    borderColor: provider === 'offline' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons name="cloud-offline-outline" size={16} color={provider === 'offline' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.providerBtnText,
                    { color: provider === 'offline' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Modo Offline Local (Sem chave)
                </Text>
              </TouchableOpacity>
            </View>

            {/* CHAVE DE API (se não for offline) */}
            {provider !== 'offline' && (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0 }]}>
                    Chave de API ({provider === 'gemini' ? 'Google Gemini' : 'Groq'})
                  </Text>
                  <TouchableOpacity
                    onPress={provider === 'gemini' ? openGoogleAiStudio : openGroqConsole}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      {provider === 'gemini' ? 'Pegar chave Gemini' : 'Pegar chave Groq'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Status da Chave Padrão do Sistema */}
                {isUsingDefault && (
                  <View
                    style={[
                      styles.keyStatusBanner,
                      {
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        borderColor: 'rgba(34, 197, 94, 0.35)',
                      },
                    ]}
                  >
                    <Ionicons name="shield-checkmark" size={17} color="#22C55E" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 12 }}>
                        Chave Padrão do Sistema Ativa
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                        O OrdoCompanion já vem pronto para uso! Preencha o campo abaixo apenas se desejar usar sua própria chave pessoal com cotas individuais.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Status de Chave Pessoal Ativa com Opção de Restaurar Padrão */}
                {hasCustomKey && (
                  <View
                    style={[
                      styles.keyStatusBanner,
                      {
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        borderColor: 'rgba(99, 102, 241, 0.35)',
                        justifyContent: 'space-between',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="key" size={15} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                        Usando sua Chave Pessoal
                      </Text>
                    </View>
                    {defaultKeyAvailable && (
                      <TouchableOpacity
                        onPress={() => setApiKey('')}
                        style={[styles.restoreDefaultBtn, { backgroundColor: colors.primarySoft }]}
                      >
                        <Ionicons name="arrow-undo-outline" size={13} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                          Restaurar Padrão
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={
                      isUsingDefault
                        ? 'Chave padrão ativa (cole aqui para substituir)'
                        : provider === 'gemini'
                        ? 'AIzaSy...'
                        : 'gsk_...'
                    }
                    placeholderTextColor={colors.textMuted}
                    value={apiKey}
                    onChangeText={setApiKey}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowKey(!showKey)} style={{ padding: 6 }}>
                    <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* MODELO SELECIONADO */}
            {provider !== 'offline' && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Modelo</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {(provider === 'gemini'
                    ? ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash']
                    : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
                  ).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setModel(m)}
                      style={[
                        styles.modelChip,
                        {
                          backgroundColor: model === m ? colors.primary : colors.surfaceElevated,
                          borderColor: model === m ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: model === m ? '#FFFFFF' : colors.textSecondary,
                        }}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Campo para modelo personalizado se desejar */}
                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 8, height: 38 }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text, height: 38, fontSize: 12 }]}
                    placeholder="Ou digite outro modelo (ex: gemini-3.8-flash)..."
                    placeholderTextColor={colors.textMuted}
                    value={model}
                    onChangeText={setModel}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {/* SELEÇÃO DE PERSONA: RELÍQUIAS DO OUTRO LADO OU G.L.I.T.C.H. */}
            <View style={{ marginTop: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0 }]}>
                  Voz & Persona das Relíquias do Outro Lado
                </Text>
              </View>
              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginBottom: 10, lineHeight: 16 }}>
                Escolha qual entidade responderá às suas dúvidas no chat. Cada Relíquia tem estilo, gírias e teatralidade únicos, mas todas mantêm 100% de exatidão nas regras e cálculos!
              </Text>

              <View style={styles.relicGrid}>
                {RELIC_OPTIONS.map((opt) => {
                  const meta = RELIC_PERSONAS[opt];
                  const isSelected = relicPersona === opt;
                  const itemColor = opt === 'none' ? colors.primary : meta.color;

                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setRelicPersona(opt)}
                      activeOpacity={0.8}
                      style={[
                        styles.relicCard,
                        {
                          backgroundColor: isSelected ? meta.accentBg : colors.surfaceElevated,
                          borderColor: isSelected ? itemColor : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View
                            style={[
                              styles.relicAvatarBox,
                              {
                                backgroundColor: isSelected ? itemColor : colors.surface,
                                borderColor: itemColor,
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 15 }}>{meta.emoji}</Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text
                                style={[
                                  styles.relicName,
                                  { color: isSelected ? itemColor : colors.text },
                                ]}
                              >
                                {meta.name}
                              </Text>
                              <View
                                style={[
                                  styles.elementBadge,
                                  {
                                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.2)' : colors.surface,
                                    borderColor: itemColor,
                                  },
                                ]}
                              >
                                <Text style={[styles.elementBadgeText, { color: itemColor }]}>
                                  {meta.element}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.relicTagline, { color: colors.textMuted }]} numberOfLines={1}>
                              {meta.tagline}
                            </Text>
                          </View>
                        </View>

                        {/* Indicador de Seleção */}
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelected ? itemColor : colors.border,
                              backgroundColor: isSelected ? itemColor : 'transparent',
                            },
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                      </View>

                      <Text style={[styles.relicDesc, { color: colors.textSecondary }]}>
                        {meta.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* INSTRUÇÕES PERSONALIZADAS */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Instruções Personalizadas Adicionais (Opcional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Ex.: Priorize explicações curtas com bullets, adapte para campanha de nível baixo..."
                placeholderTextColor={colors.textMuted}
                value={customInstructions}
                onChangeText={setCustomInstructions}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* FALLBACK OFFLINE */}
            <View style={styles.fallbackRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                  Fallback Offline Inteligente
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  Se a conexão falhar ou estiver sem internet, usar a base local de 1.261 páginas automaticamente.
                </Text>
              </View>
              <Switch
                value={offlineFallback}
                onValueChange={setOfflineFallback}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* TESTE DE CONEXÃO E RESULTADO */}
            {provider !== 'offline' && (
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                  onPress={handleTest}
                  disabled={isTesting}
                  style={[
                    styles.testBtn,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="pulse-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                        Testar Conexão com a API
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {testResult && (
                  <View
                    style={[
                      styles.testResultBox,
                      {
                        backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        borderColor: testResult.success ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    <Ionicons
                      name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={testResult.success ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: testResult.success ? '#10B981' : '#EF4444',
                        fontWeight: '600',
                      }}
                    >
                      {testResult.message}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Rodapé de Ações */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.footerBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.footerBtn, { backgroundColor: colors.primary, flex: 2 }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Salvar Configurações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 16,
  },
  zeroCostCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  providerRow: {
    flexDirection: 'column',
    gap: 6,
  },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  providerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
  },
  modelChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  relicGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  relicCard: {
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
  },
  relicAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  relicName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  elementBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  elementBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  relicTagline: {
    fontSize: 10.5,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  relicDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  keyStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  restoreDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
