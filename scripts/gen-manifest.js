/**
 * Build-time manifest generator.
 *
 * Scans the extensions directory and produces a single JSON file the browser
 * app can import. This replaces the Electron main-process ExtensionManager.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTENSIONS_DIR = path.join(ROOT, 'extensions');
const CONFIG_DIR = path.join(ROOT, 'config');
const OUT_DIR = path.join(ROOT, 'src', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'manifest.json');

const HOME_EXTENSION = 'ext.app.home';

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return fallback;
  }
}

function isDisabledExtension(name) {
  // Online/third-party tools are intentionally removed from the web build.
  return name.indexOf('provider') !== -1;
}

function loadLanguages() {
  const dir = path.join(CONFIG_DIR, 'language');
  const languages = {};
  if (!fs.existsSync(dir)) return languages;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const name = file.slice(0, -'.json'.length);
    const data = readJson(path.join(dir, file), null);
    if (data) languages[name] = data;
  }
  return languages;
}

function loadCatalogs() {
  const file = path.join(CONFIG_DIR, 'extension.catalog.json');
  const catalogs = readJson(file, []);
  return catalogs.filter((item) => item && !isDisabledExtension(item.key));
}

function scanExtension(dirName) {
  const dir = path.join(EXTENSIONS_DIR, dirName);
  if (!fs.existsSync(dir)) return null;

  const metaFile = path.join(dir, 'package.json');
  const metadata = readJson(metaFile, {});

  let component = null;
  const controllers = [];
  let entries = [];

  try {
    entries = fs.readdirSync(dir);
  } catch (err) {
    return null;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (err) {
      continue;
    }

    if (stat.isFile() && /^view\./.test(entry) && entry.endsWith('.js')) {
      component = entry;
    } else if (stat.isDirectory() && entry === 'controllers') {
      for (const file of fs.readdirSync(full)) {
        if (!file.endsWith('.js')) continue;
        controllers.push(file.slice(0, -'.js'.length));
      }
    }
  }

  if (!component && controllers.length === 0) return null;

  const item = Object.assign({}, metadata);
  item.name = dirName;
  if (component) item.component = component;
  if (controllers.length) item.controllers = controllers;

  // Same logic as the original ExtensionManager: everything before the last
  // dot is the catalog key. Home deliberately does not register a catalog.
  const catalogKey = dirName.substring(0, dirName.lastIndexOf('.'));
  if (catalogKey) item.catalog = catalogKey;

  return item;
}

function main() {
  const catalogs = loadCatalogs();
  const languages = loadLanguages();
  const themes = readJson(path.join(CONFIG_DIR, 'theme.json'), []);
  const userConfig = readJson(path.join(CONFIG_DIR, 'config.json'), {});

  const items = [];
  if (fs.existsSync(EXTENSIONS_DIR)) {
    for (const entry of fs.readdirSync(EXTENSIONS_DIR)) {
      if (!entry.startsWith('ext.app.')) continue;
      if (isDisabledExtension(entry)) continue;
      try {
        if (!fs.statSync(path.join(EXTENSIONS_DIR, entry)).isDirectory()) continue;
      } catch (err) {
        continue;
      }
      const item = scanExtension(entry);
      if (item) items.push(item);
    }
  }

  // Drop catalogs that ended up empty (e.g. removed provider groups).
  const usedCatalogs = new Set(
    items
      .map((item) => item.catalog)
      .filter((key) => key && key !== 'ext.app')
  );
  const filteredCatalogs = catalogs.filter((item) => usedCatalogs.has(item.key));

  const manifest = {
    generatedAt: new Date().toISOString(),
    catalogs: filteredCatalogs,
    items,
    languages,
    themes,
    config: {
      locale: userConfig.locale || 'en',
      theme: (userConfig.ui && userConfig.ui.theme) || { name: 'Theme_1', dark: false },
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(
    `[manifest] ${items.length} extensions, ${items.reduce(
      (n, i) => n + (i.controllers ? i.controllers.length : 0),
      0
    )} controllers, ${filteredCatalogs.length} catalogs -> ${path.relative(ROOT, OUT_FILE)}`
  );
}

main();
