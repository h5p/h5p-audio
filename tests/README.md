# Validation checks

These checks document the local validation used for the text alternative work.

Run from the repository root:

```sh
npm install --no-save jsdom@30.1.0 playwright@1.63.0
npx playwright install chromium firefox webkit
node --test tests/audio-controls-dom.test.mjs
node --test tests/audio-integration-dom.test.mjs
node --test tests/text-alternative-dom.test.mjs
node tests/audio-controls-browser.mjs
node tests/text-alternative-layout-browser.mjs
node tests/text-alternative-browser.mjs
```

The browser fixtures load H5P theme variables and the real `h5p-theme` font
from a sibling `h5p-php-library` checkout by default. Set `H5P_CORE_ROOT` if
that checkout is elsewhere. They load the real FontAwesome 4 webfont from a
sibling `font-awesome` checkout, or from the local H5P validation artifacts if
present. Set `H5P_FONTAWESOME4_FONT` if that font is elsewhere.

One reproducible setup for those browser assets is:

```sh
git clone https://github.com/h5p/h5p-php-library ../h5p-php-library
git -C ../h5p-php-library checkout cb64a1f3884408487c3178e31fc140f5d45ca165
git clone https://github.com/h5p/font-awesome ../font-awesome
git -C ../font-awesome checkout 49f57629864f80d0bc339ccf3b99f172106d20b4
```

The DOM tests cover custom Full player controls, Audio integration, fallback
dialog keyboard behavior, outside activation blocking, stale native close
events, and plain-text rendering.

The browser tests load the H5P theme and font context expected by the player.
They run in Chromium, Firefox, and WebKit by default and cover visible Full
player time, Minimalistic joined-pill layout, native dialog behavior, fallback
backdrop, hit testing, focus trapping, RTL long-content positioning, and
fullscreen hosting in standalone and constrained parent-like contexts. Set
`H5P_AUDIO_BROWSERS=chromium`, `firefox`, `webkit`, or a comma-separated list to
limit the browser matrix during focused local checks.

The dialog fallback is exercised by forcing `showModal()` unavailable. Browsers
with native modal dialog support use the native path.
