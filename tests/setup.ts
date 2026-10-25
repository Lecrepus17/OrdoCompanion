// Test setup to provide in-memory mocks for React Native / Web globals in Node.js test environment
import Module from 'module';

// Polyfill environment variables expected by Expo
process.env.EXPO_OS = 'web';
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

const mockLocation = {
  protocol: 'http:',
  hostname: 'localhost',
  port: '8081',
  href: 'http://localhost:8081/',
  pathname: '/',
  search: '',
  hash: '',
};

(globalThis as unknown as { location: unknown }).location = mockLocation;

// Polyfill document for web bundler helpers
if (typeof globalThis.document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    currentScript: null,
    createElement: () => ({ appendChild: () => {}, setAttribute: () => {} }),
    head: { appendChild: () => {} },
  };
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

// Mock window and localStorage
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

const win = globalThis.window as unknown as Record<string, unknown> | undefined;
if (!win) {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: mockLocalStorage,
    location: mockLocation,
    addEventListener: () => {},
    removeEventListener: () => {},
    confirm: () => true,
    alert: () => {},
  };
} else {
  if (!win.localStorage) win.localStorage = mockLocalStorage;
  if (!win.location) win.location = mockLocation;
  if (!win.addEventListener) win.addEventListener = () => {};
  if (!win.removeEventListener) win.removeEventListener = () => {};
  if (!win.confirm) win.confirm = () => true;
  if (!win.alert) win.alert = () => {};
}

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

// Mock native-only packages like expo-print in Node.js
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'expo-print') {
    return {
      printAsync: async () => {},
      printToFileAsync: async () => ({ uri: 'test.pdf' }),
    };
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments as unknown as [id: string]);
};

export function resetMockStorage(): void {
  storageMap.clear();
}
