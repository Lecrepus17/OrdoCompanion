import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { ThemeSelectorModal } from '../../components/ThemeSelectorModal';
import { UserProfileModal } from '../../components/UserProfileModal';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { userProfile, syncStatus, syncAuthState } = useApp();
  const insets = useSafeAreaInsets();
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);

  // Garante que a barra de abas nunca fique coberta pela navegação virtual (voltar/home/recentes) do Android ou pelo indicador do iOS
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);
  const tabHeight = 56 + bottomInset;

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: tabHeight,
            paddingBottom: bottomInset,
            paddingTop: 6,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '700',
            marginTop: -2,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          headerRight: () => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginRight: 14,
              }}
            >
              {/* Botão de Trocar Tema */}
              <TouchableOpacity
                onPress={() => setThemeModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.primarySoft,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  minHeight: 34,
                }}
                accessibilityLabel="Trocar Tema"
              >
                <Ionicons name="color-palette" size={17} color={colors.primary} />
              </TouchableOpacity>

              {/* Botão de Perfil / Informações Gerais (à direita do botão de seleção de cor) */}
              <TouchableOpacity
                onPress={() => setUserProfileModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: userProfile?.playerName ? colors.primarySoft : colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: userProfile?.playerName ? colors.primary : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  minHeight: 34,
                }}
                accessibilityLabel="Informações do Jogador e Perfil"
              >
                <Ionicons
                  name={userProfile?.playerName ? 'person' : 'person-outline'}
                  size={17}
                  color={userProfile?.playerName ? colors.primary : colors.textSecondary}
                />
                {(userProfile?.cloudSyncEnabled || syncAuthState?.isAuthenticated) && (
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor:
                        syncStatus === 'syncing'
                          ? '#3B82F6'
                          : syncStatus === 'error'
                          ? '#EF4444'
                          : '#10B981',
                      position: 'absolute',
                      top: 4,
                      right: 4,
                    }}
                  />
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Compêndio',
            headerTitle: 'Guia Ordem Paranormal',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="characters"
          options={{
            title: 'Agentes',
            headerTitle: 'Fichas de Agentes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="weapons"
          options={{
            title: 'Armaria',
            headerTitle: 'Armaria & Modificações',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="books"
          options={{
            title: 'Livros',
            headerTitle: 'Acervo de Livros (10 PDFs)',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="dice"
          options={{
            title: 'Dados',
            headerTitle: 'Rolador Ordem Paranormal',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="dice" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Salvos',
            headerTitle: 'Salvos, Listas & Homebrew',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmarks" size={size} color={String(color)} />
            ),
          }}
        />
      </Tabs>
      <ThemeSelectorModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
      <UserProfileModal
        visible={userProfileModalVisible}
        onClose={() => setUserProfileModalVisible(false)}
      />
    </>
  );
}
