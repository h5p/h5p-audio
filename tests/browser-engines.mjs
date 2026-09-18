import { chromium, firefox, webkit } from 'playwright';

const browserTypes = { chromium, firefox, webkit };
const defaultBrowserNames = Object.keys(browserTypes);

export const browserEngines = (process.env.H5P_AUDIO_BROWSERS || defaultBrowserNames.join(','))
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)
  .map((name) => {
    if (!browserTypes[name]) {
      throw new Error(`Unknown browser "${name}". Use chromium, firefox, or webkit.`);
    }

    return {
      browserType: browserTypes[name],
      launchOptions: name === 'chromium' ? { args: ['--no-sandbox'] } : {},
      name
    };
  });
