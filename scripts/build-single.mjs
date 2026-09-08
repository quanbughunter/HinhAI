// Gộp toàn bộ mã nguồn thành 1 tệp HTML chạy được ngay bằng cách mở trong trình duyệt.
// Không cần cài gì: node scripts/build-single.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seen = new Set();
const chunks = [];

function bundle(file) {
  const abs = resolve(root, file);
  if (seen.has(abs)) return;
  seen.add(abs);
  let src = readFileSync(abs, 'utf8');
  // nạp các module phụ thuộc trước
  for (const m of src.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
    bundle(resolve(dirname(abs), m[1]));
  }
  src = src
    .replace(/^\s*import[\s\S]*?from\s*['"][^'"]*['"];?/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^(\s*)export\s+(default\s+)?(const|let|var|function|class|async)\b/gm, '$1$3');
  chunks.push(`\n/* ==== ${file.replace(root, '').replace(/\\/g, '/')} ==== */\n` + src.trim());
}

bundle('src/main.js');
const js = chunks.join('\n');

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const standalone = html.replace(
  /<script type="module" src="\.\/src\/main\.js"><\/script>/,
  `<script type="module">\n${js}\n</script>`
);
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/geoai.html'), standalone);

// Bản dùng cho Artifact: bỏ khung <html>/<head>/<body>, giữ <title> + <style> + nội dung
const title = (standalone.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const style = (standalone.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const body = (standalone.match(/<body>([\s\S]*)<\/body>/) || ['', ''])[1];
writeFileSync(resolve(root, 'dist/artifact-body.html'), `${title}\n${style}\n${body.trim()}\n`);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log('dist/geoai.html        ', kb(standalone), `(${seen.size} module)`);
console.log('dist/artifact-body.html', kb(body));
