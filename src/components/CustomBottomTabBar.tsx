import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import { getTabMetadata } from '../types/compendium';

export interface CustomBottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  navigation?: any;
  navigateToTab?: (routeKey: string) => void;
  emitter?: any;
  insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  pinnedTabs: string[];
  overflowTabs: string[];
  onOpenMoreModal: () => void;
  [key: string]: any;
}

export function isLandscapeViewport(width: number, height: number): boolean {
  return width > height && height < 500;
}

export function calculateBottomTabBarHeight(isLandscape: boolean, bottomInset = 0): number {
  return isLandscape ? 40 : 56 + bottomInset;
}

export const CustomBottomTabBar: React.FC<CustomBottomTabBarProps> = ({
  state,
  navigation,
  navigateToTab,
  insets,
  pinnedTabs,
  overflowTabs,
  onOpenMoreModal,
}) => {
  const { colors } = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  // Detecta orientação paisagem em smartphones e telas com altura reduzida
  const isLandscape = isLandscapeViewport(width, height);

  const bottomInset = isLandscape ? 0 : Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);
  const tabHeight = calculateBottomTabBarHeight(isLandscape, bottomInset);

  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;

  // Verifica se a tela atual está dentro do modal (overflow)
  const isOverflowActive = overflowTabs.includes(currentRouteName);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: tabHeight,
          paddingTop: isLandscape ? 2 : 6,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {/* Abas Fixadas na Ordem Definida pelo Usuário */}
      {pinnedTabs.map((tabKey) => {
        const route = state.routes.find((r) => r.name === tabKey);
        const isFocused = currentRouteName === tabKey;
        const meta = getTabMetadata(tabKey);

        const handlePress = () => {
          if (isFocused) return;

          if (route && navigation?.emit) {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event?.defaultPrevented) return;
          }

          if (route && typeof navigateToTab === 'function') {
            navigateToTab(route.key);
          } else if (navigation?.navigate) {
            navigation.navigate(tabKey);
          } else {
            router.navigate(tabKey === 'index' ? '/' : `/(tabs)/${tabKey}`);
          }
        };

        return (
          <TouchableOpacity
            key={tabKey}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={meta.label}
            testID={`tab-button-${tabKey}`}
            onPress={handlePress}
            style={[styles.tabButton, isLandscape && { paddingVertical: 0 }]}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isLandscape && { minHeight: 18 }]}>
              <Ionicons
                name={(isFocused ? meta.icon : `${meta.icon}-outline`) as any}
                size={isLandscape ? 17 : 21}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              {isFocused && (
                <View
                  style={[
                    styles.focusedIndicator,
                    { backgroundColor: colors.primary },
                    isLandscape && { width: 10, height: 2, bottom: -2 },
                  ]}
                />
              )}
            </View>

            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? colors.primary : colors.textMuted,
                  fontWeight: isFocused ? '800' : '600',
                  fontSize: isLandscape ? 9 : 10.5,
                  marginTop: isLandscape ? 1 : 2,
                },
              ]}
              numberOfLines={1}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Botão Dinâmico "Mais" (exibido apenas quando houver abas excedentes) */}
      {overflowTabs.length > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={isOverflowActive ? { selected: true } : {}}
          accessibilityLabel="Outras Telas"
          testID="tab-button-more"
          onPress={onOpenMoreModal}
          style={[styles.tabButton, isLandscape && { paddingVertical: 0 }]}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, isLandscape && { minHeight: 18 }]}>
            <Ionicons
              name={isOverflowActive ? 'apps' : 'apps-outline'}
              size={isLandscape ? 17 : 21}
              color={isOverflowActive ? colors.primary : colors.textMuted}
            />
            {isOverflowActive ? (
              <View
                style={[
                  styles.focusedIndicator,
                  { backgroundColor: colors.primary },
                  isLandscape && { width: 10, height: 2, bottom: -2 },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.overflowCountBadge,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                  isLandscape && { top: -2, right: -6, minWidth: 12, height: 12, borderRadius: 6 },
                ]}
              >
                <Text
                  style={[
                    styles.overflowCountText,
                    { color: colors.primary },
                    isLandscape && { fontSize: 7.5 },
                  ]}
                >
                  {overflowTabs.length}
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.tabLabel,
              {
                color: isOverflowActive ? colors.primary : colors.textMuted,
                fontWeight: isOverflowActive ? '800' : '600',
                fontSize: isLandscape ? 9 : 10.5,
                marginTop: isLandscape ? 1 : 2,
              },
            ]}
            numberOfLines={1}
          >
            Mais
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  focusedIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
  },
  overflowCountBadge: {
    position: 'absolute',
    top: -3,
    right: -7,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  overflowCountText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
});
