import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voicecommunication.app',
  appName: 'Voice Communication',
  webDir: 'public',
  server: {
    url: 'https://sadhana-azure.vercel.app/',
    cleartext: true
  }
};

export default config;
