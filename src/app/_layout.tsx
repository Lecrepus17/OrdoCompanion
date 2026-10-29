import React from 'react';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider, useApp } from '../context/AppContext';
import { ThemeProvider, useTheme } from '../theme';
import { DiceToast } from '../components/DiceToast';
import { AppManualModal } from '../components/AppManualModal';
import { UpdateNotificationModal } from '../components/UpdateNotificationModal';
import { RecordPreviewModal } from '../components/RecordPreviewModal';
import { PdfUploadAccessModal } from '../components/PdfUploadAccessModal';

// Trata fechamento e captura de sessão OAuth em popups e navegadores no web/mobile
WebBrowser.maybeCompleteAuthSession();

function RootLayoutContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const {
    manualModalVisible,
    closeManual,
    manualInitialSection,
    updateModalVisible,
    updateInfo,
    dismissUpdate,
    recordPreview,
    closeRecordPreview,
    pdfAccessModalVisible,
    closePdfAccessModal,
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
          options={{
            title: 'Detalhes do Registro',
            presentation: 'card',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ paddingRight: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>Voltar</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen
          name="entity/editor"
          options={{
            title: 'Criar / Editar Registro',
            presentation: 'modal',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ paddingRight: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>Voltar</Text>
              </TouchableOpacity>
            ),
          }}
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
      <RecordPreviewModal
        request={recordPreview}
        onClose={closeRecordPreview}
      />
      <PdfUploadAccessModal
        visible={pdfAccessModalVisible}
        onClose={closePdfAccessModal}
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

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={54} color="#EF4444" />
      <Text style={styles.errorTitle}>Instabilidade na Membrana</Text>
      <Text style={styles.errorMessage}>
        Ocorreu uma falha inesperada ao renderizar este módulo:
      </Text>
      <View style={styles.errorCard}>
        <Text style={styles.errorCardText} numberOfLines={4}>
          {error?.message || 'Erro desconhecido.'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Tentar Novamente"
      >
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Tentar Novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorCard: {
    backgroundColor: '#16181D',
    borderColor: '#2A2E39',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
    maxWidth: 480,
  },
  errorCardText: {
    color: '#F87171',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
