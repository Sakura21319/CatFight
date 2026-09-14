import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(projectRoot, 'build', 'wechatgame');
const assetsRoot = path.join(outputRoot, 'assets');
const subpackagesRoot = path.join(outputRoot, 'subpackages');
const bundleNames = [
  'menu-pack',
  'road-scene',
  'road-cars',
  'road-cat',
  'gallery-pack',
  'audio-pack',
];

for (const required of ['game.json', path.join('src', 'settings.json')]) {
  const target = path.join(outputRoot, required);
  if (!fs.existsSync(target)) throw new Error('Missing WeChat build file: ' + target);
}

fs.mkdirSync(subpackagesRoot, { recursive: true });
for (const name of bundleNames) {
  const source = path.join(assetsRoot, name);
  const destination = path.join(subpackagesRoot, name);
  if (fs.existsSync(source)) {
    if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
    fs.renameSync(source, destination);
  } else if (!fs.existsSync(destination)) {
    throw new Error('Missing asset bundle: ' + name);
  }
}

const gamePath = path.join(outputRoot, 'game.json');
const gameConfig = JSON.parse(fs.readFileSync(gamePath, 'utf8'));
const packageMap = new Map((gameConfig.subpackages ?? []).map((item) => [item.name, item]));
for (const name of bundleNames) {
  packageMap.set(name, { name, root: 'subpackages/' + name + '/' });
}
gameConfig.subpackages = [...packageMap.values()];
fs.writeFileSync(gamePath, JSON.stringify(gameConfig, null, 4) + '\n');

const settingsPath = path.join(outputRoot, 'src', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const configured = new Set(settings.assets.subpackages ?? []);
for (const name of bundleNames) configured.add(name);
settings.assets.subpackages = [...configured];
fs.writeFileSync(settingsPath, JSON.stringify(settings));

console.log('Prepared ' + bundleNames.length + ' WeChat subpackages in ' + outputRoot);
