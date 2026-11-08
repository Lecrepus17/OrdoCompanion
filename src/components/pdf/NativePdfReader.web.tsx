import React, { forwardRef, useImperativeHandle } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

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
 * On Web, native binary PDF reader is not available.
 * Web environment uses PDF.js (canvas/iframe) or text fallback.
 */
export const isNativePdfReaderAvailable = false;

/**
 * Test helper stub for symmetry across platforms.
 * On Web, native reader is never available.
 */
export function setNativePdfReaderAvailableForTest(_available: boolean): void {
  // Safe no-op on Web
}

/**
 * Test helper stub to reset availability state.
 */
export function resetNativePdfReaderAvailableForTest(): void {
  // Safe no-op on Web
}

/**
 * NativePdfReader Web Stub
 * Renders null and safely no-ops imperative ref calls.
 * ZERO imports of react-native-pdf or native binary modules.
 */
export const NativePdfReader = forwardRef<NativePdfReaderRef, NativePdfReaderProps>(
  (_props, ref) => {
    useImperativeHandle(ref, () => ({
      setPage: (_pageNumber: number) => {
        // Safe no-op on Web
      },
    }));

    return null;
  }
);

NativePdfReader.displayName = 'NativePdfReaderWeb';

export default NativePdfReader;
