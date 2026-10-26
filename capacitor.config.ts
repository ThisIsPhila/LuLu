import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.khora.lulu',
  appName: 'LuLu',
  webDir: 'dist/app',
  iosScheme: 'capacitor',
  androidScheme: 'https',
  plugins: {
    Camera: {
      // Capture originals at full resolution; LocalMediaVault owns the encrypted copy.
      resultType: 'uri',
      saveToGallery: false,
    },
  },
};

export default config;
