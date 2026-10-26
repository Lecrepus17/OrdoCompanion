// Test setup to provide in-memory mocks for React Native / Web globals in Node.js test environment
import Module from 'module';
import { JSDOM } from 'jsdom';

// Polyfill environment variables expected by Expo
process.env.EXPO_OS = 'web';
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill ResizeObserver
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
// Setup JSDOM environment for frontend DOM and React 19 testing
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:8081/',
  pretendToBeVisual: true,
});
dom.window.ResizeObserver = globalThis.ResizeObserver as any;

const win = dom.window;
const globalsToSet: Array<[string, any]> = [
  ['window', win],
  ['document', win.document],
  ['navigator', win.navigator],
  ['location', win.location],
  ['HTMLElement', win.HTMLElement],
  ['Element', win.Element],
  ['Node', win.Node],
  ['CustomEvent', win.CustomEvent],
  ['Event', win.Event],
  ['MouseEvent', win.MouseEvent],
  ['PointerEvent', win.PointerEvent],
  ['KeyboardEvent', win.KeyboardEvent],
  ['HTMLInputElement', win.HTMLInputElement],
  ['HTMLTextAreaElement', win.HTMLTextAreaElement],
  ['ShadowRoot', win.ShadowRoot],
  ['MutationObserver', win.MutationObserver],
  ['CSSStyleSheet', win.CSSStyleSheet],
];

for (const [key, val] of globalsToSet) {
  if (val !== undefined) {
    try {
      Object.defineProperty(globalThis, key, {
        value: val,
        configurable: true,
        writable: true,
      });
    } catch {
      (globalThis as any)[key] = val;
    }
  }
}

// Polyfill globalThis.expo for expo-modules-core / expo-constants
if (!(globalThis as unknown as { expo?: unknown }).expo) {
  (globalThis as unknown as { expo: unknown }).expo = {
    EventEmitter: class EventEmitter {
      addListener() {
        return { remove() {} };
      }
      removeListener() {}
      emit() {}
    },
    modules: {},
  };
}

// Storage Map & localStorage polyfill
const storageMap = new Map<string, string>();

const mockLocalStorage = {
  getItem: (key: string): string | null => {
    return storageMap.has(key) ? storageMap.get(key)! : null;
  },
  setItem: (key: string, value: string): void => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string): void => {
    storageMap.delete(key);
  },
  clear: (): void => {
    storageMap.clear();
  },
  key: (index: number): string | null => {
    const keys = Array.from(storageMap.keys());
    return keys[index] ?? null;
  },
  get length(): number {
    return storageMap.size;
  },
};

