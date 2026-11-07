import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

// Sinaliza a conclusão da sessão de autenticação para popups web e intents nativos
WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirectScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Executa conclusão da autenticação e redireciona automaticamente
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();

    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [router]);

  // Captura o botão físico de voltar no Android
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const handleManualReturn = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background || '#0A0A0C' }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar style="light" />
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.surface || '#121316',
            borderColor: colors.border || '#2A2E39',
          },
        ]}
      >
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.primarySoft || 'rgba(239, 68, 68, 0.1)',
              borderColor: colors.primary || '#EF4444',
            },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={64} color={colors.primary || '#EF4444'} />
        </View>

        <Text style={[styles.title, { color: colors.text || '#F3F4F6' }]}>
          Autenticação em Andamento
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary || '#9CA3AF' }]}>
          Processando credenciais seguras e sincronizando dados com a base da Ordo Realitas...
        </Text>

        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary || '#EF4444'} />
        </View>

        <Text style={[styles.hintText, { color: colors.textMuted || '#6B7280' }]}>
          Você será redirecionado automaticamente em instantes.
        </Text>

        <TouchableOpacity
          style={[
            styles.returnButton,
            {
              backgroundColor: colors.surfaceElevated || '#1E222B',
              borderColor: colors.border || '#374151',
            },
          ]}
          onPress={handleManualReturn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Retornar ao Terminal"
        >
          <Ionicons name="arrow-back" size={18} color={colors.text || '#FFFFFF'} />
          <Text style={[styles.returnButtonText, { color: colors.text || '#FFFFFF' }]}>
            Retornar ao Terminal
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingWrapper: {
    marginVertical: 12,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  returnButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
