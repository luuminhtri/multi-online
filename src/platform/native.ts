import { CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { DurableStorage } from './durable-storage.ts';

export async function initializeNative() {
  const key = 'ma-soi:device-storage:v1';
  const { value } = await Preferences.get({ key });
  const storage = new DurableStorage(value, value => Preferences.set({ key, value }));
  document.documentElement.classList.add('native-app');
  return {
    storage,
    async request(url: string, body: unknown, headers: Record<string, string>) {
      const response = await CapacitorHttp.request({ url, method: body ? 'POST' : 'GET', headers,
        ...(body ? { data: body } : {}), responseType: 'json', connectTimeout: 12000, readTimeout: 12000,
        disableRedirects: true,
      });
      return { status: response.status, data: response.data };
    },
    copy: (text: string) => Clipboard.write({ string: text }),
    feedback: () => { void Haptics.selectionChanged().catch(() => {}); },
    ready: () => { void SplashScreen.hide({ fadeOutDuration: 150 }).catch(() => {}); },
    async listen(onActive: (active: boolean) => void, onReconnect: () => void) {
      await App.addListener('appStateChange', ({ isActive }) => onActive(isActive));
      await Network.addListener('networkStatusChange', ({ connected }) => { if (connected) onReconnect(); });
    },
  };
}
