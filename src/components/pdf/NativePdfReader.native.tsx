import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { View, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

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

let PdfComponent: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfModule = require('react-native-pdf');
  PdfComponent = pdfModule?.default || pdfModule?.Pdf || pdfModule;
} catch {
  PdfComponent = null;
}

export let isNativePdfReaderAvailable: boolean = Boolean(PdfComponent);

export function setNativePdfReaderAvailableForTest(available: boolean): void {
  isNativePdfReaderAvailable = available;
}

export function resetNativePdfReaderAvailableForTest(): void {
  isNativePdfReaderAvailable = Boolean(PdfComponent);
}

export const NativePdfReader = React.memo(
  forwardRef<NativePdfReaderRef, NativePdfReaderProps>(
    (
      {
        uri,
        page = 1,
        horizontal = false,
        enablePaging = false,
        onLoadComplete,
        onPageChanged,
        onError,
        style,
        testID = 'native-pdf-reader',
        backgroundColor = '#121214',
        children,
      },
      ref
    ) => {
      if (!PdfComponent || !isNativePdfReaderAvailable) {
        return null;
      }

      const pdfRef = useRef<any>(null);
      const lastReportedPageRef = useRef<number>(page || 1);
      const initialPageRef = useRef<number>(page || 1);
      const prevConfigKeyRef = useRef<string>(`${uri}|${Boolean(horizontal)}|${Boolean(enablePaging)}`);

      const currentConfigKey = `${uri}|${Boolean(horizontal)}|${Boolean(enablePaging)}`;
      if (prevConfigKeyRef.current !== currentConfigKey) {
        prevConfigKeyRef.current = currentConfigKey;
        initialPageRef.current = page || 1;
        lastReportedPageRef.current = page || 1;
      }

      const onLoadCompleteRef = useRef(onLoadComplete);
      onLoadCompleteRef.current = onLoadComplete;

      const onPageChangedRef = useRef(onPageChanged);
      onPageChangedRef.current = onPageChanged;

      const onErrorRef = useRef(onError);
      onErrorRef.current = onError;

      useImperativeHandle(
        ref,
        () => ({
          setPage: (targetPage: number) => {
            if (typeof targetPage === 'number' && targetPage > 0) {
              lastReportedPageRef.current = targetPage;
              if (pdfRef.current && typeof pdfRef.current.setPage === 'function') {
                pdfRef.current.setPage(targetPage);
              }
            }
          },
        }),
        []
      );

      // Synchronize external page changes (TOC, input, deep link) while preventing scroll feedback loops.
      // IMPORTANT: Never pass the dynamic `page` state directly to <PdfComponent page={...} />,
      // because on Android RCTPdfManager.onAfterUpdateTransaction calls pdfView.drawPdf() on any prop update,
      // which recycles the Pdfium bitmap cache during scroll and turns the screen black!
      useEffect(() => {
        if (typeof page === 'number' && page > 0 && page !== lastReportedPageRef.current) {
          lastReportedPageRef.current = page;
          if (pdfRef.current && typeof pdfRef.current.setPage === 'function') {
            pdfRef.current.setPage(page);
          }
        }
      }, [page]);

      // Direct disk streaming: cache=false prevents copying large PDFs into RAM
      const source = useMemo(() => {
        const normalizedUri =
          uri && !uri.startsWith('file://') && !uri.startsWith('http://') && !uri.startsWith('https://')
            ? `file://${uri}`
            : uri;
        return { uri: normalizedUri, cache: false };
      }, [uri]);

      const combinedStyle = useMemo(
        () => [styles.pdf, { backgroundColor }, style],
        [backgroundColor, style]
      );

      const handleLoadComplete = useCallback(
        (numberOfPages: number, filePath: string) => {
          onLoadCompleteRef.current?.(numberOfPages, filePath);
        },
        []
      );

      const handlePageChanged = useCallback(
        (newPage: number, numberOfPages: number) => {
          lastReportedPageRef.current = newPage;
          onPageChangedRef.current?.(newPage, numberOfPages);
        },
        []
      );

      const handleError = useCallback(
        (error: any) => {
          onErrorRef.current?.(error);
        },
        []
      );

      const renderActivityIndicator = useCallback(() => {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E53E3E" />
          </View>
        );
      }, []);

      return (
        <PdfComponent
          ref={pdfRef}
          source={source}
          page={initialPageRef.current}
          horizontal={Boolean(horizontal)}
          enablePaging={Boolean(enablePaging)}
          minScale={1.0}
          maxScale={4.0}
          fitPolicy={0}
          spacing={8}
          enableAntialiasing={true}
          enableRTL={false}
          trustAllCerts={false}
          onLoadComplete={handleLoadComplete}
          onPageChanged={handlePageChanged}
          onError={handleError}
          style={combinedStyle}
          renderActivityIndicator={renderActivityIndicator}
          testID={testID}
        >
          {children}
        </PdfComponent>
      );
    }
  )
);

NativePdfReader.displayName = 'NativePdfReader';

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default NativePdfReader;
