import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
    developmentIndicator: 'grayscale',
  },
  manifest: {
    name: 'AutoApply',
    description:
      'Fill job application forms with your own LLM API key. Local-first, no backend.',
    // No default_popup: the action click opens the side panel instead
    // (Chrome via setPanelBehavior, Firefox via sidebarAction.toggle).
    action: { default_title: 'AutoApply' },
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
