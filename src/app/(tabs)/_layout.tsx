import React, { useMemo, useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { ThemeSelectorModal } from '../../components/ThemeSelectorModal';
import { UserProfileModal } from '../../components/UserProfileModal';
import { CustomBottomTabBar } from '../../components/CustomBottomTabBar';
import { MoreTabsModal } from '../../components/MoreTabsModal';
import { resolveNavigationTabs } from '../../utils/tabNavigation';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { userProfile, syncStatus, syncAuthState, openManual } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [userProfileTab, setUserProfileTab] = useState<'identidade' | 'nuvem' | 'navegacao'>('identidade');
  const [moreModalVisible, setMoreModalVisible] = useState(false);

  const allAvailableRoutes = useMemo(
    () => ['index', 'characters', 'weapons', 'books', 'dice', 'favorites', 'master', 'table', 'oracle'],
    []
  );

  const resolvedTabs = useMemo(() => {
    return resolveNavigationTabs(allAvailableRoutes, userProfile?.navigationConfig);
  }, [allAvailableRoutes, userProfile?.navigationConfig]);

  const getSectionFromPathname = (path: string) => {
    if (path.includes('characters')) return 'characters';
    if (path.includes('weapons')) return 'weapons';
    if (path.includes('books')) return 'books';
    if (path.includes('dice')) return 'dice';
    if (path.includes('table')) return 'table';
    if (path.includes('favorites')) return 'favorites';
    if (path.includes('master')) return 'master';
    if (path.includes('oracle')) return 'oracle';
    return 'compendium';
  };

  // Extrai o nome da rota atual a partir do pathname
  const activeRouteName = useMemo(() => {
    const clean = pathname.replace(/^\/(\(tabs\)\/)?/, '').replace(/^\//, '');
    return clean || 'index';
  }, [pathname]);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomBottomTabBar
            {...props}
            pinnedTabs={resolvedTabs.pinnedTabs}
            overflowTabs={resolvedTabs.overflowTabs}
            onOpenMoreModal={() => setMoreModalVisible(true)}
          />
        )}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800', fontSize: 15 },
          headerTitleContainerStyle: { maxWidth: '54%' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerLeft: () => null,
          headerRight: () => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginRight: 10,
              }}
            >
              {/* Botão de Acesso Rápido ao G.L.I.T.C.H. (IA) */}
              <TouchableOpacity
                onPress={() => router.navigate('/(tabs)/oracle' as any)}
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
                  justifyContent: 'center',
                  minWidth: 34,
                  minHeight: 34,
                }}
                accessibilityLabel="G.L.I.T.C.H. - Inteligência Artificial"
              >
                <Ionicons name="sparkles" size={17} color={colors.primary} />
              </TouchableOpacity>

              {/* Botão de Manual / Guia da Tela Atual */}
              <TouchableOpacity
                onPress={() => openManual(getSectionFromPathname(pathname))}
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
                  justifyContent: 'center',
                  minWidth: 34,
                  minHeight: 34,
                }}
                accessibilityLabel="Manual e Guia da Tela Atual"
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              </TouchableOpacity>

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
                  justifyContent: 'center',
                  minWidth: 34,
                  minHeight: 34,
                }}
                accessibilityLabel="Trocar Tema"
              >
                <Ionicons name="color-palette" size={17} color={colors.primary} />
              </TouchableOpacity>

              {/* Botão de Perfil / Informações Gerais */}
              <TouchableOpacity
                onPress={() => {
                  setUserProfileTab('identidade');
                  setUserProfileModalVisible(true);
                }}
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
                  justifyContent: 'center',
                  minWidth: 34,
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
        <Tabs.Screen
          name="master"
          options={{
            title: 'Mestre',
            headerTitle: 'Central do Mestre & Campanhas',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="skull" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="table"
          options={{
            title: 'Mesa',
            headerTitle: 'Mesa Virtual da Ordem',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="radio" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="oracle"
          options={{
            title: 'G.L.I.T.C.H.',
            headerTitle: 'G.L.I.T.C.H. - Guia Lógico de Interferências Transcendentais do Caos Humano',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles" size={size} color={String(color)} />
            ),
          }}
        />
      </Tabs>

      {/* Modal Dinâmico de Outras Telas (Mais) */}
      <MoreTabsModal
        visible={moreModalVisible}
        onClose={() => setMoreModalVisible(false)}
        overflowTabs={resolvedTabs.overflowTabs}
        activeRouteName={activeRouteName}
        onSelectTab={(tabKey) => {
          router.navigate(tabKey === 'index' ? '/' : `/(tabs)/${tabKey}`);
        }}
        onOpenCustomize={() => {
          setUserProfileTab('navegacao');
          setUserProfileModalVisible(true);
        }}
      />

      <ThemeSelectorModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      <UserProfileModal
        visible={userProfileModalVisible}
        initialTab={userProfileTab}
        onClose={() => setUserProfileModalVisible(false)}
      />
    </>
  );
}
