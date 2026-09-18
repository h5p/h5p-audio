import fs from 'node:fs';
import { browserEngines } from './browser-engines.mjs';
import { h5pThemeStyle, waitForH5PThemeFonts } from './h5p-theme-fixture.mjs';

const controlsScript = fs.readFileSync(
  new URL('../scripts/audio-controls.js', import.meta.url),
  'utf8'
);
const style = fs.readFileSync(new URL('../styles/audio.css', import.meta.url), 'utf8');

for (const { browserType, launchOptions, name } of browserEngines) {
  const browser = await browserType.launch({ ...launchOptions, headless: true });

  try {
  const runCheck = async (viewportWidth, hostWidth, fitToWrapper = false) => {
    const page = await browser.newPage({ viewport: { width: viewportWidth, height: 500 } });
    await page.setContent(`
      <!doctype html>
      <html>
        <head><style>${h5pThemeStyle}${style}</style></head>
        <body class="h5p-content h5p-theme">
          <section id="host" style="width: ${hostWidth}px;"></section>
          <script>${controlsScript}</script>
        </body>
      </html>
    `);
    await waitForH5PThemeFonts(page);

    const result = await page.evaluate((shouldFitToWrapper) => {
      const audio = document.createElement('audio');
      Object.defineProperty(audio, 'duration', {
        configurable: true,
        value: 75
      });
      audio.currentTime = 9;

      const controls = new window.H5P.AudioControls(audio, {
        audio: 'Audio',
        play: 'Play audio',
        pause: 'Pause audio',
        mute: 'Mute audio',
        unmute: 'Unmute audio',
        volume: 'Volume',
        progress: 'Audio progress'
      });

      const controlsElement = controls.attach(document.querySelector('#host'));
      if (shouldFitToWrapper) {
        controlsElement.classList.add('h5p-audio-full-controls--fit-to-wrapper');
      }
      audio.dispatchEvent(new Event('timeupdate'));

      const time = controlsElement.querySelector('.h5p-audio-full-time');

      return {
        timeText: time.textContent,
        timeDisplay: getComputedStyle(time).display,
        progressValueText: controlsElement
          .querySelector('.h5p-audio-full-progress')
          .getAttribute('aria-valuetext')
      };
    }, fitToWrapper);

    await page.close();

    return {
      fitToWrapper,
      hostWidth,
      viewportWidth,
      ...result
    };
  };

  const results = [
    await runCheck(900, 900),
    await runCheck(360, 300),
    await runCheck(360, 300, true)
  ];

  console.log(JSON.stringify({ browser: name, results }, null, 2));

  const failures = results.filter((result) =>
    result.timeText !== '0:09 / 1:15' ||
    result.progressValueText !== '0:09 / 1:15' ||
    result.timeDisplay === 'none'
  );

  if (failures.length) {
    throw new Error(
      `Full controls browser check failed in ${name}: ${JSON.stringify(failures, null, 2)}`
    );
  }
  }
  finally {
    await browser.close();
  }
}
