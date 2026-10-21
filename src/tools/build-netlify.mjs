import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const panel = fileURLToPath(new URL('../../', import.meta.url));
const destination = resolve(process.argv[2] || join(panel, 'dist/netlify'));
await mkdir(destination, { recursive: true });
if ((await readdir(destination)).length) throw new Error('Output directory must be empty to avoid stale files');
await mkdir(join(destination, '.netlify/functions'), { recursive: true });
await mkdir(join(destination, 'public'), { recursive: true });
await writeFile(join(destination, 'public/.gitkeep'), '');

const assets = ['index.html', 'bridge.js', 'theme.css', 'singbox-rules.json.gz', 'singbox-rules.LICENSE', 'singbox-rules.NOTICE.md'];
await build({
  entryPoints: [join(panel, 'src/tools/netlify-handler.mjs')],
  outfile: join(destination, '.netlify/functions/api.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  sourcemap: false,
  define: { 'process.env.NETLIFY': '\"1\"' },
  plugins: [{
    name: 'runtime-assets',
    setup(builder) {
      builder.onLoad({ filter: /\\.mjs$/ }, async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        for (const asset of assets) {
          contents = contents.replaceAll(`new URL('./${asset}', import.meta.url)`, `new URL('../public/${asset}', import.meta.url)`);
        }
        return { contents, loader: 'js' };
      });
    }
  }]
});

for (const asset of assets) await copyFile(join(panel, asset), join(destination, 'public', asset));
for (const name of ['LICENSE', 'NOTICE.md']) await copyFile(join(panel, '..', name), join(destination, name));

await writeFile(join(destination, 'package.json'), JSON.stringify({ name: 'cfnew-panel-netlify', private: true, type: 'module', version: '1.0.0', license: 'SEE LICENSE IN LICENSE', engines: { node: '22.x' } }, null, 2) + '\n');

const version = (await readFile(join(panel, 'release.mjs'), 'utf8')).match(/PANEL_VERSION = '([^']+)'/)[1];
await writeFile(join(destination, 'README.md'), `# CFnew 独立面板部署包 (Netlify)\n\n兼容内核：${version}。\n\n部署说明请参见 README 中的 Netlify 部署章节。\n`);
console.log('Netlify 部署包已生成：' + destination);
