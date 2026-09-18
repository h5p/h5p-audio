import fs from 'node:fs';
import path from 'node:path';

const resolveExistingPath = (paths, label) => {
  const resolvedPath = paths.find((candidate) => candidate && fs.existsSync(candidate));

  if (!resolvedPath) {
    throw new Error(`Missing ${label}. Set H5P_CORE_ROOT or H5P_FONTAWESOME4_FONT.`);
  }

  return resolvedPath;
};

const findTemporaryFontAwesomeFont = () => {
  const tempRoot = '/tmp';

  if (!fs.existsSync(tempRoot)) {
    return undefined;
  }

  return fs.readdirSync(tempRoot)
    .filter((entry) => entry.startsWith('h5p-audio-local-validation-artifacts.'))
    .map((entry) => path.join(
      tempRoot,
      entry,
      'libraries',
      'FontAwesome-4.5',
      'fontawesome-webfont.woff2'
    ))
    .find((candidate) => fs.existsSync(candidate));
};

const h5pCoreRoot = process.env.H5P_CORE_ROOT ||
  new URL('../../h5p-php-library', import.meta.url).pathname;
const h5pThemeFont = resolveExistingPath([
  path.join(h5pCoreRoot, 'fonts', 'h5p-theme.woff2')
], 'H5P theme font');
const h5pThemeVariables = resolveExistingPath([
  path.join(h5pCoreRoot, 'styles', 'h5p-theme-variables.css')
], 'H5P theme variables');
const fontAwesomeFont = resolveExistingPath([
  process.env.H5P_FONTAWESOME4_FONT,
  new URL('../../font-awesome/fontawesome-webfont.woff2', import.meta.url).pathname,
  findTemporaryFontAwesomeFont()
], 'FontAwesome 4 font');

const createFontDataUrl = (fontPath) =>
  `data:font/woff2;base64,${fs.readFileSync(fontPath).toString('base64')}`;

export const h5pThemeStyle = `
  ${fs.readFileSync(h5pThemeVariables, 'utf8')}

  @font-face {
    font-family: 'h5p-theme';
    src: url('${createFontDataUrl(h5pThemeFont)}') format('woff2');
    font-style: normal;
    font-weight: normal;
  }

  @font-face {
    font-family: 'H5PFontAwesome4';
    src: url('${createFontDataUrl(fontAwesomeFont)}') format('woff2');
    font-style: normal;
    font-weight: normal;
  }

  body {
    color: var(--h5p-theme-text-primary);
    font-family: var(--h5p-theme-font-name);
    font-size: 16px;
  }
`;

export const waitForH5PThemeFonts = async (page) => {
  const fontStatuses = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('1rem "h5p-theme"'),
      document.fonts.load('1rem "H5PFontAwesome4"')
    ]);
    await document.fonts.ready;

    return ['h5p-theme', 'H5PFontAwesome4'].map((family) => ({
      family,
      loaded: document.fonts.check(`1rem "${family}"`)
    }));
  });

  for (const { family, loaded } of fontStatuses) {
    if (!loaded) {
      throw new Error(`Expected ${family} to load: ${JSON.stringify(fontStatuses, null, 2)}`);
    }
  }
};
