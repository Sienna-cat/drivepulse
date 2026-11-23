import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('.', import.meta.url)));
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'src']) await cp(file, `dist/${file}`, { recursive: true });
