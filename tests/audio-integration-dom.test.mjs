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

  const createQuery = (input, attrs = {}) => {
    const elements = [];

    if (typeof input === 'string' && /^<.+\/>$/.test(input)) {
      const tagName = input.replace(/[</>]/g, '');
      const element = dom.window.document.createElement(tagName);
      Object.entries(attrs).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
      elements.push(element);
    }
    else if (input instanceof dom.window.HTMLElement) {
      elements.push(input);
    }
    else if (input && input[0] instanceof dom.window.HTMLElement) {
      elements.push(input[0]);
    }

    const query = {
      0: elements[0],
      addClass: function (classNames) {
        elements.forEach((element) => {
          element.classList.add(...classNames.split(/\s+/).filter(Boolean));
        });
        return this;
      },
      appendTo: function (target) {
        const parent = target[0] || target;
        elements.forEach((element) => {
          parent.append(element);
        });
        return this;
      },
      attr: function (name, value) {
        if (typeof name === 'object') {
          elements.forEach((element) => {
            Object.entries(name).forEach(([key, attributeValue]) => {
              element.setAttribute(key, attributeValue);
            });
          });
          return this;
        }

        if (typeof value === 'undefined') {
          return elements[0].getAttribute(name);
        }

        elements.forEach((element) => {
          element.setAttribute(name, value);
        });
        return this;
      },
      click: function (listener) {
        elements.forEach((element) => {
          element.addEventListener('click', listener);
        });
        return this;
      },
      css: function (styles) {
        elements.forEach((element) => {
          Object.assign(element.style, styles);
        });
        return this;
      },
      get: (index) => elements[index],
      hasClass: (className) => elements[0].classList.contains(className),
      height: () => elements[0].getBoundingClientRect().height,
      html: function (html) {
        elements.forEach((element) => {
          element.innerHTML = html;
        });
        return this;
      },
      on: function (type, listener) {
        elements.forEach((element) => {
          element.addEventListener(type, listener);
        });
        return this;
      },
      removeClass: function (className) {
        elements.forEach((element) => {
          element.classList.remove(className);
        });
        return this;
      },
      width: () => elements[0].getBoundingClientRect().width
    };

    return query;
  };
  createQuery.extend = (...args) => Object.assign(...args);

  const H5P = {
    EventDispatcher: function () {},
    getPath: (path) => path,
    jQuery: createQuery
  };
  H5P.EventDispatcher.prototype.on = function () {};
  H5P.EventDispatcher.prototype.trigger = function () {};

  const context = vm.createContext({
    console,
    document: dom.window.document,
    Event: dom.window.Event,
    H5P,
    IntersectionObserver: function () {
      return {
        observe: function () {}
      };
    },
    window: dom.window
  });
  context.window.H5P = H5P;
  context.window.H5PEditor = {};

  for (const script of [
    '../scripts/text-alternative.js',
    '../scripts/audio-controls.js',
    '../scripts/audio.js'
  ]) {
    vm.runInContext(
      fs.readFileSync(new URL(script, import.meta.url), 'utf8'),
      context
    );
  }

  return { context, H5P, window: dom.window };
};

const createAudioElementStub = (window, {
  canPlayType,
  duration = 75,
  currentTime = 9
}) => {
  const originalCreateElement = window.document.createElement.bind(window.document);

  window.document.createElement = (tagName) => {
    const element = originalCreateElement(tagName);

    if (tagName.toLowerCase() === 'audio') {
      if (typeof canPlayType !== 'undefined') {
        Object.defineProperty(element, 'canPlayType', {
          configurable: true,
          value: canPlayType
        });
      }
      Object.defineProperty(element, 'duration', {
        configurable: true,
        value: duration
      });
      element.currentTime = currentTime;
    }

    return element;
  };
};

const createValidFileParams = (context, overrides = '') =>
  vm.runInContext(`({
    files: [{
      mime: 'audio/mpeg',
      path: 'audio.mp3'
    }],
    ${overrides}
  })`, context);

