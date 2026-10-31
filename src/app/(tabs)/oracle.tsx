import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import {
  AI_STORAGE_KEYS,
  AiConfig,
  AiMessage,
  DEFAULT_AI_CONFIG,
  ParanormalRelic,
  RELIC_PERSONAS,
} from '../../types/ai';
import { sendAiChatMessage, getEffectiveApiKey } from '../../services/ai/AiClient';
import { AiChatMessageItem } from '../../components/AiChatMessageItem';
import { AiConfigModal } from '../../components/AiConfigModal';
import { PdfViewerModal, PdfViewerMode } from '../../components/PdfViewerModal';
import { isPdfServerConfigured } from '../../utils/pdfUrl';
import { BookInfo } from '../../types/compendium';

const QUICK_PROMPTS = [
  'Como funciona teste de atributo e penalidade?',
  'Como forjar uma arma de crítico 18/x3 na Armaria?',
  'Quais são as regras de Sanidade e Loucura?',
  'O que faz o ritual Descarnar e quanto custa?',
  'Como sincronizar minhas fichas com o Google Drive?',
  'Como subir de nível (NEX) na ficha do agente?',
];

const ALL_PERSONA_OPTIONS: ParanormalRelic[] = [
  'none',
  'arbitro_regras',
  'co_mestre',
  'build_advisor',
  'verissimo',
  'cervero',
  'kian',
  'anfitriao',
  'magistrada',
  'deus_da_morte',
  'diabo',
  'random',
];

const ORACLE_CATEGORY_TABS: Array<{ id: 'all' | 'specialist' | 'canon' | 'relics'; label: string; emoji: string }> = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'specialist', label: 'Táticos', emoji: '🛡️' },
  { id: 'canon', label: 'Ordem', emoji: '👥' },
  { id: 'relics', label: 'Relíquias', emoji: '🌀' },
];

