import './setup';
import React, { act } from 'react';
// @ts-ignore
import { createRoot, Root } from 'react-dom/client';
import { AppProvider, useApp } from '../src/context/AppContext';
import { ThemeProvider } from '../src/theme';
import { RecordPreviewModal } from '../src/components/RecordPreviewModal';
import { PdfUploadAccessModal } from '../src/components/PdfUploadAccessModal';
import {
  setMobilePlatform,
  setSafeAreaInsets,
  mockRouter,
  mockAlertCalls,
  clearMockAlerts,
  resetMockStorage,
} from './setup';

export interface RenderResult {
  container: HTMLDivElement;
  getByText: (text: string | RegExp) => HTMLElement;
  queryByText: (text: string | RegExp) => HTMLElement | null;
  getByPlaceholder: (placeholder: string | RegExp) => HTMLInputElement;
  queryByPlaceholder: (placeholder: string | RegExp) => HTMLInputElement | null;
  getByTestId: (testId: string) => HTMLElement;
  queryByTestId: (testId: string) => HTMLElement | null;
  getAllByText: (text: string | RegExp) => HTMLElement[];
  unmount: () => void;
}

const activeRoots = new Set<{ root: Root; container: HTMLDivElement }>();

export async function cleanup(): Promise<void> {
  for (const { root, container } of activeRoots) {
    try {
      await act(async () => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    } catch {}
  }
  activeRoots.clear();
  if (typeof document !== 'undefined' && document.body) {
    document.body.innerHTML = '';
  }
  resetMockStorage();
  setMobilePlatform('web');
}

function TestRootHost({ children }: { children: React.ReactNode }) {
  const {
    recordPreview,
    closeRecordPreview,
    pdfAccessModalVisible,
    closePdfAccessModal,
  } = useApp();

  return (
    <>
      {children}
      <RecordPreviewModal request={recordPreview} onClose={closeRecordPreview} />
      <PdfUploadAccessModal visible={pdfAccessModalVisible} onClose={closePdfAccessModal} />
    </>
  );
}

export async function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    mobile?: boolean | 'android' | 'ios';
  }
): Promise<RenderResult> {
  if (options?.mobile) {
    const platform = options.mobile === true ? 'android' : options.mobile;
    setMobilePlatform(platform);
  } else {
    setMobilePlatform('web');
  }

  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  activeRoots.add({ root, container });

  await act(async () => {
    root.render(
      <ThemeProvider>
        <AppProvider>
          <TestRootHost>{ui}</TestRootHost>
        </AppProvider>
      </ThemeProvider>
    );
    // Allow AppProvider async storage sync to settle
    await new Promise((r) => setTimeout(r, 25));
  });

  const getByText = (text: string | RegExp): HTMLElement => {
    const el = queryByText(text);
    if (!el) {
      throw new Error(`Element with text "${String(text)}" not found in container. Available text:\n${container.textContent?.slice(0, 500)}`);
    }
    return el;
  };

  const queryByText = (text: string | RegExp): HTMLElement | null => {
    const searchTargets = [container, document.body];
    for (const target of searchTargets) {
      const all = target.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) {
        const node = all[i] as HTMLElement;
        const content = node.textContent ?? '';
        if (typeof text === 'string') {
          if (content.includes(text) && node.children.length === 0) {
            return node;
          }
        } else if (text.test(content) && node.children.length === 0) {
          return node;
        }
      }
    }
    // Fallback: check elements with children
    for (const target of searchTargets) {
      const all = target.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) {
        const node = all[i] as HTMLElement;
        const content = node.textContent ?? '';
        if (typeof text === 'string' ? content.includes(text) : text.test(content)) {
          return node;
        }
      }
    }
    return null;
  };

  const getAllByText = (text: string | RegExp): HTMLElement[] => {
    const results: HTMLElement[] = [];
    const all = container.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      const node = all[i] as HTMLElement;
      const content = node.textContent ?? '';
      if (typeof text === 'string' ? content.includes(text) : text.test(content)) {
        results.push(node);
      }
    }
    return results;
  };

  const getByPlaceholder = (placeholder: string | RegExp): HTMLInputElement => {
    const el = queryByPlaceholder(placeholder);
    if (!el) {
      throw new Error(`Input with placeholder "${String(placeholder)}" not found.`);
    }
    return el;
  };

  const queryByPlaceholder = (placeholder: string | RegExp): HTMLInputElement | null => {
    const searchTargets = [container, document.body];
    for (const target of searchTargets) {
      if (!target) continue;
      const inputs = target.querySelectorAll('input, textarea');
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i] as HTMLInputElement;
        if (input.isConnected === false) continue;
        const ph = input.getAttribute('placeholder') || (input as any).placeholder || '';
        if (typeof placeholder === 'string') {
          if (ph.includes(placeholder)) return input;
        } else if (placeholder.test(ph)) {
          return input;
        }
      }
    }
    return null;
  };

  const getByTestId = (testId: string): HTMLElement => {
    const el = queryByTestId(testId);
    if (!el) throw new Error(`Element with testID/data-testid "${testId}" not found.`);
    return el;
  };

  const queryByTestId = (testId: string): HTMLElement | null => {
    const searchTargets = [container, document.body];
    for (const target of searchTargets) {
      if (!target) continue;
      const el =
        target.querySelector(`[data-testid="${testId}"]`) ||
        target.querySelector(`[testID="${testId}"]`);
      if (el) return el as HTMLElement;
    }
    return null;
  };

  return {
    container,
    getByText,
    queryByText,
    getByPlaceholder,
    queryByPlaceholder,
    getByTestId,
    queryByTestId,
    getAllByText,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      activeRoots.delete({ root, container });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

export async function fireClick(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));
  });
}

export async function fireLongPress(element: Element, durationMs = 450): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    if (typeof PointerEvent !== 'undefined') {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    }
    await new Promise((r) => setTimeout(r, durationMs));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    if (typeof PointerEvent !== 'undefined') {
      element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    }
    await new Promise((r) => setTimeout(r, 20));
  });
}

export async function changeInputText(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  await act(async () => {
    const prototype = Object.getPrototypeOf(element);
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
  });
}

export { mockRouter, mockAlertCalls, clearMockAlerts, setMobilePlatform, setSafeAreaInsets };