test('public attach integrates custom full controls and transcript action', () => {
  const { context, H5P, window } = createEnvironment();
  createAudioElementStub(window, {
    canPlayType: () => 'probably'
  });

  const params = createValidFileParams(context, `
    playerMode: 'full',
    textAlternative: 'Plain transcript'
  `);
  const audio = new H5P.Audio(params, 1, {});
  const container = window.document.createElement('div');

  window.document.body.append(container);
  audio.attach(H5P.jQuery(container));
  audio.audio.dispatchEvent(new window.Event('timeupdate'));

  assert.equal(container.classList.contains('h5p-audio-wrapper'), true);
  assert.equal(container.querySelector('.h5p-audio-full-controls') !== null, true);
  assert.equal(
    container.querySelector('.h5p-audio-full-time').textContent,
    '0:09 / 1:15'
  );
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-full').textContent.trim(),
    'Transcript'
  );
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-dialog') !== null,
    true
  );
});

test('public attach keeps native full controls when no transcript is provided', () => {
  const { context, H5P, window } = createEnvironment();
  createAudioElementStub(window, {
    canPlayType: () => 'probably'
  });

  const audio = new H5P.Audio(createValidFileParams(context, `
    playerMode: 'full',
    textAlternative: '   '
  `), 1, {});
  const container = window.document.createElement('div');

  window.document.body.append(container);
  audio.attach(H5P.jQuery(container));

  assert.equal(audio.hasTextAlternative(), false);
  assert.equal(container.querySelector('.h5p-audio-full-controls'), null);
  assert.equal(container.querySelector('.h5p-audio-text-alternative-button'), null);
  assert.equal(container.querySelector('audio').controls, true);
});

test('public attach keeps native full controls disabled when controls are disabled', () => {
  const { context, H5P, window } = createEnvironment();
  createAudioElementStub(window, {
    canPlayType: () => 'probably'
  });

  const audio = new H5P.Audio(createValidFileParams(context, `
    controls: false,
    playerMode: 'full',
    textAlternative: 'Plain transcript'
  `), 1, {});
  const container = window.document.createElement('div');

  window.document.body.append(container);
  audio.attach(H5P.jQuery(container));

  assert.equal(container.querySelector('.h5p-audio-full-controls'), null);
  assert.equal(container.querySelector('audio').controls, false);
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-full').textContent.trim(),
    'Transcript'
  );
});

test('public attach adds transcript action for unsupported audio', () => {
  const { context, H5P, window } = createEnvironment();
  createAudioElementStub(window, {
    canPlayType: undefined
  });

  const audio = new H5P.Audio(createValidFileParams(context, `
    playerMode: 'full',
    textAlternative: 'Plain transcript'
  `), 1, {});
  const container = window.document.createElement('div');

  window.document.body.append(container);
  audio.attach(H5P.jQuery(container));

  assert.equal(container.classList.contains('h5p-audio-not-supported'), true);
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-unsupported').textContent.trim(),
    'Transcript'
  );
  assert.equal(container.querySelector('.h5p-audio-text-alternative-dialog') !== null, true);
});

test('public attach adds visible transcript action for minimalistic mode', () => {
  const { context, H5P, window } = createEnvironment();
  createAudioElementStub(window, {
    canPlayType: () => 'probably'
  });

  const audio = new H5P.Audio(createValidFileParams(context, `
    playerMode: 'minimalistic',
    textAlternative: 'Plain transcript'
  `), 1, {});
  const container = window.document.createElement('div');

  window.document.body.append(container);
  audio.attach(H5P.jQuery(container));

  assert.equal(container.querySelector('.h5p-audio-minimal-button') !== null, true);
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-minimalistic').textContent.trim(),
    'Transcript'
  );
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-label').textContent,
    'Transcript'
  );
});

test('public attach adds visible transcript action for transparent mode', () => {
  const { context, H5P, window } = createEnvironment();
  createAudioElementStub(window, {
    canPlayType: () => 'probably'
  });

  const audio = new H5P.Audio(createValidFileParams(context, `
    playerMode: 'transparent',
    textAlternative: 'Plain transcript'
  `), 1, {});
  audio.isRoot = () => false;
  const container = window.document.createElement('div');

  window.document.body.append(container);
  audio.attach(H5P.jQuery(container));

  assert.equal(container.querySelector('.h5p-audio-transparent') !== null, true);
  assert.equal(container.querySelector('.h5p-audio-fit-wrapper') !== null, true);
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-transparent').textContent.trim(),
    'Transcript'
  );
  assert.equal(
    container.querySelector('.h5p-audio-text-alternative-label').textContent,
    'Transcript'
  );
});
