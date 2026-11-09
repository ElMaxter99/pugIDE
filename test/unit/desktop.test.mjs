import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isDesktopApp, desktopVersion, shareBaseUrl } from './.build/units.mjs';

afterEach(() => { delete globalThis.pugideDesktop; });

test('en la web no hay app de escritorio y los enlaces usan su propio origen', () => {
  assert.equal(isDesktopApp(), false);
  assert.equal(desktopVersion(), null);
  assert.equal(shareBaseUrl('https://pugide.example'), 'https://pugide.example');
});

test('en escritorio se detecta por lo que expone el preload', () => {
  globalThis.pugideDesktop = { platform: 'linux', version: '0.9.1', webUrl: '' };
  assert.equal(isDesktopApp(), true);
  assert.equal(desktopVersion(), '0.9.1');
});

test('los enlaces de compartir en escritorio usan la dirección de la web si está configurada', () => {
  globalThis.pugideDesktop = { platform: 'win32', version: '1.0.0', webUrl: 'https://pugide.example/' };
  assert.equal(shareBaseUrl('pugide://app'), 'https://pugide.example');
});

test('sin dirección web, o con una que no es https, se queda con el origen interno', () => {
  globalThis.pugideDesktop = { platform: 'darwin', version: '1.0.0', webUrl: '' };
  assert.equal(shareBaseUrl('pugide://app'), 'pugide://app');
  globalThis.pugideDesktop = { platform: 'darwin', version: '1.0.0', webUrl: 'http://inseguro.example' };
  assert.equal(shareBaseUrl('pugide://app'), 'pugide://app');
});

test('un valor raro en window.pugideDesktop no se toma por la app de escritorio', () => {
  globalThis.pugideDesktop = 'si';
  assert.equal(isDesktopApp(), false);
});
