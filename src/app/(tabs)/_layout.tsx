import React, { useMemo, useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
  const [userProfileTab, setUserProfileTab] = useState<'identidade' | 'nuvem' | 'navegacao' | 'suporte'>('identidade');
  const [moreModalVisible, setMoreModalVisible] = useState(false);

  const allAvailableRoutes = useMemo(
    () => ['index', 'characters', 'weapons', 'books', 'dice', 'favorites', 'master', 'table', 'oracle', 'support'],
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
    if (path.includes('support')) return 'support';
    return 'compendium';
  };

  // Extrai o nome da rota atual a partir do pathname
  const activeRouteName = useMemo(() => {
    const clean = pathname.replace(/^\/(\(tabs\)\/)?/, '').replace(/^\//, '');
    return clean || 'index';
  }, [pathname]);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && height < 500;
  const isNarrow = width < 400;

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
          headerStyle: {
            backgroundColor: colors.surface,
            height: isLandscape ? 40 : undefined,
          },
          headerStatusBarHeight: isLandscape ? 0 : undefined,
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: isLandscape ? 13 : isNarrow ? 14 : 15,
          },
          headerTitleContainerStyle: {
            maxWidth: isNarrow ? '50%' : '65%',
            marginRight: isNarrow ? 4 : 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerLeft: () => null,
          headerRight: () => {
            const btnPaddingH = isLandscape ? 5 : isNarrow ? 6 : 9;
            const btnPaddingV = isLandscape ? 3 : isNarrow ? 4 : 6;
            const btnMinDim = isLandscape ? 28 : isNarrow ? 30 : 34;
            const iconSize = isLandscape ? 14 : isNarrow ? 15 : 17;
            const containerGap = isLandscape ? 4 : isNarrow ? 4 : 6;
            const marginRight = isLandscape ? 6 : isNarrow ? 6 : 10;

            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: containerGap,
                  marginRight,
                }}
              >
                {/* Botão de Acesso Rápido ao G.L.I.T.C.H. (IA) */}
                <TouchableOpacity
                  onPress={() => router.navigate('/(tabs)/oracle' as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingHorizontal: btnPaddingH,
                    paddingVertical: btnPaddingV,
                    borderRadius: 8,
                    backgroundColor: colors.primarySoft,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: btnMinDim,
                    minHeight: btnMinDim,
                  }}
                  accessibilityLabel="G.L.I.T.C.H. - Inteligência Artificial"
                >
                  <Ionicons name="sparkles" size={iconSize} color={colors.primary} />
                </TouchableOpacity>

                {/* Botão de Manual / Guia da Tela Atual */}
                <TouchableOpacity
                  onPress={() => openManual(getSectionFromPathname(pathname))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingHorizontal: btnPaddingH,
                    paddingVertical: btnPaddingV,
                    borderRadius: 8,
                    backgroundColor: colors.primarySoft,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: btnMinDim,
                    minHeight: btnMinDim,
                  }}
                  accessibilityLabel="Manual e Guia da Tela Atual"
                >
                  <Ionicons name="help-circle-outline" size={iconSize + 1} color={colors.primary} />
                </TouchableOpacity>

                {/* Botão de Trocar Tema */}
                <TouchableOpacity
                  onPress={() => setThemeModalVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingHorizontal: btnPaddingH,
                    paddingVertical: btnPaddingV,
                    borderRadius: 8,
                    backgroundColor: colors.primarySoft,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: btnMinDim,
                    minHeight: btnMinDim,
                  }}
                  accessibilityLabel="Trocar Tema"
                >
                  <Ionicons name="color-palette" size={iconSize} color={colors.primary} />
                </TouchableOpacity>

                {/* Botão de Perfil / Informações Gerais */}
                <TouchableOpacity
                  onPress={() => {
                    setUserProfileTab('identidade');
                    setUserProfileModalVisible(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingHorizontal: btnPaddingH,
                    paddingVertical: btnPaddingV,
                    borderRadius: 8,
                    backgroundColor: userProfile?.playerName ? colors.primarySoft : colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: userProfile?.playerName ? colors.primary : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: btnMinDim,
                    minHeight: btnMinDim,
                  }}
                  accessibilityLabel="Informações do Jogador e Perfil"
                >
                  <Ionicons
                    name={userProfile?.playerName ? 'person' : 'person-outline'}
                    size={iconSize}
                    color={userProfile?.playerName ? colors.primary : colors.textSecondary}
                  />
                  {(userProfile?.cloudSyncEnabled || syncAuthState?.isAuthenticated) && (
                    <View
                      style={{
                        width: isLandscape ? 5 : 7,
                        height: isLandscape ? 5 : 7,
                        borderRadius: 4,
                        backgroundColor:
                          syncStatus === 'syncing'
                            ? '#3B82F6'
                            : syncStatus === 'error'
                            ? '#EF4444'
                            : '#10B981',
                        position: 'absolute',
                        top: 3,
                        right: 3,
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          },
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
            headerTitle: 'G.L.I.T.C.H. Paranormal',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="support"
          options={{
            title: 'Suporte',
            headerTitle: 'Suporte & Feedback',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bug-outline" size={size} color={String(color)} />
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
