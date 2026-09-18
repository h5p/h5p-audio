import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const createEnvironment = () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    pretendToBeVisual: true,
    url: 'http://localhost/'
  });

  const context = vm.createContext({
    console,
    document: dom.window.document,
    Event: dom.window.Event,
    window: dom.window
  });
  context.window.H5P = {};
  vm.runInContext(
    fs.readFileSync(new URL('../scripts/text-alternative.js', import.meta.url), 'utf8'),
    context
  );

  return { context, window: dom.window };
};

const createTextAlternative = (window, params = {}) =>
  new window.H5P.AudioTextAlternative({
    buttonLabel: 'Transcript',
    closeLabel: 'Close',
    dialogTitle: 'Transcript or text alternative',
    ...params
  });

test('fallback dialog blocks outside activation and restores state on close', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const fullscreenHost = window.document.createElement('section');
  const container = window.document.createElement('div');
  const outside = window.document.createElement('button');
  let outsideActivations = 0;

  fullscreenHost.append(container);
  window.document.body.append(fullscreenHost, outside);
  Object.defineProperty(window.document, 'fullscreenElement', {
    configurable: true,
    value: fullscreenHost
  });
  outside.addEventListener('click', () => {
    outsideActivations++;
  });

  control.attach(container, 'full', 'Plain text');
  control.dialog.showModal = undefined;
  control.dialog.close = undefined;
  control.dialog.setAttribute('dir', 'rtl');
  control.open();

  assert.equal(control.dialog.hasAttribute('open'), true);
  assert.equal(control.dialog.getAttribute('aria-modal'), 'true');
  assert.equal(control.dialog.parentNode, fullscreenHost);
  assert.equal(
    window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop').parentNode,
    fullscreenHost
  );

  outside.click();

  assert.equal(outsideActivations, 0);
  assert.equal(control.dialog.hasAttribute('open'), false);
  assert.equal(control.dialog.parentNode, container);
  assert.equal(control.dialog.getAttribute('dir'), 'rtl');
  assert.equal(control.button.getAttribute('aria-expanded'), 'false');
  assert.equal(window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop'), null);
});

test('fallback detach removes modal scaffolding before native close event', async () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  control.attach(container, 'full', 'Plain text');
  control.dialog.showModal = undefined;
  control.dialog.close = function () {
    this.removeAttribute('open');
    window.setTimeout(() => {
      this.dispatchEvent(new window.Event('close'));
    }, 0);
  };
  control.open();

  const dialog = control.dialog;
  assert.equal(
    window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') !== null,
    true
  );
  assert.equal(dialog.classList.contains('h5p-audio-text-alternative-dialog--fallback'), true);

  control.detach();

  assert.equal(
    window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop'),
    null
  );
  assert.equal(dialog.classList.contains('h5p-audio-text-alternative-dialog--fallback'), false);
  assert.equal(dialog.hasAttribute('aria-modal'), false);
  assert.equal(dialog.isConnected, false);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });

  assert.equal(
    window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop'),
    null
  );
});

test('fallback dialog closes on Escape and keeps focus inside', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');
  const outside = window.document.createElement('button');

  window.document.body.append(container, outside);
  control.attach(container, 'full', 'Plain text');
  control.dialog.showModal = undefined;
  control.dialog.close = undefined;
  control.open();

  outside.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
  assert.equal(
    window.document.activeElement,
    control.dialog.querySelector('.h5p-audio-text-alternative-title')
  );

  const escape = new window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Escape'
  });
  window.document.dispatchEvent(escape);

  assert.equal(escape.defaultPrevented, true);
  assert.equal(control.dialog.hasAttribute('open'), false);
});

test('fallback dialog keeps Tab navigation inside the dialog', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  control.attach(container, 'full', 'Plain text');
  control.dialog.showModal = undefined;
  control.dialog.close = undefined;
  control.open();

  const headerCloseButton = control.dialog.querySelector('.h5p-audio-text-alternative-close-icon');
  const footerCloseButton = control.dialog.querySelector('.h5p-audio-text-alternative-close-footer');
  footerCloseButton.focus();

  const tab = new window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Tab'
  });
  window.document.dispatchEvent(tab);

  assert.equal(tab.defaultPrevented, true);
  assert.equal(window.document.activeElement, headerCloseButton);

  const shiftTab = new window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Tab',
    shiftKey: true
  });
  window.document.dispatchEvent(shiftTab);

  assert.equal(shiftTab.defaultPrevented, true);
  assert.equal(window.document.activeElement, footerCloseButton);
  assert.equal(control.dialog.hasAttribute('open'), true);
});

