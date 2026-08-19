import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AutoApply',
    description:
      'Fill job application forms with your own LLM API key. Local-first, no backend.',
    browser_specific_settings: {
      gecko: {
        id: 'autoapply@reachbob.com',
      },
    },
  },
});
