import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // Project site at https://timpan8.github.io/ListTool/ — the path is case-sensitive
  // and must match the repository name. A user site or custom domain would use '/'.
  base: '/ListTool/',
});
