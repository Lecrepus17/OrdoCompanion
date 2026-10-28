import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { SupportCenterView } from '../../components/SupportCenterView';

export default function SupportScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SupportCenterView activeRoute="/(tabs)/support" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
