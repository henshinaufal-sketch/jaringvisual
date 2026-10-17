import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('.local-build/index.html', root));
const guide = await readFile(new URL('docs/PETUNJUK-LOKAL.txt', root));
await writeFile(new URL('JaringVisual.html', root), html);
const archive = zipSync({ 'JaringVisual.html': html, 'BACA-DULU.txt': guide }, { level: 9 });
await writeFile(new URL('JaringVisual-lokal.zip', root), archive);
console.log(`Siap dibuka tanpa server: ${fileURLToPath(new URL('JaringVisual.html', root))}`);
console.log(`Paket untuk dipindahkan ke komputer sendiri: JaringVisual-lokal.zip (${Math.ceil(archive.length / 1024)} KB)`);
