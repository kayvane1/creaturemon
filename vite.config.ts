import { defineConfig } from 'vite';
import { createCodexNpcChatPlugin } from './scripts/codexNpcChatPlugin.mjs';

export default defineConfig({
  plugins: [createCodexNpcChatPlugin()],
  server: {
    port: 5173,
  },
});
