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
    window: dom.window
  });
  context.window.H5P = {};
  vm.runInContext(
    fs.readFileSync(new URL('../scripts/audio-controls.js', import.meta.url), 'utf8'),
    context
  );

  return { window: dom.window };
};

const createControls = (window) => {
  const audio = window.document.createElement('audio');
  Object.defineProperty(audio, 'duration', {
    configurable: true,
    value: 75
  });

  const controls = new window.H5P.AudioControls(audio, {
    audio: 'Audio',
    play: 'Play audio',
    pause: 'Pause audio',
    mute: 'Mute audio',
    unmute: 'Unmute audio',
    volume: 'Volume',
    progress: 'Audio progress'
  });

  return { audio, controls };
};

test('full controls render and keep elapsed time available without fit-to-wrapper', () => {
  const { window } = createEnvironment();
  const { audio, controls } = createControls(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  const controlsElement = controls.attach(container);

  audio.currentTime = 9;
  audio.dispatchEvent(new window.Event('timeupdate'));

  assert.equal(controlsElement.classList.contains('h5p-audio-full-controls'), true);
  assert.equal(
    controlsElement.classList.contains('h5p-audio-full-controls--fit-to-wrapper'),
    false
  );
  assert.equal(
    controlsElement.querySelector('.h5p-audio-full-time').textContent,
    '0:09 / 1:15'
  );
  assert.equal(
    controlsElement.querySelector('.h5p-audio-full-progress').getAttribute('aria-valuetext'),
    '0:09 / 1:15'
  );
});

test('full controls update seek and mute state', () => {
  const { window } = createEnvironment();
  const { audio, controls } = createControls(window);
  const container = window.document.createElement('div');

  window.document.body.append(container);
  const controlsElement = controls.attach(container);
  const progress = controlsElement.querySelector('.h5p-audio-full-progress');
  const muteButton = controlsElement.querySelector('.h5p-audio-full-mute');

  progress.value = '12';
  progress.dispatchEvent(new window.Event('input'));

  assert.equal(audio.currentTime, 12);

  muteButton.click();
  audio.dispatchEvent(new window.Event('volumechange'));

  assert.equal(audio.muted, true);
  assert.equal(muteButton.getAttribute('aria-label'), 'Unmute audio');
});
