import { defineConfig, type Plugin } from 'vite';

/**
 * Vite always injects `type="module"` into the built index.html.
 * Game Jolt's iframe often fails to execute those modules (black screen),
 * even when the bundle itself is an IIFE. Strip module attributes so the
 * browser loads a classic script.
 */
function classicScriptHtml(): Plugin {
  return {
    name: 'abolivion-classic-script-html',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/\s+type="module"/g, '')
        .replace(/\s+crossorigin(?:="[^"]*")?/g, '')
        .replace(
          /<script(\s+src="\.\/game\.js")><\/script>/,
          '<script defer$1></script>',
        );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [classicScriptHtml()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'Abolivion',
        inlineDynamicImports: true,
        entryFileNames: 'game.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
