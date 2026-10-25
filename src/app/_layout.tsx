import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider, useApp } from '../context/AppContext';
import { ThemeProvider, useTheme } from '../theme';
import { DiceToast } from '../components/DiceToast';
import { AppManualModal } from '../components/AppManualModal';
import { UpdateNotificationModal } from '../components/UpdateNotificationModal';

// Trata fechamento e captura de sessão OAuth em popups e navegadores no web/mobile
WebBrowser.maybeCompleteAuthSession();

function RootLayoutContent() {
  const { colors, theme } = useTheme();
  const {
    manualModalVisible,
    closeManual,
    manualInitialSection,
    updateModalVisible,
    updateInfo,
    dismissUpdate,
  } = useApp();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={theme.statusBarStyle} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="entity/[id]"
          options={{ title: 'Detalhes do Registro', presentation: 'card' }}
        />
        <Stack.Screen
          name="entity/editor"
          options={{ title: 'Criar / Editar Registro', presentation: 'modal' }}
        />
      </Stack>
      <DiceToast />
      <AppManualModal
        visible={manualModalVisible}
        initialSection={manualInitialSection}
        onClose={closeManual}
      />
      <UpdateNotificationModal
        visible={updateModalVisible}
        updateInfo={updateInfo}
        onDismiss={dismissUpdate}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <RootLayoutContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
