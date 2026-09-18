import fs from 'node:fs';
import { browserEngines } from './browser-engines.mjs';
import { h5pThemeStyle, waitForH5PThemeFonts } from './h5p-theme-fixture.mjs';

const script = fs.readFileSync(new URL('../scripts/text-alternative.js', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../styles/audio.css', import.meta.url), 'utf8');

for (const { browserType, launchOptions, name } of browserEngines) {
  const browser = await browserType.launch({ ...launchOptions, headless: true });

  try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.setContent(`
    <!doctype html>
    <html>
      <head><style>${h5pThemeStyle}${style}</style></head>
      <body class="h5p-content h5p-theme">
        <button id="outside">outside</button>
        <button id="enter-fullscreen">enter fullscreen</button>
        <section id="standalone"></section>
        <section id="course-presentation-like" style="transform: translateZ(0); width: 180px; height: 80px; overflow: visible;"></section>
        <section id="dictation-like" style="display: grid; grid-template-columns: auto 1fr; width: 240px; height: 80px; overflow: visible;"></section>
        <section id="low-rtl-like" dir="rtl" style="transform: translateZ(0); width: 240px; height: 80px; margin-top: 700px; overflow: visible;"></section>
        <section id="fullscreen-like" style="background: #fff; transform: translateZ(0); width: 100vw; height: 100vh; overflow: visible;"></section>
        <script>${script}</script>
        <script>
          document.querySelector('#enter-fullscreen').addEventListener('click', () => {
            document.querySelector('#fullscreen-like').requestFullscreen();
          });
        </script>
      </body>
    </html>
  `);
  await waitForH5PThemeFonts(page);

  const nativeDialogResult = await page.evaluate(async () => {
    const runNativeCheck = async (id) => {
      const container = document.querySelector(`#${id}`);
      const control = new window.H5P.AudioTextAlternative({
        buttonLabel: 'Transcript',
        closeLabel: 'Close',
        dialogTitle: 'Transcript or text alternative'
      });

      control.attach(container, 'full', `${id} native transcript`);
      const supportsNativeDialog = typeof control.dialog.showModal === 'function';
      control.open();

      const dialog = control.dialog.getBoundingClientRect();
      const opened = control.dialog.open === true;
      const ariaExpandedWhileOpen = control.button.getAttribute('aria-expanded') === 'true';
      const remainedInContainer = control.dialog.parentNode === container;
      const noFallbackBackdrop =
        document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') === null;
      const focusedInsideDialog = control.dialog.contains(document.activeElement);
      const nativeModal = control.dialog.matches(':modal');
      const closeEvent = new Promise((resolve) => {
        control.dialog.addEventListener('close', resolve, { once: true });
      });
      control.dialog.querySelector('.h5p-audio-text-alternative-close-footer').click();
      await closeEvent;

      return {
        ariaExpandedAfterClose: control.button.getAttribute('aria-expanded'),
        ariaExpandedWhileOpen,
        dialogWithinViewport:
          dialog.top >= 0 &&
          dialog.left >= 0 &&
          dialog.bottom <= window.innerHeight &&
          dialog.right <= window.innerWidth,
        focusedInsideDialog,
        id,
        nativeModal,
        noFallbackBackdrop,
        opened,
        remainedInContainer,
        supportsNativeDialog
      };
    };

    const checks = [];
    for (const id of ['standalone', 'course-presentation-like', 'dictation-like', 'low-rtl-like']) {
      checks.push(await runNativeCheck(id));
    }

    return checks;
  });

  const result = await page.evaluate(async () => {
    const checks = [];
    let outsideActivations = 0;
    document.querySelector('#outside').addEventListener('click', () => {
      outsideActivations++;
    });

    const runCheck = (id) => {
      const container = document.querySelector(`#${id}`);
      const control = new window.H5P.AudioTextAlternative({
        buttonLabel: 'Transcript',
        closeLabel: 'Close',
        dialogTitle: 'Transcript or text alternative'
      });

      control.attach(container, 'full', `${id} transcript\n`.repeat(id === 'low-rtl-like' ? 80 : 1));
      control.dialog.showModal = undefined;
      control.dialog.close = undefined;
      control.open();

      const dialog = control.dialog.getBoundingClientRect();
      const backdropElement = document
        .querySelector('.h5p-audio-text-alternative-fallback-backdrop');
      const backdrop = backdropElement.getBoundingClientRect();
      const closeButton = control.dialog.querySelector('.h5p-audio-text-alternative-close-icon');
      const footerCloseButton = control.dialog
        .querySelector('.h5p-audio-text-alternative-close-footer');
      const elementAtDialogCenter = document.elementFromPoint(
        dialog.left + dialog.width / 2,
        dialog.top + dialog.height / 2
      );
      const dialogAboveBackdrop =
        Number(getComputedStyle(control.dialog).zIndex) >
        Number(getComputedStyle(backdropElement).zIndex);
      const fallbackHostIsExpected =
        control.dialog.parentNode === (document.fullscreenElement || document.body);
      const closeButtonRect = closeButton.getBoundingClientRect();
      const elementAtCloseButton = document.elementFromPoint(
        closeButtonRect.left + closeButtonRect.width / 2,
        closeButtonRect.top + closeButtonRect.height / 2
      );
      footerCloseButton.focus();
      const tabEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab'
      });
      document.dispatchEvent(tabEvent);
      const forwardTabStayedInDialog =
        control.dialog.contains(document.activeElement) &&
        document.activeElement === closeButton;
      closeButton.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: true
      });
      document.dispatchEvent(shiftTabEvent);
      const backwardTabStayedInDialog =
        control.dialog.contains(document.activeElement) &&
        document.activeElement === footerCloseButton;

      document.querySelector('#outside').click();

      return {
        id,
        backdropCoversViewport:
          Math.round(backdrop.left) <= 0 &&
          Math.round(backdrop.top) <= 0 &&
          Math.round(backdrop.right) >= window.innerWidth &&
          Math.round(backdrop.bottom) >= window.innerHeight,
        blockedOutsideActivation: outsideActivations === 0,
        closedAfterOutsideClick: !control.dialog.hasAttribute('open'),
        dialogAboveBackdrop,
        fallbackHostIsExpected,
        closeButtonHitTest:
          elementAtCloseButton === closeButton ||
          closeButton.contains(elementAtCloseButton),
        dialogHitTest:
          control.dialog === elementAtDialogCenter ||
          control.dialog.contains(elementAtDialogCenter),
        forwardTabPrevented: tabEvent.defaultPrevented,
        forwardTabStayedInDialog,
        backwardTabPrevented: shiftTabEvent.defaultPrevented,
        backwardTabStayedInDialog,
        dialogWithinViewport:
          dialog.top >= 0 &&
          dialog.left >= 0 &&
          dialog.bottom <= window.innerHeight &&
          dialog.right <= window.innerWidth,
        directionPreserved:
          id !== 'low-rtl-like' || getComputedStyle(control.dialog).direction === 'rtl',
        dialogHasArea: dialog.width > 0 && dialog.height > 0,
        noBackdropAfterClose:
          document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') === null
      };
    };

    const runFallbackReopenCheck = async () => {
      const container = document.createElement('section');
      document.body.append(container);
      const control = new window.H5P.AudioTextAlternative({
        buttonLabel: 'Transcript',
        closeLabel: 'Close',
        dialogTitle: 'Transcript or text alternative'
      });

      control.attach(container, 'full', 'fallback reopen transcript');
      control.dialog.showModal = undefined;
      control.dialog.close = function () {
        this.removeAttribute('open');
        window.setTimeout(() => {
          this.dispatchEvent(new Event('close'));
        }, 0);
      };

      control.open();
      const firstBackdrop = document
        .querySelector('.h5p-audio-text-alternative-fallback-backdrop');
      control.close();
      control.open();

      const reopenedCleanly =
        document.querySelectorAll('.h5p-audio-text-alternative-fallback-backdrop').length === 1 &&
        document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') !== firstBackdrop &&
        control.dialog.parentNode === document.body &&
        control.dialog.hasAttribute('open');

      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });

      const staleCloseIgnored =
        document.querySelectorAll('.h5p-audio-text-alternative-fallback-backdrop').length === 1 &&
        control.dialog.parentNode === document.body &&
        control.dialog.hasAttribute('open');

      control.close();

      const finalCleanup =
        document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') === null &&
        control.dialog.parentNode === container &&
        !control.dialog.hasAttribute('open') &&
        control.button.getAttribute('aria-expanded') === 'false';

      return {
        finalCleanup,
        id: 'fallback-reopen',
        reopenedCleanly,
        staleCloseIgnored
      };
    };

    for (const id of ['standalone', 'course-presentation-like', 'dictation-like', 'low-rtl-like']) {
      checks.push(runCheck(id));
    }

    return {
      checks,
      fallbackReopen: await runFallbackReopenCheck()
    };
  });

  await page.click('#enter-fullscreen');
  const nativeFullscreenResult = await page.evaluate(async () => {
    const container = document.querySelector('#fullscreen-like');
    const control = new window.H5P.AudioTextAlternative({
      buttonLabel: 'Transcript',
      closeLabel: 'Close',
      dialogTitle: 'Transcript or text alternative'
    });

    control.attach(container, 'full', 'fullscreen native transcript');
    control.open();

    const dialog = control.dialog.getBoundingClientRect();
    const closeEvent = new Promise((resolve) => {
      control.dialog.addEventListener('close', resolve, { once: true });
    });
    const check = {
      ariaExpandedWhileOpen: control.button.getAttribute('aria-expanded') === 'true',
      dialogWithinViewport:
        dialog.top >= 0 &&
        dialog.left >= 0 &&
        dialog.bottom <= window.innerHeight &&
        dialog.right <= window.innerWidth,
      focusedInsideDialog: control.dialog.contains(document.activeElement),
      id: 'fullscreen-like',
      nativeModal: control.dialog.matches(':modal'),
      noFallbackBackdrop:
        document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') === null,
      opened: control.dialog.open === true,
      remainedInContainer: control.dialog.parentNode === container,
      supportsNativeDialog: typeof control.dialog.showModal === 'function'
    };
    control.close();
    await closeEvent;
    check.ariaExpandedAfterClose = control.button.getAttribute('aria-expanded');

    return check;
  });
  nativeDialogResult.push(nativeFullscreenResult);

  result.checks.push(await page.evaluate(() => {
    let outsideActivations = 0;
    document.querySelector('#outside').addEventListener('click', () => {
      outsideActivations++;
    });

    const container = document.querySelector('#fullscreen-like');
    const control = new window.H5P.AudioTextAlternative({
      buttonLabel: 'Transcript',
      closeLabel: 'Close',
      dialogTitle: 'Transcript or text alternative'
    });

    control.attach(container, 'full', 'fullscreen transcript');
    control.dialog.showModal = undefined;
    control.dialog.close = undefined;
    control.open();

    const dialog = control.dialog.getBoundingClientRect();
    const backdropElement = document
      .querySelector('.h5p-audio-text-alternative-fallback-backdrop');
    const backdrop = backdropElement.getBoundingClientRect();
    const closeButton = control.dialog.querySelector('.h5p-audio-text-alternative-close-icon');
    const footerCloseButton = control.dialog
      .querySelector('.h5p-audio-text-alternative-close-footer');
    const elementAtDialogCenter = document.elementFromPoint(
      dialog.left + dialog.width / 2,
      dialog.top + dialog.height / 2
    );
    const dialogAboveBackdrop =
      Number(getComputedStyle(control.dialog).zIndex) >
      Number(getComputedStyle(backdropElement).zIndex);
    const fallbackHostIsExpected = control.dialog.parentNode === document.fullscreenElement;
    const closeButtonRect = closeButton.getBoundingClientRect();
    const elementAtCloseButton = document.elementFromPoint(
      closeButtonRect.left + closeButtonRect.width / 2,
      closeButtonRect.top + closeButtonRect.height / 2
    );
    footerCloseButton.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab'
    });
    document.dispatchEvent(tabEvent);
    const forwardTabStayedInDialog =
      control.dialog.contains(document.activeElement) &&
      document.activeElement === closeButton;
    closeButton.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey: true
    });
    document.dispatchEvent(shiftTabEvent);
    const backwardTabStayedInDialog =
      control.dialog.contains(document.activeElement) &&
      document.activeElement === footerCloseButton;

    document.querySelector('#outside').click();

    return {
      id: 'fullscreen-like',
      backdropCoversViewport:
        Math.round(backdrop.left) <= 0 &&
        Math.round(backdrop.top) <= 0 &&
        Math.round(backdrop.right) >= window.innerWidth &&
        Math.round(backdrop.bottom) >= window.innerHeight,
      blockedOutsideActivation: outsideActivations === 0,
      closedAfterOutsideClick: !control.dialog.hasAttribute('open'),
      dialogAboveBackdrop,
      fallbackHostIsExpected,
      closeButtonHitTest:
        elementAtCloseButton === closeButton ||
        closeButton.contains(elementAtCloseButton),
      dialogHitTest:
        control.dialog === elementAtDialogCenter ||
        control.dialog.contains(elementAtDialogCenter),
      forwardTabPrevented: tabEvent.defaultPrevented,
      forwardTabStayedInDialog,
      backwardTabPrevented: shiftTabEvent.defaultPrevented,
      backwardTabStayedInDialog,
      dialogWithinViewport:
        dialog.top >= 0 &&
        dialog.left >= 0 &&
        dialog.bottom <= window.innerHeight &&
        dialog.right <= window.innerWidth,
      directionPreserved: true,
      dialogHasArea: dialog.width > 0 && dialog.height > 0,
      noBackdropAfterClose:
        document.querySelector('.h5p-audio-text-alternative-fallback-backdrop') === null
    };
  }));

  console.log(JSON.stringify({
    browser: name,
    fallback: result.checks,
    fallbackReopen: result.fallbackReopen,
    nativeDialog: nativeDialogResult
  }, null, 2));

  const failures = result.checks.filter((check) =>
    !check.backdropCoversViewport ||
    !check.blockedOutsideActivation ||
    !check.closedAfterOutsideClick ||
    !check.dialogAboveBackdrop ||
    !check.fallbackHostIsExpected ||
    !check.closeButtonHitTest ||
    !check.dialogHitTest ||
    !check.forwardTabPrevented ||
    !check.forwardTabStayedInDialog ||
    !check.backwardTabPrevented ||
    !check.backwardTabStayedInDialog ||
    !check.dialogWithinViewport ||
    !check.directionPreserved ||
    !check.dialogHasArea ||
    !check.noBackdropAfterClose
  );

  const nativeFailures = nativeDialogResult.filter((check) =>
    !check.supportsNativeDialog ||
    !check.opened ||
    !check.nativeModal ||
    !check.ariaExpandedWhileOpen ||
    !check.remainedInContainer ||
    !check.noFallbackBackdrop ||
    !check.focusedInsideDialog ||
    !check.dialogWithinViewport ||
    check.ariaExpandedAfterClose !== 'false'
  );

  if (nativeFailures.length) {
    throw new Error(
      `Native dialog browser check failed in ${name}: ${JSON.stringify(nativeFailures, null, 2)}`
    );
  }

  if (
    !result.fallbackReopen.reopenedCleanly ||
    !result.fallbackReopen.staleCloseIgnored ||
    !result.fallbackReopen.finalCleanup
  ) {
    throw new Error(
      `Fallback reopen browser check failed in ${name}: ${JSON.stringify(result.fallbackReopen, null, 2)}`
    );
  }

  if (failures.length) {
    throw new Error(`Fallback browser checks failed in ${name}: ${JSON.stringify(failures, null, 2)}`);
  }
  }
  finally {
    await browser.close();
  }
}