export default function OracleScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    characters,
    books,
    rollFormula,
    openManual,
    setFilters,
  } = useApp();

  const [config, setConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Seleção de Agente Ativo para Contexto da conversa
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [personaTab, setPersonaTab] = useState<'all' | 'specialist' | 'canon' | 'relics'>('all');

  // Modais
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [readerModalVisible, setReaderModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState(1);

  const flatListRef = useRef<FlatList>(null);
  const isMountedRef = useRef(true);

  const activeRelic = config.relicPersona || (config.anfitriaoMode ? 'anfitriao' : 'none');
  const isMissingKey = !getEffectiveApiKey(config) && config.provider !== 'offline';
  const currentRelicMeta = RELIC_PERSONAS[activeRelic] || RELIC_PERSONAS.none;

  const activeAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return characters.find((c) => c.id === selectedAgentId) || null;
  }, [characters, selectedAgentId]);

  // Carrega configurações e histórico de chat salvos
  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        const storedConfig = await AsyncStorage.getItem(AI_STORAGE_KEYS.CONFIG);
        if (storedConfig && isMountedRef.current) {
          const parsed = JSON.parse(storedConfig);
          // Migra automaticamente modelos descontinuados
          if (parsed.model === 'gemini-2.5-flash' || parsed.model === 'gemini-1.5-flash') {
            parsed.model = 'gemini-flash-lite-latest';
          }
          if (parsed.anfitriaoMode && !parsed.relicPersona) {
            parsed.relicPersona = 'anfitriao';
          } else if (!parsed.relicPersona) {
            parsed.relicPersona = 'none';
          }
          setConfig({ ...DEFAULT_AI_CONFIG, ...parsed });
        }
        const storedHistory = await AsyncStorage.getItem(AI_STORAGE_KEYS.CHAT_HISTORY);
        if (storedHistory && isMountedRef.current) {
          setMessages(JSON.parse(storedHistory));
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do G.L.I.T.C.H.:', err);
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const saveConfig = async (newConfig: AiConfig) => {
    if (!isMountedRef.current) return;
    setConfig(newConfig);
    try {
      await AsyncStorage.setItem(AI_STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
    } catch (err) {
      console.warn('Erro ao salvar config da IA:', err);
    }
  };

  const saveMessages = async (newMessages: AiMessage[]) => {
    if (!isMountedRef.current) return;
    setMessages(newMessages);
    try {
      await AsyncStorage.setItem(AI_STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(newMessages));
    } catch (err) {
      console.warn('Erro ao salvar histórico de IA:', err);
    }
  };

  const selectRelicPersona = (persona: ParanormalRelic) => {
    const updated = {
      ...config,
      relicPersona: persona,
      anfitriaoMode: persona === 'anfitriao',
    };
    saveConfig(updated);
  };

  const clearChatHistory = async () => {
    if (!isMountedRef.current) return;
    setMessages([]);
    try {
      await AsyncStorage.removeItem(AI_STORAGE_KEYS.CHAT_HISTORY);
    } catch (err) {
      console.warn('Erro ao limpar histórico:', err);
    }
  };

  // Envio de Mensagem
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    const userMessage: AiMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await sendAiChatMessage({
        query: text,
        config,
        chatHistory: messages,
        activeAgent,
      });

      if (!isMountedRef.current) return;
      const finalMessages = [...updatedMessages, response];
      saveMessages(finalMessages);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const errorMsg: AiMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `❌ Ocorreu um erro ao consultar: ${err.message || 'Falha de comunicação.'}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      saveMessages([...updatedMessages, errorMsg]);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setTimeout(() => {
          if (isMountedRef.current) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    }
  };

  // Manipuladores de Ações Clicáveis
  const handleOpenBook = useCallback(
    (bookId: string, pageNumber: number) => {
      const cleanId = (bookId || '').trim().toLowerCase();
      const targetBook =
        books.find((b) => {
          const bId = (b.id || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          return bId === cleanId || bId.includes(cleanId) || cleanId.includes(bId) || bTitle.includes(cleanId);
        }) || books[0];
      if (targetBook) {
        setSelectedBook(targetBook);
        setSelectedPageNumber(pageNumber);
        setReaderModalVisible(true);
      }
    },
    [books]
  );

  const handleOpenEntity = useCallback(
    (entityName: string) => {
      // Ajusta o filtro do compêndio para exibir a entidade encontrada e navega para lá
      setFilters((prev) => ({
        ...prev,
        query: entityName,
        category: 'all',
        bookId: 'all',
      }));
      router.navigate('/');
    },
    [router, setFilters]
  );

  const handleRollDice = useCallback(
    (formula: string) => {
      rollFormula(formula, `G.L.I.T.C.H.: ${formula}`);
    },
    [rollFormula]
  );

  const handleNavigateTab = useCallback(
    (tabName: string) => {
      const target = tabName === 'compendio' || tabName === 'index' ? '/' : `/(tabs)/${tabName}`;
      router.navigate(target as any);
    },
    [router]
  );

  const inputPlaceholder = currentRelicMeta.placeholder || 'Pergunte sobre regras, livros ou o aplicativo...';
  const typingText = currentRelicMeta.typingText || 'G.L.I.T.C.H. analisando compêndio e manuais...';
  const welcomeContent = {
    emoji: currentRelicMeta.emoji || '🔮',
    title: currentRelicMeta.welcomeTitle || currentRelicMeta.name,
    subtitle: currentRelicMeta.welcomeSubtitle || currentRelicMeta.description,
  };
  const activeQuickPrompts = currentRelicMeta.quickPrompts || QUICK_PROMPTS;

  const bottomInset = Math.max(insets.bottom, 12);
  const activeColor = activeRelic === 'none' ? colors.primary : currentRelicMeta.color;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* CABEÇALHO TEMÁTICO */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>{currentRelicMeta.emoji}</Text>
              <Text
                style={[
                  styles.headerTitle,
                  { color: activeRelic === 'none' ? colors.text : activeColor },
                ]}
                numberOfLines={1}
              >
                {activeRelic === 'none' ? 'G.L.I.T.C.H.' : currentRelicMeta.name}
              </Text>
              <View
                style={[
                  styles.headerElementBadge,
                  {
                    backgroundColor: activeRelic === 'none' ? colors.primarySoft : currentRelicMeta.accentBg,
                    borderColor: activeColor,
                  },
                ]}
              >
                <Text style={[styles.headerElementBadgeText, { color: activeColor }]}>
                  {currentRelicMeta.element}
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {currentRelicMeta.tagline}
            </Text>
          </View>

          {/* Botões do Topo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Status do Provedor */}
            <TouchableOpacity
              onPress={() => setConfigModalVisible(true)}
              style={[styles.providerBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              accessibilityLabel="Status do provedor"
            >
              <Ionicons
                name={
                  config.provider === 'offline'
                    ? 'cloud-offline-outline'
                    : config.provider === 'gemini'
                    ? 'logo-google'
                    : 'flash-outline'
                }
                size={12}
                color={colors.primary}
              />
              <Text style={[styles.providerBadgeText, { color: colors.textSecondary }]}>
                {config.provider === 'gemini'
                  ? 'Gemini'
                  : config.provider === 'groq'
                  ? 'Groq'
                  : 'Offline'}
              </Text>
            </TouchableOpacity>

            {/* Limpar Chat */}
            {messages.length > 0 && (
              <TouchableOpacity
                onPress={clearChatHistory}
                style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated }]}
                accessibilityLabel="Limpar histórico"
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Configurações */}
            <TouchableOpacity
              onPress={() => setConfigModalVisible(true)}
              style={[
                styles.headerIconBtn,
                {
                  backgroundColor: isMissingKey
                    ? 'rgba(239, 68, 68, 0.15)'
                    : colors.primarySoft,
                },
              ]}
              accessibilityLabel="Configurações de IA"
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color={isMissingKey ? '#EF4444' : colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ABAS DE CATEGORIA DE PERSONAS */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {ORACLE_CATEGORY_TABS.map((tab) => {
              const isTabActive = personaTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setPersonaTab(tab.id)}
                  style={[
                    styles.personaFilterPill,
                    {
                      backgroundColor: isTabActive ? colors.primary : colors.surfaceElevated,
                      borderColor: isTabActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11 }}>{tab.emoji}</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: isTabActive ? '800' : '600',
                      color: isTabActive ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SELETOR RÁPIDO DE PERSONA / AGENTE */}
        <View style={styles.relicSelectorRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relicScrollContent}
          >
            {ALL_PERSONA_OPTIONS
              .filter((opt) => {
                if (personaTab === 'all') return true;
                const meta = RELIC_PERSONAS[opt];
                return meta?.category === personaTab;
              })
              .map((opt) => {
              const meta = RELIC_PERSONAS[opt];
              const isSelected = activeRelic === opt;
              const itemColor = opt === 'none' ? colors.primary : meta.color;

              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => selectRelicPersona(opt)}
                  activeOpacity={0.8}
                  style={[
                    styles.relicChip,
                    {
                      backgroundColor: isSelected ? meta.accentBg : colors.surfaceElevated,
                      borderColor: isSelected ? itemColor : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                  accessibilityLabel={`Selecionar ${meta.name}`}
                >
                  <Text style={{ fontSize: 13 }}>{meta.emoji}</Text>
                  <Text
                    style={[
                      styles.relicChipText,
                      {
                        color: isSelected ? itemColor : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {meta.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Seletor de Agente Ativo para Contexto (se houver agentes cadastrados) */}
        {characters.length > 0 && (
          <View style={styles.agentSelectorRow}>
            <Text style={[styles.agentSelectorLabel, { color: colors.textMuted }]}>Ficha:</Text>
            <TouchableOpacity
              onPress={() => setSelectedAgentId(null)}
              style={[
                styles.agentChip,
                {
                  backgroundColor: selectedAgentId === null ? colors.primary : colors.surfaceElevated,
                  borderColor: selectedAgentId === null ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: selectedAgentId === null ? '#FFFFFF' : colors.textSecondary,
                }}
              >
                Geral
              </Text>
            </TouchableOpacity>

            {characters.slice(0, 4).map((agent) => (
              <TouchableOpacity
                key={agent.id}
                onPress={() => setSelectedAgentId(agent.id)}
                style={[
                  styles.agentChip,
                  {
                    backgroundColor: selectedAgentId === agent.id ? colors.primary : colors.surfaceElevated,
                    borderColor: selectedAgentId === agent.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: selectedAgentId === agent.id ? '#FFFFFF' : colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {agent.name || agent.player || 'Agente'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* LISTA DE MENSAGENS */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.welcomeCard,
              {
                backgroundColor: activeRelic === 'none' ? colors.surface : currentRelicMeta.accentBg,
                borderColor: activeRelic === 'none' ? colors.border : currentRelicMeta.color,
              },
            ]}
          >
            <Text style={{ fontSize: 32, alignSelf: 'center', marginBottom: 8 }}>
              {welcomeContent.emoji}
            </Text>
            <Text
              style={[
                styles.welcomeTitle,
                { color: activeRelic === 'none' ? colors.primary : activeColor },
              ]}
            >
              {welcomeContent.title}
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              {welcomeContent.subtitle}
            </Text>

            {/* Aviso caso não tenha chave */}
            {isMissingKey && (
              <TouchableOpacity
                onPress={() => setConfigModalVisible(true)}
                style={styles.keyNotice}
              >
                <Ionicons name="information-circle" size={16} color="#3B82F6" />
                <Text style={{ color: '#3B82F6', fontSize: 11.5, fontWeight: '700', flex: 1 }}>
                  Dica: Toque aqui para adicionar sua chave 100% gratuita do Google Gemini em 30 segundos!
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sugestões Rápidas */}
          <Text style={[styles.quickPromptHeader, { color: colors.textMuted }]}>
            Sugestões para começar:
          </Text>
          <View style={styles.quickPromptsWrap}>
            {activeQuickPrompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSendMessage(prompt)}
                style={[
                  styles.quickPromptBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="help-circle-outline" size={14} color={activeColor} />
                <Text style={[styles.quickPromptText, { color: colors.text }]}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AiChatMessageItem
              message={item}
              activeRelic={activeRelic}
              isAnfitriaoActive={activeRelic === 'anfitriao'}
              onOpenBook={handleOpenBook}
              onOpenEntity={handleOpenEntity}
              onRollDice={handleRollDice}
              onNavigateTab={handleNavigateTab}
            />
          )}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.typingRow}>
                <View
                  style={[
                    styles.typingAvatar,
                    {
                      backgroundColor: activeRelic === 'none' ? colors.primarySoft : currentRelicMeta.accentBg,
                      borderColor: activeColor,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 15 }}>{currentRelicMeta.emoji}</Text>
                </View>
                <View
                  style={[
                    styles.typingBubble,
                    {
                      backgroundColor: colors.surface,
                      borderColor: activeRelic === 'none' ? colors.border : activeColor,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={activeColor}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: activeColor,
                    }}
                  >
                    {typingText}
                  </Text>
                </View>
              </View>
            ) : undefined
          }
        />
      )}

      {/* INDICADOR SE O CHAT ESTIVER VAZIO E ENVIANDO PRIMEIRO PROMPT */}
      {messages.length === 0 && isLoading && (
        <View style={styles.typingRow}>
          <View
            style={[
              styles.typingAvatar,
              {
                backgroundColor: activeRelic === 'none' ? colors.primarySoft : currentRelicMeta.accentBg,
                borderColor: activeColor,
              },
            ]}
          >
            <Text style={{ fontSize: 15 }}>{currentRelicMeta.emoji}</Text>
          </View>
          <View
            style={[
              styles.typingBubble,
              {
                backgroundColor: colors.surface,
                borderColor: activeRelic === 'none' ? colors.border : activeColor,
              },
            ]}
          >
            <ActivityIndicator
              size="small"
              color={activeColor}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeColor,
              }}
            >
              {typingText}
            </Text>
          </View>
        </View>
      )}

      {/* BARRA DE ENTRADA DE MENSAGEM */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: bottomInset,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={inputPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              handleSendMessage();
            }
          }}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                !inputText.trim() || isLoading
                  ? colors.surfaceElevated
                  : activeColor,
            },
          ]}
        >
          <Ionicons
            name="send"
            size={18}
            color={!inputText.trim() || isLoading ? colors.textMuted : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* MODAL DE CONFIGURAÇÃO */}
      <AiConfigModal
        visible={configModalVisible}
        config={config}
        onSave={saveConfig}
        onClose={() => setConfigModalVisible(false)}
      />

      {/* VISUALIZADOR DE PDF INTEGRADO */}
      <PdfViewerModal
        visible={readerModalVisible}
        book={selectedBook}
        initialPage={selectedPageNumber}
        initialMode={isPdfServerConfigured() ? 'pdf_scroll' : 'text'}
        onClose={() => setReaderModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  headerElementBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  headerElementBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  personaFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  relicSelectorRow: {
    marginTop: 8,
  },
  relicScrollContent: {
    gap: 6,
    paddingVertical: 2,
  },
  relicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  relicChipText: {
    fontSize: 11,
  },
  agentSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  agentSelectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  agentChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  welcomeCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  keyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  quickPromptHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickPromptsWrap: {
    flexDirection: 'column',
    gap: 6,
  },
  quickPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickPromptText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 2,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    borderWidth: 1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
