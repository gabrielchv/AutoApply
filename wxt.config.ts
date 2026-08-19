import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AutoApply',
    description:
      'Fill job application forms with your own LLM API key. Local-first, no backend.',
    permissions: ['storage', 'activeTab', 'webNavigation'],
    // Content scripts must run on any job site, and the background worker
    // must reach whatever LLM base URL the user configures.
    host_permissions: ['<all_urls>'],
    browser_specific_settings: {
      gecko: {
        id: 'autoapply@reachbob.com',
      },
    },
  },
});
