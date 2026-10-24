import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.WAGIE.app',
  appName: 'WAGIE',
  webDir: 'native-shell',
  // Online test APK only: Next.js API routes continue running on the website.
  // Release builds are blocked in android/app/build.gradle until bundled shipping is configured.
  server: {
    url: 'https://www.wagie.net',
    cleartext: false,
    allowNavigation: ['www.wagie.net', 'wagie.net'],
    errorPath: 'offline.html',
  },
  android: { allowMixedContent: false },
};

export default config;
