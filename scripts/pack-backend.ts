
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

async function packBackend() {
    try {
        console.log('🚀 Packing backend...');
        const serverDir = join(process.cwd(), 'server');
        const resourcesDir = join(process.cwd(), 'resources', 'server');

        
        await fs.remove(resourcesDir);
        await fs.ensureDir(resourcesDir);

        
        console.log('📦 Building backend...');
        execSync('npm run build', { cwd: serverDir, stdio: 'inherit' });

        
        const distDir = join(serverDir, 'dist');
        await fixImportExtensions(distDir);

        
        console.log('📦 Copying compiled files...');
        await fs.copy(
            distDir,
            join(resourcesDir, 'dist'),
            {
                filter: (src) => !src.includes('.map')
            }
        );
        
        
        const pkgJsonPath = join(serverDir, 'package.json');
        const pkgJsonContent = await fs.readFile(pkgJsonPath, 'utf-8');
        const pkgJson = JSON.parse(pkgJsonContent);
        pkgJson.type = "module";
        await fs.writeJSON(join(resourcesDir, 'package.json'), pkgJson, { spaces: 2 });
        
        if (await fs.pathExists(join(serverDir, 'package-lock.json'))) {
            await fs.copy(
                join(serverDir, 'package-lock.json'),
                join(resourcesDir, 'package-lock.json')
            );
        }

        
        console.log('📦 Installing production dependencies...');
        execSync('npm ci --only=production', { cwd: resourcesDir, stdio: 'inherit' });

        console.log('\n📁 Packed backend structure:');
        const structure = await listDirectoryContents(resourcesDir);
        console.log(structure);

        console.log('✅ Backend packed successfully');
    } catch (err) {
        console.error('❌ Error packing backend:', err);
        process.exit(1);
    }
}

async function fixImportExtensions(dir: string) {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
        const fullPath = join(dir, file);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
            await fixImportExtensions(fullPath);
            continue;
        }
        
        if (file.endsWith('.js')) {
            let content = await fs.readFile(fullPath, 'utf-8');
            
            
            content = content.replace(
                /from ['"](\.[^'"]+)['"]/g,
                (match, p1) => {
                    if (!p1.endsWith('.js')) {
                        return `from '${p1}.js'`;
                    }
                    return match;
                }
            );
            
            
            content = content.replace(
                /from ['"](\.[^'"]+)\.ts['"]/g,
                (_, p1) => `from '${p1}.js'`
            );
            
            await fs.writeFile(fullPath, content);
        }
    }
}

async function listDirectoryContents(dir: string, level = 0): Promise<string> {
    let result = '';
    const indent = '  '.repeat(level);
    const items = await fs.readdir(dir);
    
    for (const item of items) {
        const fullPath = join(dir, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
            result += `${indent}📂 ${item}\n`;
            if (level < 2) { 
                result += await listDirectoryContents(fullPath, level + 1);
            }
        } else {
            result += `${indent}📄 ${item}\n`;
        }
    }
    
    return result;
}


packBackend().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});