import {cp, mkdir, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

const base = (process.argv[2] ?? '/booking-central').replace(/\/$/, '');
if (base && !/^\/[a-zA-Z0-9._-]+$/.test(base)) throw new Error('Expected a repository base path, such as /booking-central');
await rm('_pages', {recursive: true, force: true});
await mkdir('_pages');
await cp('dist', '_pages', {recursive: true});
async function prepare(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await prepare(file);
    else if (entry.name.endsWith('.html')) {
      let html = await readFile(file, 'utf8');
      html = html.replace('<meta name="site-base" content="">', `<meta name="site-base" content="${base}">`);
      html = html.replace(/((?:href|src)=")\/(?!\/)/g, `$1${base}/`);
      await writeFile(file, html);
    }
  }
}
await prepare('_pages');
await writeFile('_pages/.nojekyll', '');
console.log(`GitHub Pages prepared in _pages with base ${base || '/'}.`);
