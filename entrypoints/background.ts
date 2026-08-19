export default defineBackground(() => {
  // Message routing is added as features land; the background service worker
  // is the only place allowed to hold the API key and talk to LLM providers.
});