test('dialog matches the design structure with header close and footer action', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  control.attach(container, 'full', 'Plain text');

  const headerCloseButton = control.dialog.querySelector('.h5p-audio-text-alternative-close-icon');
  const footerCloseButton = control.dialog.querySelector('.h5p-audio-text-alternative-close-footer');

  assert.equal(control.dialog.querySelector('.h5p-audio-text-alternative-header').contains(
    control.dialog.querySelector('.h5p-audio-text-alternative-title')
  ), true);
  assert.equal(headerCloseButton.textContent, '×');
  assert.equal(headerCloseButton.getAttribute('aria-label'), 'Close');
  assert.equal(control.dialog.querySelector('.h5p-audio-text-alternative-footer').contains(
    footerCloseButton
  ), true);
  assert.equal(footerCloseButton.textContent, 'Close');
});

test('transparent button uses only the document icon and label', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  control.attach(container, 'transparent', 'Plain text');

  assert.equal(control.button.classList.contains('h5p-audio-text-alternative-transparent'), true);
  assert.equal(
    control.button.querySelector('.h5p-audio-text-alternative-icon-document') !== null,
    true
  );
  assert.equal(
    control.button.querySelector('.h5p-audio-text-alternative-icon-audio'),
    null
  );
  assert.equal(
    control.button.querySelector('.h5p-audio-text-alternative-label').textContent,
    'Transcript'
  );
});

test('stale native close events do not mutate a newer dialog', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const firstContainer = window.document.createElement('div');
  const secondContainer = window.document.createElement('div');

  window.document.body.append(firstContainer, secondContainer);
  control.attach(firstContainer, 'full', 'First text');
  const oldDialog = control.dialog;

  oldDialog.showModal = function () {
    this.setAttribute('open', '');
  };
  oldDialog.close = function () {};
  control.open();

  control.attach(secondContainer, 'full', 'Second text');
  control.dialog.showModal = function () {
    this.setAttribute('open', '');
  };
  control.open();

  oldDialog.dispatchEvent(new window.Event('close'));

  assert.equal(control.dialog.hasAttribute('open'), true);
  assert.equal(control.button.getAttribute('aria-expanded'), 'true');
});

test('stale native close events do not collapse a reopened dialog', async () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  control.attach(container, 'full', 'Plain text');
  control.dialog.showModal = function () {
    this.setAttribute('open', '');
  };
  control.dialog.close = function () {
    this.removeAttribute('open');
    window.setTimeout(() => {
      this.dispatchEvent(new window.Event('close'));
    }, 0);
  };

  control.open();
  control.close();
  control.open();

  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });

  assert.equal(control.dialog.hasAttribute('open'), true);
  assert.equal(control.button.getAttribute('aria-expanded'), 'true');
});

test('fallback stale close events do not leave duplicate modal scaffolding', async () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  control.attach(container, 'full', 'Plain text');
  control.dialog.showModal = undefined;
  control.dialog.close = function () {
    this.removeAttribute('open');
    window.setTimeout(() => {
      this.dispatchEvent(new window.Event('close'));
    }, 0);
  };

  control.open();
  const firstBackdrop = window.document.querySelector(
    '.h5p-audio-text-alternative-fallback-backdrop'
  );

  control.close();
  control.open();

  assert.equal(
    window.document.querySelectorAll('.h5p-audio-text-alternative-fallback-backdrop').length,
    1
  );
  assert.notEqual(
    window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop'),
    firstBackdrop
  );
  assert.equal(control.dialog.parentNode, window.document.body);
  assert.equal(control.dialog.hasAttribute('open'), true);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });

  assert.equal(
    window.document.querySelectorAll('.h5p-audio-text-alternative-fallback-backdrop').length,
    1
  );
  assert.equal(control.dialog.parentNode, window.document.body);
  assert.equal(control.dialog.hasAttribute('open'), true);

  control.close();

  assert.equal(
    window.document.querySelector('.h5p-audio-text-alternative-fallback-backdrop'),
    null
  );
  assert.equal(control.dialog.parentNode, container);
  assert.equal(control.dialog.hasAttribute('open'), false);
  assert.equal(control.button.getAttribute('aria-expanded'), 'false');
});

test('text alternative content is rendered as text, not HTML', () => {
  const { window } = createEnvironment();
  const control = createTextAlternative(window);
  const container = window.document.createElement('div');
  const text = '<img src=x onerror=alert(1)>Transcript';

  window.document.body.append(container);
  control.attach(container, 'full', text);

  const content = control.dialog.querySelector('.h5p-audio-text-alternative-content');
  assert.equal(content.textContent, text);
  assert.equal(content.children.length, 0);
});
