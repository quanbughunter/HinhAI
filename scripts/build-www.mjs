// Dựng thư mục www/ cho Capacitor: một tệp HTML đã gộp sẵn + icon + manifest.
// Dùng bản gộp (dist/geoai.html) để trong WebView không phải nạp 10 tệp rời.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const www = resolve(root, 'www');
mkdirSync(www, { recursive: true });

const html = readFileSync(resolve(root, 'dist/geoai.html'), 'utf8');
writeFileSync(resolve(www, 'index.html'), html);

for (const f of ['icon-192.png', 'icon-512.png', 'manifest.webmanifest']) {
  const src = resolve(root, 'icons', f);
  if (existsSync(src)) copyFileSync(src, resolve(www, f));
}
console.log('www/ đã sẵn sàng —', (Buffer.byteLength(html) / 1024).toFixed(1), 'KB');
