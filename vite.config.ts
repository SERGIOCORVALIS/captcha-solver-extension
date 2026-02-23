import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Plugin to fix import paths in content script and service worker
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

function fixExtensionImports() {
  return {
    name: 'fix-extension-imports',
    writeBundle(options, bundle) {
      // Fix import paths for content script and service worker
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (
          (fileName.includes('content-script') || fileName.includes('service-worker')) &&
          chunk.type === 'chunk' &&
          chunk.code
        ) {
          // Replace relative imports with absolute paths
          chunk.code = chunk.code.replace(
            /from\s+["'](\.\.\/chunks\/[^"']+)["']/g,
            (match, path) => {
              // Convert ../chunks/file.js to /chunks/file.js (absolute from extension root)
              const absolutePath = '/' + path.replace('../', '');
              return `from "${absolutePath}"`;
            }
          );
          
          // Write the modified code back
          const filePath = join(options.dir || 'dist', fileName);
          writeFileSync(filePath, chunk.code, 'utf8');
        }
      }

    },
    closeBundle() {
      // Fix CSS paths in HTML files after all files are written
      const distDir = 'dist';
      const htmlFiles = [
        { 
          path: join(distDir, 'options/options.html'), 
          cssPattern: /href=["']\.\.\/options\/options\.css["']/g, 
          cssDir: 'options',
          cssName: 'options'
        },
        { 
          path: join(distDir, 'popup/popup.html'), 
          cssPattern: /href=["']\.\.\/popup\/popup\.css["']/g, 
          cssDir: 'popup',
          cssName: 'popup'
        },
      ];
      
      for (const { path: htmlPath, cssPattern, cssDir, cssName } of htmlFiles) {
        try {
          if (existsSync(htmlPath)) {
            let htmlContent = readFileSync(htmlPath, 'utf8');
            
            // Find CSS file in the same directory
            const cssDirPath = join(distDir, cssDir);
            if (existsSync(cssDirPath)) {
              const files = readdirSync(cssDirPath);
              const cssFile = files.find((f: string) => 
                f.endsWith('.css') && f.includes(cssName)
              );
              
              if (cssFile) {
                const relativePath = `./${cssFile}`;
                htmlContent = htmlContent.replace(cssPattern, `href="${relativePath}"`);
                writeFileSync(htmlPath, htmlContent, 'utf8');
                console.log(`Updated CSS path in ${htmlPath} to ${relativePath}`);
              } else {
                console.warn(`CSS file not found for ${htmlPath} in ${cssDirPath}`);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to update HTML file ${htmlPath}:`, error);
        }
      }
    },
  };
}

// Plugin to inline all chunks for service worker and content script (no dynamic imports)
function inlineServiceWorkerChunks() {
  return {
    name: 'inline-service-worker-chunks',
    writeBundle(options, bundle) {
      // Process both service worker and content script
      const entries = [
        Object.keys(bundle).find(key => key.includes('service-worker')),
        Object.keys(bundle).find(key => key.includes('content-script')),
      ].filter(Boolean) as string[];

      for (const entry of entries) {
        if (!entry) continue;

        const chunk = bundle[entry];
        if (chunk.type !== 'chunk') continue;

        // Read file
        const filePath = join(options.dir || 'dist', entry);
        let code = readFileSync(filePath, 'utf8');

        // Find all ES6 imports (static imports)
        const staticImportRegex = /import\s+.*?\s+from\s+["']([^"']+)["']/g;
        const dynamicImportRegex = /import\s*\(["']([^"']+)["']\)/g;
        const imports: Array<{ path: string; match: string; isDynamic: boolean }> = [];
        let match;
        
        // Find static imports
        while ((match = staticImportRegex.exec(code)) !== null) {
          imports.push({ path: match[1], match: match[0], isDynamic: false });
        }
        
        // Find dynamic imports
        while ((match = dynamicImportRegex.exec(code)) !== null) {
          imports.push({ path: match[1], match: match[0], isDynamic: true });
        }

        // Inline all chunks
        for (const { path, match: importMatch, isDynamic } of imports) {
          // Skip node_modules and external imports
          if (path.startsWith('http') || path.startsWith('//') || path.includes('node_modules')) {
            continue;
          }

          // Find chunk file - handle both relative and absolute paths
          let chunkPath = path;
          if (path.startsWith('../chunks/') || path.startsWith('./chunks/')) {
            chunkPath = path.replace(/^\.\.?\//, '');
          } else if (path.startsWith('/chunks/')) {
            chunkPath = path.substring(1);
          }

          const chunkFileName = chunkPath.split('/').pop();
          const chunkEntry = Object.keys(bundle).find(key => 
            key.includes(chunkFileName || '') || key === chunkPath
          );
          
          if (chunkEntry) {
            const fullChunkPath = join(options.dir || 'dist', chunkEntry);
            try {
              if (!existsSync(fullChunkPath)) {
                console.warn(`Chunk file not found: ${fullChunkPath}`);
                continue;
              }

              const chunkCode = readFileSync(fullChunkPath, 'utf8');
              
              // Remove export statements and clean up
              let cleanedChunkCode = chunkCode
                .replace(/export\s+\{[^}]+\}\s*;?/g, '')
                .replace(/export\s+default\s+/g, '')
                .replace(/export\s+(const|let|var|function|class|async\s+function)\s+/g, '$1 ')
                .replace(/export\s+/g, '');
              
              // If it's a dynamic import, wrap in async function
              if (isDynamic) {
                cleanedChunkCode = `(async () => { ${cleanedChunkCode} })()`;
              }
              
              // Replace import with chunk code
              code = code.replace(importMatch, cleanedChunkCode);
              
              // Mark chunk for deletion
              delete bundle[chunkEntry];
            } catch (error) {
              console.warn(`Failed to inline chunk ${chunkEntry}:`, error);
            }
          } else {
            console.warn(`Chunk not found in bundle: ${chunkPath} (looking for ${chunkFileName})`);
          }
        }

        // Write modified code back
        writeFileSync(filePath, code, 'utf8');
        console.log(`Inlined chunks for ${entry}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    inlineServiceWorkerChunks(),
    fixExtensionImports(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        },
        {
          src: 'public/icons/*.{svg,png}',
          dest: 'icons',
        },
        {
          src: 'public/popup/popup.html',
          dest: 'popup',
        },
        {
          src: 'public/options/options.html',
          dest: 'options',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, './src/shared'),
      '@content': resolve(__dirname, './src/content'),
      '@background': resolve(__dirname, './src/background'),
      '@popup': resolve(__dirname, './src/popup'),
      '@options': resolve(__dirname, './src/options'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content/content-script': resolve(__dirname, 'src/content/content-script.ts'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.tsx'),
        'options/options': resolve(__dirname, 'src/options/options.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Preserve CSS files in their directories
          if (assetInfo.name?.endsWith('.css')) {
            const name = assetInfo.name;
            if (name.includes('popup')) return 'popup/[name]-[hash][extname]';
            if (name.includes('options')) return 'options/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Inline all dependencies for content script and service worker to avoid chunk loading issues
        manualChunks: (id, { getModuleInfo }) => {
          // Get all importers to check if module is used by content script or service worker
          const moduleInfo = getModuleInfo(id);
          if (moduleInfo) {
            // Check if this module is imported by content script
            const isImportedByContent = moduleInfo.importers.some(importer => 
              importer.includes('content/content-script')
            );
            // Check if this module is imported by service worker
            const isImportedBySW = moduleInfo.importers.some(importer => 
              importer.includes('background/service-worker')
            );
            
            // If imported by content script or service worker, inline it
            if (isImportedByContent || isImportedBySW) {
              return undefined; // Inline - no chunks
            }
            
            // For service worker entry, force everything inline
            if (id.includes('background/service-worker')) {
              return undefined; // Inline - no chunks
            }
            
            // For content script entry, force everything inline
            if (id.includes('content/content-script')) {
              return undefined; // Inline - no chunks
            }
            
            // For shared code used by content/background, also inline
            if (id.includes('shared/')) {
              return undefined; // Inline all shared code
            }
          }
          
          // For popup and options, we can split into vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('chrome')) {
              return 'vendor-chrome';
            }
            return 'vendor';
          }
          return undefined; // Default: inline for content/background
        },
        // Force inline for content script - no external chunks
        inlineDynamicImports: false, // We'll handle this via manualChunks
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging - we need [CAPTCHA Solver] logs
        drop_debugger: true,
        pure_funcs: [], // Don't remove any console functions - we need them for debugging
        passes: 2, // Multiple passes for better optimization
        dead_code: true, // Remove dead code
        unused: true, // Remove unused code
      },
      mangle: {
        properties: false, // Don't mangle property names to avoid breaking Chrome APIs
      },
    },
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500KB (optimized from 1MB)
    sourcemap: process.env.NODE_ENV === 'development', // Only in development
    target: 'es2022', // Modern target for better optimization
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@tensorflow/tfjs-node'], // Exclude heavy dependencies from pre-bundling
  },
});
