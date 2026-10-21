import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const panel = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(process.argv[2] || join(panel, '../dist/netlify'));
await mkdir(destination, { recursive: true });
if ((await readdir(destination)).length) throw new Error('输出目录必须为空，避免把旧文件或凭据带进部署包');
await mkdir(join(destination, 'functions'));
await mkdir(join(destination, 'data'));
await mkdir(join(destination, 'public'));
await writeFile(join(destination, 'public/.gitkeep'), '');

const assets = ['index.html', 'bridge.js', 'theme.css', 'singbox-rules.json.gz', 'singbox-rules.LICENSE', 'singbox-rules.NOTICE.md'];
await build({
  entryPoints: [join(panel, 'tools/netlify-handler.mjs')],
  outfile: join(destination, 'functions/api.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node22',
  minify: true, charset: 'utf8', legalComments: 'none', sourcemap: false,
  define: { 'process.env.NETLIFY': '"1"' },
  plugins: [{ name: 'runtime-assets', setup(builder) {
    builder.onLoad({ filter: /\.mjs$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      for (const asset of assets) contents = contents.replaceAll(`new URL('./${asset}', import.meta.url)`, `new URL('../data/${asset}', import.meta.url)`);
      return { contents, loader: 'js' };
    });
  } }],
});

for (const asset of assets) await copyFile(join(panel, asset), join(destination, 'data', asset));
//for (const name of ['LICENSE', 'NOTICE.md']) await copyFile(join(panel, '..', name), join(destination, name));
const version = (await readFile(join(panel, 'release.mjs'), 'utf8')).match(/PANEL_VERSION = '([^']+)'/)[1];
console.log(`Netlify 部署包已生成（兼容内核 ${version}）：` + destination);
