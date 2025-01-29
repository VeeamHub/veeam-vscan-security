import { build } from 'esbuild';
import { join } from 'path';
import fs from 'fs-extra';

async function buildPreload() {
    try {
        console.log('🚀 Starting preload script build...');

        
        await fs.ensureDir('dist-electron/preload');

        await build({
            entryPoints: [join(process.cwd(), 'electron', 'preload', 'index.ts')],
            bundle: true,
            platform: 'node',
            target: ['node18', 'es2022'],
            outfile: join(process.cwd(), 'dist-electron', 'preload', 'index.js'), 
            format: 'cjs',
            external: ['electron'],
            minify: process.env.NODE_ENV === 'production',
            sourcemap: process.env.NODE_ENV !== 'production',
        });

        
        const dtsContent = `
declare global {
    interface Window {
        electron: {
            fs: {
                readFile: (path: string, options?: { encoding?: string }) => Promise<Buffer | string>;
            };
            logger: {
                info: (message: string) => void;
                warn: (message: string) => void;
                error: (message: string) => void;
                debug: (message: string) => void;
            };
            powershell: {
                execute: (command: string) => Promise<string>;
            };
            api: {
                get: (url: string) => Promise<any>;
                post: (url: string, data: any) => Promise<any>;
                put: (url: string, data: any) => Promise<any>;
                delete: (url: string) => Promise<any>;
            };
        }
    }
    export {};
}`;

        await fs.writeFile(
            join(process.cwd(), 'dist-electron', 'preload', 'index.d.ts'),
            dtsContent,
            'utf8'
        );

        console.log('✅ Preload script built successfully');

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildPreload().catch(console.error);