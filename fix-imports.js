// Post-build script to fix import paths in content script and service worker
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filesToFix = [
  'dist/content/content-script.js',
  'dist/background/service-worker.js',
];

for (const filePath of filesToFix) {
  const fullPath = join(__dirname, filePath);
  try {
    let content = readFileSync(fullPath, 'utf8');
    
    // For both service worker and content script, inline all chunks (no dynamic imports allowed)
    if (filePath.includes('service-worker') || filePath.includes('content-script')) {
      // Find all static imports from chunks
      const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
      const imports = [];
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const path = match[2];
        // Only process chunk imports
        if (path.includes('chunks/')) {
          imports.push({
            fullMatch: match[0],
            imports: match[1].trim(),
            path: path,
            index: match.index
          });
        }
      }
      
      // Inline all chunks - extract exports and create variables
      for (let i = imports.length - 1; i >= 0; i--) {
        const { fullMatch, path, imports: importNames } = imports[i];
        // Convert relative path to absolute
        const cleanPath = path.startsWith('../') ? path.replace('../', '') : path;
        const chunkPath = join(__dirname, 'dist', cleanPath);
        
        try {
          let chunkContent = readFileSync(chunkPath, 'utf8');
          
          // Parse import: import {exportName as importName, ...}
          const importItems = importNames.split(',').map(item => {
            const parts = item.trim().split(/\s+as\s+/);
            return { 
              importName: parts[1]?.trim() || parts[0].trim(), // Variable name to use
              exportName: parts[0].trim() // Export name from chunk
            };
          });
          
          // Find export statement: export {original as alias, ...}
          const exportMatch = chunkContent.match(/export\s*\{([^}]+)\}/);
          if (exportMatch) {
            const exportItems = exportMatch[1].split(',').map(item => {
              const parts = item.trim().split(/\s+as\s+/);
              return {
                original: parts[0].trim(), // Variable in chunk
                alias: parts[1]?.trim() || parts[0].trim() // Export name
              };
            });
            
            // Remove export statement
            chunkContent = chunkContent.replace(exportMatch[0], '');
            
            // Create return object mapping export aliases to original variables
            const returnProps = exportItems.map(e => `${e.alias}: ${e.original}`).join(', ');
            
            // Create destructuring: const {exportName as importName, ...} = ...
            const destructureProps = importItems.map(imp => {
              const exp = exportItems.find(e => e.alias === imp.exportName);
              return exp ? `${imp.exportName}: ${imp.importName}` : imp.importName;
            }).join(', ');
            
            // Wrap in IIFE that returns exports, then destructure
            const iifeVar = `__chunk_${i}`;
            const iifeCode = `const ${iifeVar} = (function(){${chunkContent}return {${returnProps}};})();`;
            const destructure = `const {${destructureProps}} = ${iifeVar};`;
            
            chunkContent = iifeCode + '\n' + destructure;
          } else {
            // No exports, just wrap in IIFE
            chunkContent = chunkContent
              .replace(/export\s+\{[^}]+\}\s*;?/g, '')
              .replace(/export\s+default\s+/g, '')
              .replace(/export\s+(const|let|var|function|class|async\s+function)\s+/g, '$1 ');
            chunkContent = `(function(){${chunkContent}})();`;
          }
          
          // Replace the import statement with chunk content
          content = content.substring(0, imports[i].index) + 
                   chunkContent + '\n' +
                   content.substring(imports[i].index + fullMatch.length);
        } catch (error) {
          console.warn(`Failed to inline chunk ${path}:`, error.message);
        }
      }
    } else {
      // For content script, inline all chunks (same as service worker)
      // Find all static imports from chunks
      const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
      const imports = [];
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const path = match[2];
        // Only process chunk imports
        if (path.includes('chunks/')) {
          imports.push({
            fullMatch: match[0],
            imports: match[1].trim(),
            path: path,
            index: match.index
          });
        }
      }
      
      // Inline all chunks - extract exports and create variables
      for (let i = imports.length - 1; i >= 0; i--) {
        const { fullMatch, path, imports: importNames } = imports[i];
        // Convert relative path to absolute
        const cleanPath = path.startsWith('../') ? path.replace('../', '') : path;
        const chunkPath = join(__dirname, 'dist', cleanPath);
        
        try {
          let chunkContent = readFileSync(chunkPath, 'utf8');
          
          // Parse import: import {exportName as importName, ...}
          const importItems = importNames.split(',').map(item => {
            const parts = item.trim().split(/\s+as\s+/);
            return { 
              importName: parts[1]?.trim() || parts[0].trim(), // Variable name to use
              exportName: parts[0].trim() // Export name from chunk
            };
          });
          
          // Find export statement: export {original as alias, ...}
          const exportMatch = chunkContent.match(/export\s*\{([^}]+)\}/);
          if (exportMatch) {
            const exportItems = exportMatch[1].split(',').map(item => {
              const parts = item.trim().split(/\s+as\s+/);
              return {
                original: parts[0].trim(), // Variable in chunk
                alias: parts[1]?.trim() || parts[0].trim() // Export name
              };
            });
            
            // Remove export statement
            chunkContent = chunkContent.replace(exportMatch[0], '');
            
            // Create return object mapping export aliases to original variables
            const returnProps = exportItems.map(e => `${e.alias}: ${e.original}`).join(', ');
            
            // Create destructuring: const {exportName as importName, ...} = ...
            const destructureProps = importItems.map(imp => {
              const exp = exportItems.find(e => e.alias === imp.exportName);
              return exp ? `${imp.exportName}: ${imp.importName}` : imp.importName;
            }).join(', ');
            
            // Wrap in IIFE that returns exports, then destructure
            const iifeVar = `__chunk_${i}`;
            const iifeCode = `const ${iifeVar} = (function(){${chunkContent}return {${returnProps}};})();`;
            const destructure = `const {${destructureProps}} = ${iifeVar};`;
            
            chunkContent = iifeCode + '\n' + destructure;
          } else {
            // No exports, just wrap in IIFE
            chunkContent = chunkContent
              .replace(/export\s+\{[^}]+\}\s*;?/g, '')
              .replace(/export\s+default\s+/g, '')
              .replace(/export\s+(const|let|var|function|class|async\s+function)\s+/g, '$1 ');
            chunkContent = `(function(){${chunkContent}})();`;
          }
          
          // Replace the import statement with chunk content
          content = content.substring(0, imports[i].index) + 
                   chunkContent + '\n' +
                   content.substring(imports[i].index + fullMatch.length);
        } catch (error) {
          console.warn(`Failed to inline chunk ${path}:`, error.message);
        }
      }
    }
    
    writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed imports in ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
  }
}
