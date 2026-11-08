import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface NativePdfReaderProps {
  /** Local file URI (file://...) */
  uri: string;
  /** Current target page number (1-indexed) */
  page?: number;
  /** Horizontal orientation (true for horizontal paging, false for vertical scroll) */
  horizontal?: boolean;
  /** Snap to page (true for page-by-page, false for continuous scroll) */
  enablePaging?: boolean;
  /** Callback when PDF finishes loading */
  onLoadComplete?: (numberOfPages: number, filePath: string) => void;
  /** Callback when page is changed */
  onPageChanged?: (page: number, numberOfPages: number) => void;
  /** Callback on load or render error */
  onError?: (error: any) => void;
  /** Custom style for the reader */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
  /** Background color for canvas/container */
  backgroundColor?: string;
  children?: React.ReactNode;
}

export interface NativePdfReaderRef {
  /** Imperatively jumps to a specific page (1-indexed) */
  setPage: (pageNumber: number) => void;
}

/**
 * Indicates whether the native PDF reader binary is available in the current runtime.
 * In Node.js / test environment, defaults to false, but can be controlled via
 * `setNativePdfReaderAvailableForTest` for test coverage.
 */
export let isNativePdfReaderAvailable = false;

/**
 * Test helper to toggle native PDF reader availability in Node.js test suites.
 */
export function setNativePdfReaderAvailableForTest(available: boolean): void {
  isNativePdfReaderAvailable = available;
}

/**
 * Test helper to reset native PDF reader availability to its default state (false).
 */
export function resetNativePdfReaderAvailableForTest(): void {
  isNativePdfReaderAvailable = false;
}

/**
 * Node.js / Test Fallback Component for NativePdfReader.
 * Renders a mock View with testID="native-pdf-reader" and simulates lifecycle callbacks
 * for testing without requiring native binaries.
 */
export const NativePdfReader = forwardRef<NativePdfReaderRef, NativePdfReaderProps>(
  (
    {
      uri,
      page = 1,
      horizontal = false,
      enablePaging = false,
      onPageChanged,
      onLoadComplete,
      onError,
      style,
      testID = 'native-pdf-reader',
      backgroundColor = '#121214',
      children,
    },
    ref
  ) => {
    const defaultNumberOfPages = 100;

    useImperativeHandle(ref, () => ({
      setPage: (pageNumber: number) => {
        onPageChanged?.(pageNumber, defaultNumberOfPages);
      },
    }));

    useEffect(() => {
      if (!uri) {
        onError?.(new Error('NativePdfReader: URI is empty'));
        return;
      }

      const lowerUri = String(uri).toLowerCase();
      if (
        lowerUri.includes('invalid') ||
        lowerUri.includes('error') ||
        lowerUri.includes('fail')
      ) {
        onError?.(new Error(`NativePdfReader: Simulated load error for URI ${uri}`));
        return;
      }

      onLoadComplete?.(defaultNumberOfPages, uri);
      if (page) {
        onPageChanged?.(page, defaultNumberOfPages);
      }
    }, [uri]);

    return (
      <View
        testID={testID}
        style={[styles.container, { backgroundColor }, style]}
        accessibilityRole="none"
        accessibilityLabel="Native PDF Reader Mock"
      >
        {children}
      </View>
    );
  }
);

NativePdfReader.displayName = 'NativePdfReaderNodeFallback';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});

export default NativePdfReader;
