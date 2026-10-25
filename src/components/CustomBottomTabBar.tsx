import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);
  const tabHeight = 56 + bottomInset;

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
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={(isFocused ? meta.icon : `${meta.icon}-outline`) as any}
                size={21}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              {isFocused && (
                <View
                  style={[
                    styles.focusedIndicator,
                    { backgroundColor: colors.primary },
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
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={isOverflowActive ? 'apps' : 'apps-outline'}
              size={21}
              color={isOverflowActive ? colors.primary : colors.textMuted}
            />
            {isOverflowActive ? (
              <View
                style={[
                  styles.focusedIndicator,
                  { backgroundColor: colors.primary },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.overflowCountBadge,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.overflowCountText, { color: colors.primary }]}>
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