Object.defineProperty(dom.window, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  writable: true,
});
(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;

export let mockWindowConfirmResult = true;
export const mockWindowAlerts: string[] = [];
dom.window.alert = (msg: string) => {
  mockWindowAlerts.push(String(msg));
};
dom.window.confirm = () => mockWindowConfirmResult;

export function setMockWindowConfirm(result: boolean) {
  mockWindowConfirmResult = result;
}

// Mock alerts and mobile alerts
export const mockAlertCalls: Array<{ title: string; message?: string; buttons?: any[] }> = [];
export function clearMockAlerts() {
  mockAlertCalls.length = 0;
  mockWindowAlerts.length = 0;
}

// Mock Router for Expo Router
export const mockRouter = {
  push: (href: any) => {
    mockRouter.history.push({ action: 'push', href });
  },
  replace: (href: any) => {
    mockRouter.history.push({ action: 'replace', href });
  },
  back: () => {
    mockRouter.history.push({ action: 'back' });
  },
  setParams: (params: any) => {
    Object.assign(mockRouter.params, params);
  },
  navigate: (href: any) => {
    mockRouter.history.push({ action: 'navigate', href });
  },
  history: [] as Array<{ action: string; href?: any }>,
  params: {} as Record<string, string>,
  reset: () => {
    mockRouter.history = [];
    mockRouter.params = {};
  },
};

// Safe Area Insets (Mobile simulation)
export let currentSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
export function setSafeAreaInsets(insets: { top: number; right: number; bottom: number; left: number }) {
  currentSafeAreaInsets = insets;
}

// Mobile Platform Switcher
export function setMobilePlatform(platform: 'android' | 'ios' | 'web') {
  const RN = require('react-native-web');
  if (RN && RN.Platform) {
    RN.Platform.OS = platform;
    RN.Platform.select = (obj: any) => obj[platform] ?? obj.default;
  }
  if (platform === 'android') {
    currentSafeAreaInsets = { top: 24, right: 0, bottom: 16, left: 0 };
  } else if (platform === 'ios') {
    currentSafeAreaInsets = { top: 47, right: 0, bottom: 34, left: 0 };
  } else {
    currentSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

// Image asset extensions in Node
['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].forEach((ext) => {
  require.extensions[ext] = (m: any, filename: string) => {
    m.exports = filename;
  };
});

// Redirect 'react-native' imports to 'react-native-web' in CommonJS resolution
const mod = Module as unknown as {
  _resolveFilename: (request: string, parent: unknown, isMain: boolean, options: unknown) => string;
};
const originalResolve = mod._resolveFilename;
mod._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options: unknown) {
  if (request === 'react-native') {
    request = 'react-native-web';
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// Mock native-only packages like expo-print and expo-web-browser in Node.js
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'expo-linking') {
    return {
      openURL: async () => {},
      canOpenURL: async () => true,
      createURL: (path: string) => `ordo://${path}`,
      addEventListener: () => ({ remove: () => {} }),
    };
  }
  if (id === 'expo-constants') {
    return {
      default: {
        expoConfig: { extra: {} },
        manifest: {},
        platform: { web: {} },
      },
    };
  }
  if (id === 'expo-auth-session') {
    return {
      makeRedirectUri: () => 'http://localhost:8081',
      startAsync: async () => ({ type: 'success' }),
    };
  }
  if (id === 'expo-crypto') {
    const nodeCrypto = require('crypto');
    return {
      randomUUID: () => nodeCrypto.randomUUID(),
      getRandomBytes: (count: number) => nodeCrypto.randomBytes(count),
      digestStringAsync: async (_alg: string, str: string) =>
        nodeCrypto.createHash('sha256').update(str).digest('hex'),
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    };
  }
  if (id === 'expo-print') {
    return {
      printAsync: async () => {},
      printToFileAsync: async () => ({ uri: 'test.pdf' }),
    };
  }
  if (id === 'expo-web-browser') {
    return {
      openBrowserAsync: async () => ({ type: 'opened' }),
      WebBrowserPresentationStyle: { FULL_SCREEN: 'fullScreen' },
      maybeCompleteAuthSession: () => {},
    };
  }
  if (id === 'expo-asset') {
    return {
      Asset: {
        fromModule: () => ({ uri: 'mock' }),
      },
    };
  }
  if (id === 'expo-status-bar') {
    return {
      StatusBar: () => null,
    };
  }
  if (id === 'expo-router') {
    return {
      useRouter: () => mockRouter,
      useLocalSearchParams: () => mockRouter.params,
      usePathname: () => '/',
      useSegments: () => [],
      Link: ({ children, ...props }: any) => children,
      Stack: Object.assign(({ children }: any) => children, { Screen: () => null }),
      Tabs: Object.assign(({ children }: any) => children, { Screen: () => null }),
    };
  }
  if (id === 'react-native-safe-area-context') {
    const React = require('react');
    const { View } = require('react-native-web');
    return {
      useSafeAreaInsets: () => currentSafeAreaInsets,
      SafeAreaProvider: ({ children }: any) => children,
      SafeAreaView: ({ children, ...props }: any) => React.createElement(View, props, children),
    };
  }
  if (id === '@expo/vector-icons' || id.startsWith('@expo/vector-icons/')) {
    const React = require('react');
    const IconStub = (props: any) =>
      React.createElement('span', { 'data-testid': props.name, 'data-icon': props.name }, props.children);
    return {
      Ionicons: IconStub,
      MaterialIcons: IconStub,
      FontAwesome5: IconStub,
      Feather: IconStub,
      AntDesign: IconStub,
      MaterialCommunityIcons: IconStub,
    };
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments as unknown as [id: string]);
};

// Polyfill Alert in react-native-web
try {
  const RN = require('react-native-web');
  if (RN) {
    if (!RN.Alert) RN.Alert = {};
    RN.Alert.alert = (title: string, message?: string, buttons?: any[]) => {
      mockAlertCalls.push({ title, message, buttons });
      if (buttons && buttons.length > 0) {
        const confirmBtn = buttons.find((b: any) => b.style !== 'cancel') || buttons[0];
        if (confirmBtn && typeof confirmBtn.onPress === 'function') {
          confirmBtn.onPress();
        }
      }
    };
  }
} catch {
  // Ignored if react-native-web is not yet loaded
}

export function resetMockStorage(): void {
  storageMap.clear();
  clearMockAlerts();
  mockRouter.reset();
}
