import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'jubyeon',
  brand: {
    primaryColor: '#F26B12',
  },
  permissions: [{ name: 'photos', access: 'read' }],
  webBundleDir: 'out',
});
