import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';

const config: CapacitorConfig = {
  appId: 'org.khora.lulu',
  appName: 'LuLu',
  webDir: 'dist/app',
  iosScheme: 'capacitor',
  androidScheme: 'https',
  plugins: {
    CapacitorUpdater: { autoUpdate: false, publicKey: readFileSync('ota-public.pem', 'utf8'), statsUrl: '' },
    Camera: {
      // Capture originals at full resolution; LocalMediaVault owns the encrypted copy.
      resultType: 'uri',
      saveToGallery: false,
    },
  },
};

export default config;
