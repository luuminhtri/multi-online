import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.masoi.app',
  appName: 'Ma Sói',
  webDir: 'dist-ios',
  backgroundColor: '#101516',
  // Room payloads contain capabilities and secret roles: never print the bridge.
  loggingBehavior: 'none',
  initialFocus: false,
  ios: {
    contentInset: 'never',
    backgroundColor: '#101516',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
  plugins: {
    SystemBars: { hidden: true, style: 'DARK', animation: 'NONE' },
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 150,
      backgroundColor: '#101516',
      showSpinner: false,
    },
  },
};
export default config;
