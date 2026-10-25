import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function confirmAction({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    const fullText = message ? `${title}\n\n${message}` : title;
    const ok = typeof window !== 'undefined' ? window.confirm(fullText) : true;
    if (ok) {
      void onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => {
          void onConfirm();
        },
      },
    ]);
  }
}

export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const fullText = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') {
      window.alert(fullText);
    }
  } else {
    Alert.alert(title, message);
  }
}
