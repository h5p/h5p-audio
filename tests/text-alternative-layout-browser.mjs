import fs from 'node:fs';
import { browserEngines } from './browser-engines.mjs';
import { h5pThemeStyle, waitForH5PThemeFonts } from './h5p-theme-fixture.mjs';

const script = fs.readFileSync(new URL('../scripts/text-alternative.js', import.meta.url), 'utf8');
const controlsScript = fs.readFileSync(
  new URL('../scripts/audio-controls.js', import.meta.url),
  'utf8'
);
const style = fs.readFileSync(new URL('../styles/audio.css', import.meta.url), 'utf8');

for (const { browserType, launchOptions, name } of browserEngines) {
  const browser = await browserType.launch({ ...launchOptions, headless: true });

  try {
  const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
  await page.setContent(`
    <!doctype html>
    <html>
      <head><style>${h5pThemeStyle}${style}</style></head>
      <body class="h5p-content h5p-theme">
        <section id="minimalistic-180" class="h5p-audio-wrapper" style="display: inline-block; width: 180px;"></section>
        <section id="minimalistic-240" class="h5p-audio-wrapper" style="display: inline-block; width: 240px;"></section>
        <section id="transparent-180" class="h5p-audio-wrapper" style="height: 80px; width: 180px;"></section>
        <section id="transparent-240" class="h5p-audio-wrapper" style="height: 80px; width: 240px;"></section>
        <section id="full" style="width: 300px;"></section>
        <script>${script}</script>
        <script>${controlsScript}</script>
      </body>
    </html>
  `);
  await waitForH5PThemeFonts(page);

  const result = await page.evaluate(() => {
    const host = document.querySelector('#minimalistic-180');
    const inner = document.createElement('div');
    inner.className = 'h5p-audio-inner';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'h5p-audio-minimal-button h5p-audio-minimal-play';
    inner.append(play);
    host.append(inner);

    const control = new window.H5P.AudioTextAlternative({
      buttonLabel: 'Transcript',
      closeLabel: 'Close',
      dialogTitle: 'Transcript or text alternative'
    });
    control.attach(inner, 'minimalistic', 'Plain transcript');

    const playRect = play.getBoundingClientRect();
    const transcriptRect = control.button.getBoundingClientRect();
    const wrapperRect = inner.getBoundingClientRect();
    const minimalisticLabel = control.button
      .querySelector('.h5p-audio-text-alternative-label');

    const readModeLabel = (hostId, mode) => {
      const modeHost = document.querySelector(`#${hostId}`);
      const modeInner = document.createElement('div');
      modeInner.className = `h5p-audio-inner${mode === 'transparent' ? ' h5p-audio-transparent' : ''}`;
      modeHost.append(modeInner);
      const modeControl = new window.H5P.AudioTextAlternative({
        buttonLabel: 'Transcript',
        closeLabel: 'Close',
        dialogTitle: 'Transcript or text alternative'
      });
      modeControl.attach(modeInner, mode, 'Plain transcript');
      const label = modeControl.button.querySelector('.h5p-audio-text-alternative-label');

      return {
        clientWidth: label.clientWidth,
        display: getComputedStyle(label).display,
        text: label.textContent
      };
    };

    const minimalistic240Label = readModeLabel('minimalistic-240', 'minimalistic');
    const transparent180Label = readModeLabel('transparent-180', 'transparent');
    const transparent240Label = readModeLabel('transparent-240', 'transparent');

    const readFullControlsLayout = ({ currentTime, duration, fitToWrapper = false, width }) => {
      const fullHost = document.createElement('section');
      fullHost.className = 'h5p-audio-wrapper';
      fullHost.style.width = `${width}px`;
      document.body.append(fullHost);

      const fullAudio = document.createElement('audio');
      Object.defineProperty(fullAudio, 'duration', {
        configurable: true,
        value: duration
      });
      fullAudio.currentTime = currentTime;

      const fullControls = new window.H5P.AudioControls(fullAudio, {
        audio: 'Audio',
        play: 'Play audio',
        pause: 'Pause audio',
        mute: 'Mute audio',
        unmute: 'Unmute audio',
        volume: 'Volume',
        progress: 'Audio progress'
      });
      const fullControlsElement = fullControls.attach(fullHost);
      fullControlsElement.classList.toggle(
        'h5p-audio-full-controls--fit-to-wrapper',
        fitToWrapper
      );
      fullAudio.dispatchEvent(new Event('timeupdate'));

      const textAlternative = new window.H5P.AudioTextAlternative({
        buttonLabel: 'Transcript',
        closeLabel: 'Close',
        dialogTitle: 'Transcript or text alternative'
      });
      textAlternative.attach(fullControlsElement, 'full', 'Plain transcript');

      const controlsRect = fullControlsElement.getBoundingClientRect();
      const visibleChildren = Array.prototype.slice.call(fullControlsElement.children)
        .filter((child) =>
          child.tagName !== 'DIALOG' &&
          getComputedStyle(child).display !== 'none'
        )
        .map((child) => child.getBoundingClientRect());
      const transcriptButton = fullControlsElement.querySelector(
        '.h5p-audio-text-alternative-full'
      );
      const progress = fullControlsElement.querySelector('.h5p-audio-full-progress');

      return {
        buttonClientWidth: transcriptButton.clientWidth,
        buttonText: transcriptButton.textContent,
        clientWidth: fullControlsElement.clientWidth,
        currentTime,
        duration,
        fitToWrapper,
        maxChildRight: Math.max(...visibleChildren.map((rect) => rect.right)),
        minChildLeft: Math.min(...visibleChildren.map((rect) => rect.left)),
        progressClientWidth: progress.clientWidth,
        progressDisabled: progress.disabled,
        rectLeft: controlsRect.left,
        rectRight: controlsRect.right,
        scrollWidth: fullControlsElement.scrollWidth,
        timeText: fullControlsElement.querySelector('.h5p-audio-full-time').textContent,
        width
      };
    };

    const fullControlsLayouts = [
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 180 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 200 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 240 }),
      readFullControlsLayout({ currentTime: 37, duration: 75, width: 260 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 260 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 272 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 273 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 274 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 280 }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 290 }),
      readFullControlsLayout({
        currentTime: 3670,
        duration: 3715,
        fitToWrapper: true,
        width: 272
      }),
      readFullControlsLayout({
        currentTime: 3670,
        duration: 3715,
        fitToWrapper: true,
        width: 273
      }),
      readFullControlsLayout({
        currentTime: 3670,
        duration: 3715,
        fitToWrapper: true,
        width: 274
      }),
      readFullControlsLayout({
        currentTime: 3670,
        duration: 3715,
        fitToWrapper: true,
        width: 280
      }),
      readFullControlsLayout({
        currentTime: 3670,
        duration: 3715,
        fitToWrapper: true,
        width: 290
      }),
      readFullControlsLayout({ currentTime: 3670, duration: 3715, width: 300 })
    ];

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
    const controlsElement = controls.attach(document.querySelector('#full'));
    audio.dispatchEvent(new Event('timeupdate'));
    const fullControl = new window.H5P.AudioTextAlternative({
      buttonLabel: 'Transcript',
      closeLabel: 'Close',
      dialogTitle: 'Transcript or text alternative'
    });
    fullControl.attach(controlsElement, 'full', 'Plain transcript');
    const fullLabel = fullControl.button.querySelector('.h5p-audio-text-alternative-label');

    return {
      computedGap: getComputedStyle(inner).gap,
      fullControlsLayouts,
      fullLabelClientWidth: fullLabel.clientWidth,
      fullLabelScrollWidth: fullLabel.scrollWidth,
      fullLabelText: fullLabel.textContent,
      heightDelta: Math.abs(playRect.height - transcriptRect.height),
      horizontalGap: Math.round(transcriptRect.left - playRect.right),
      minimalisticLabelClientWidth: minimalisticLabel.clientWidth,
      minimalisticLabelDisplay: getComputedStyle(minimalisticLabel).display,
      minimalisticLabelText: minimalisticLabel.textContent,
      minimalistic240LabelClientWidth: minimalistic240Label.clientWidth,
      minimalistic240LabelDisplay: minimalistic240Label.display,
      minimalistic240LabelText: minimalistic240Label.text,
      playHeight: playRect.height,
      transcriptHeight: transcriptRect.height,
      transparentLabelClientWidth: transparent180Label.clientWidth,
      transparentLabelDisplay: transparent180Label.display,
      transparentLabelText: transparent180Label.text,
      transparent240LabelClientWidth: transparent240Label.clientWidth,
      transparent240LabelDisplay: transparent240Label.display,
      transparent240LabelText: transparent240Label.text,
      wrapperHeight: wrapperRect.height
    };
  });

  console.log(JSON.stringify({ browser: name, ...result }, null, 2));

  const overflowingFullControls = result.fullControlsLayouts.filter((layout) =>
    layout.scrollWidth > layout.clientWidth + 1 ||
    layout.maxChildRight > layout.rectRight + 1 ||
    layout.minChildLeft < layout.rectLeft - 1
  );
  const longFullControls = result.fullControlsLayouts.filter((layout) =>
    layout.duration === 3715
  );
  const shortFullControls = result.fullControlsLayouts.filter((layout) =>
    layout.duration === 75
  );

  if (
    result.computedGap !== '0px' ||
    result.fullLabelText !== 'Transcript' ||
    result.fullLabelClientWidth < result.fullLabelScrollWidth ||
    overflowingFullControls.length !== 0 ||
    result.fullControlsLayouts.some((layout) =>
      layout.buttonText !== 'Transcript' ||
      layout.buttonClientWidth === 0 ||
      layout.progressDisabled ||
      layout.progressClientWidth < 16
    ) ||
    !longFullControls.every((layout) =>
      layout.timeText === '1:01:10 / 1:01:55'
    ) ||
    !shortFullControls.every((layout) => layout.timeText === '0:37 / 1:15') ||
    result.minimalisticLabelText !== 'Transcript' ||
    result.minimalisticLabelClientWidth === 0 ||
    result.minimalistic240LabelText !== 'Transcript' ||
    result.minimalistic240LabelClientWidth === 0 ||
    result.transparentLabelText !== 'Transcript' ||
    result.transparentLabelClientWidth === 0 ||
    result.transparent240LabelText !== 'Transcript' ||
    result.transparent240LabelClientWidth === 0 ||
    Math.abs(result.horizontalGap) > 1 ||
    result.heightDelta > 1
  ) {
    throw new Error(
      `Text alternative layout check failed in ${name}: ${JSON.stringify(result, null, 2)}`
    );
  }
  }
  finally {
    await browser.close();
  }
}
