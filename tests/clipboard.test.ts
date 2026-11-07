import './setup';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Platform, Share } from 'react-native';
import { copyToClipboard, readFromClipboard } from '../src/utils/clipboard';

describe('src/utils/clipboard.ts - Testes Unitários de Compatibilidade', () => {
  const originalPlatformOS = Platform.OS;
  const originalNavigator = (globalThis as any).navigator;

  afterEach(() => {
    (Platform as any).OS = originalPlatformOS;
    (globalThis as any).navigator = originalNavigator;
  });

  it('retorna false imediatamente se o texto fornecido for vazio', async () => {
    const res = await copyToClipboard('');
    assert.equal(res, false);
  });

  it('no ambiente Web: utiliza navigator.clipboard.writeText quando disponível', async () => {
    (Platform as any).OS = 'web';
    let writtenText = '';
    (globalThis as any).navigator = {
      clipboard: {
        writeText: async (t: string) => {
          writtenText = t;
        },
      },
    };

    const res = await copyToClipboard('Teste Ordo 123', 'Titulo');
    assert.equal(res, true);
    assert.equal(writtenText, 'Teste Ordo 123');
  });

  it('no ambiente Web: lê texto com readFromClipboard', async () => {
    (Platform as any).OS = 'web';
    (globalThis as any).navigator = {
      clipboard: {
        readText: async () => '{"characters": []}',
      },
    };

    const text = await readFromClipboard();
    assert.equal(text, '{"characters": []}');
  });

  it('no ambiente Android Hermes: navigator é undefined e utiliza Share.share nativo', async () => {
    (Platform as any).OS = 'android';
    (globalThis as any).navigator = undefined;

    let sharedPayload: any = null;
    const originalShare = Share.share;
    Share.share = async (content: any) => {
      sharedPayload = content;
      return { action: 'sharedAction' } as any;
    };

    try {
      const res = await copyToClipboard('Código Ficha Base64', 'Ficha do Agente');
      assert.equal(res, true);
      assert.deepEqual(sharedPayload, {
        message: 'Código Ficha Base64',
        title: 'Ficha do Agente',
      });
    } finally {
      Share.share = originalShare;
    }
  });

  it('no ambiente Android Hermes: readFromClipboard retorna string vazia sem lançar erro', async () => {
    (Platform as any).OS = 'android';
    (globalThis as any).navigator = undefined;

    const res = await readFromClipboard();
    assert.equal(res, '');
  });

  it('trata erros silenciosamente e retorna false se Share.share falhar', async () => {
    (Platform as any).OS = 'android';
    (globalThis as any).navigator = undefined;

    const originalShare = Share.share;
    Share.share = async () => {
      throw new Error('Falha simulada do sistema Android');
    };

    try {
      const res = await copyToClipboard('Texto', 'Titulo');
      assert.equal(res, false);
    } finally {
      Share.share = originalShare;
    }
  });
});
