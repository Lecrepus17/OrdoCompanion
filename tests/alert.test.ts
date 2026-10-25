import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { confirmAction, showAlert } from '../src/utils/alert';

describe('Utilitários de Alerta e Diálogo (alert.ts)', () => {
  it('confirmAction deve disparar onConfirm quando usuário confirma no ambiente web', () => {
    let confirmCalled = false;
    let cancelCalled = false;
    let capturedMessage = '';

    // Mock window.confirm
    (globalThis.window as unknown as { confirm: (msg: string) => boolean }).confirm = (msg: string) => {
      capturedMessage = msg;
      return true;
    };

    confirmAction({
      title: 'Excluir Personagem',
      message: 'Tem certeza que deseja apagar?',
      onConfirm: () => {
        confirmCalled = true;
      },
      onCancel: () => {
        cancelCalled = true;
      },
    });

    assert.strictEqual(confirmCalled, true);
    assert.strictEqual(cancelCalled, false);
    assert.ok(capturedMessage.includes('Excluir Personagem'));
    assert.ok(capturedMessage.includes('Tem certeza que deseja apagar?'));
  });

  it('confirmAction deve disparar onCancel quando usuário cancela no ambiente web', () => {
    let confirmCalled = false;
    let cancelCalled = false;

    // Mock window.confirm returning false
    (globalThis.window as unknown as { confirm: (msg: string) => boolean }).confirm = () => false;

    confirmAction({
      title: 'Restaurar Padrão',
      onConfirm: () => {
        confirmCalled = true;
      },
      onCancel: () => {
        cancelCalled = true;
      },
    });

    assert.strictEqual(confirmCalled, false);
    assert.strictEqual(cancelCalled, true);
  });

  it('showAlert deve chamar window.alert com a mensagem formatada', () => {
    let captured = '';
    (globalThis.window as unknown as { alert: (msg: string) => void }).alert = (msg: string) => {
      captured = msg;
    };

    showAlert('Sucesso', 'Operação concluída com êxito!');
    assert.ok(captured.includes('Sucesso'));
    assert.ok(captured.includes('Operação concluída'));
  });
});
