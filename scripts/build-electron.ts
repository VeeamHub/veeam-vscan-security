#!/usr/bin/env tsx
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function buildElectron() {
  try {
    console.log('🚀 Starting Electron build process...');

    
    console.log('📝 Compiling TypeScript...');
    const result = await execAsync('tsc -p electron/tsconfig.json', { cwd: rootDir });
    console.log(result.stdout);
    console.log('✅ TypeScript compilation completed');

    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 Starting Electron in development mode...');
      await execAsync('electron .', { cwd: rootDir });
    }

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildElectron().catch(console.error);