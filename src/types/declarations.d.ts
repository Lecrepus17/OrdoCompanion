declare module 'expo-document-picker' {
  export interface DocumentPickerAsset {
    name: string;
    size?: number;
    uri: string;
    mimeType?: string;
    lastModified?: number;
    file?: File;
  }
  export interface DocumentPickerResult {
    canceled: boolean;
    assets: DocumentPickerAsset[] | null;
  }
  export interface DocumentPickerOptions {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }
  export function getDocumentAsync(options?: DocumentPickerOptions): Promise<DocumentPickerResult>;
}

declare module 'expo-sharing' {
  export interface SharingOptions {
    mimeType?: string;
    dialogTitle?: string;
    UTI?: string;
  }
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: SharingOptions): Promise<void>;
}

declare module 'react-native-pdf' {
  import * as React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface PdfProps {
    source: { uri?: string; [key: string]: any } | number;
    page?: number;
    horizontal?: boolean;
    enablePaging?: boolean;
    onLoadComplete?: (numberOfPages: number, filePath: string) => void;
    onPageChanged?: (page: number, numberOfPages: number) => void;
    onError?: (error: any) => void;
    onLoadProgress?: (percent: number) => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    [key: string]: any;
  }

  export default class Pdf extends React.Component<PdfProps, any> {
    setPage: (pageNumber: number) => void;
  }
}

declare module 'react-native-blob-util' {
  const ReactNativeBlobUtil: any;
  export default ReactNativeBlobUtil;
}

