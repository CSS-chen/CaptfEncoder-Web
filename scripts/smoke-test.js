/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const manifest = require('../src/generated/manifest.json');

const BASE = process.env.BASE_URL || 'http://localhost:5055/';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TMP_DIR = path.join(__dirname, '.tmp');

// 1x1 transparent PNG
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fixture(name, content) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = path.join(TMP_DIR, name);
  fs.writeFileSync(file, content);
  return file;
}

async function setTextarea(page, index, value) {
  await page.evaluate(
    (i, v) => {
      const areas = document.querySelectorAll('textarea');
      const el = areas[i];
      if (!el) throw new Error('textarea not found: ' + i);
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    index,
    value
  );
  await wait(450);
}

async function getTextarea(page, index) {
  return page.evaluate((i) => {
    const areas = document.querySelectorAll('textarea');
    return areas[i] ? areas[i].value : null;
  }, index);
}

async function setTextInput(page, value) {
  const changed = await page.evaluate((v) => {
    const input = [...document.querySelectorAll('input[type="text"]')].find(
      (el) => el.offsetParent !== null && !el.readOnly
    );
    if (!input) return false;
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, value);

  if (!changed) throw new Error('text input not found');
  await wait(400);
}

async function clickTabByText(page, pattern) {
  const clicked = await page.evaluate((source) => {
    // Scope to the routed view; the application shell has its own tab bar.
    const regex = new RegExp('^(' + source + ')$');
    const tab = [...document.querySelectorAll('.tab-content-container .v-tab')].find((el) =>
      regex.test((el.innerText || '').trim())
    );
    if (!tab) return false;
    tab.click();
    return true;
  }, pattern);

  if (!clicked) throw new Error('tab not found: ' + pattern);
  await wait(700);
}

async function go(page, name) {
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, `#/extensions/${name}`);
  await wait(700);
}

async function clickButtonByText(page, pattern) {
  const clicked = await page.evaluate((source) => {
    const regex = new RegExp(source);
    const button = [...document.querySelectorAll('button')].find(
      (el) => el.offsetParent !== null && regex.test(el.innerText || '')
    );
    if (!button) return false;
    button.click();
    return true;
  }, pattern);

  if (!clicked) throw new Error('button not found: ' + pattern);
}

async function uploadFile(page, file) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 5000 }),
    clickButtonByText(page, 'Select|选择'),
  ]);
  await chooser.accept([file]);
  await wait(1000);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const errors = [];
  const warnings = [];

  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
    if (msg.type() === 'warning') warnings.push('[console] ' + msg.text());
  });

  const checks = {};

  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('.v-application', { timeout: 30000 });
  await wait(800);

  checks.title = (await page.title()).includes('CaptfEncoder');
  checks.navGroups = await page.evaluate(
    () => document.querySelectorAll('.v-navigation-drawer .v-list-group').length
  );

  // Base64
  await go(page, 'ext.app.converter.base64');
  await setTextarea(page, 0, 'hello');
  checks.base64 = (await getTextarea(page, 1)) === 'aGVsbG8=';

  // Caesar
  await go(page, 'ext.app.classical.caesar');
  await setTextarea(page, 0, 'HELLO');
  checks.caesar = (await getTextarea(page, 1)) === 'IFMMP';

  // MD5
  await go(page, 'ext.app.crypto.md5');
  await setTextarea(page, 0, 'hello');
  checks.md5 = (await getTextarea(page, 1)) === '5d41402abc4b2a76b9719d911017c592';

  // Gronsfeld (JS port of the Python implementation)
  await go(page, 'ext.app.classical.gronsfeld');
  await setTextarea(page, 0, 'HELLO');
  checks.gronsfeld = (await getTextarea(page, 1)) === 'JJNQQ';

  // AES round trip
  await go(page, 'ext.app.crypto.aes');
  await setTextInput(page, '12345678');
  await setTextarea(page, 0, 'hello');
  const aesCipher = await getTextarea(page, 1);
  checks.aesEncrypt = !!aesCipher;
  await clickButtonByText(page, 'Decrypt|解密');
  await setTextarea(page, 0, aesCipher);
  checks.aesRoundTrip = (await getTextarea(page, 1)) === 'hello';

  // SM4 round trip
  await go(page, 'ext.app.crypto.sm4');
  await setTextarea(page, 0, 'hello');
  const sm4Cipher = await getTextarea(page, 1);
  checks.sm4Encrypt = /^[0-9a-f]+$/i.test(sm4Cipher || '');
  await clickButtonByText(page, 'Decrypt|解密');
  await setTextarea(page, 0, sm4Cipher);
  checks.sm4RoundTrip = (await getTextarea(page, 1)) === 'hello';

  // Hash identification (JS port of name_that_hash)
  await go(page, 'ext.app.misc.hash-identification');
  await setTextarea(page, 0, '5d41402abc4b2a76b9719d911017c592');
  await clickButtonByText(page, 'Get|获取');
  await wait(700);
  const hashIdOutput = await getTextarea(page, 1);
  checks.hashIdentification = !!hashIdOutput && /MD5|NTLM|LM/i.test(hashIdOutput);

  // File hash
  const textFile = fixture('hello.txt', 'hello world\n');
  await go(page, 'ext.app.misc.file-hash');
  await uploadFile(page, textFile);
  const fileHashOutput = await getTextarea(page, 0);
  checks.fileHash = fileHashOutput === '6f5902ac237024bdd0c176cb93063dc4';

  // File type
  const pngFile = fixture('pixel.png', Buffer.from(PNG_BASE64, 'base64'));
  await go(page, 'ext.app.misc.file-type');
  await uploadFile(page, pngFile);
  const fileTypeOutput = await getTextarea(page, 0);
  checks.fileType = /png/.test(fileTypeOutput || '') && /image\/png/.test(fileTypeOutput || '');

  // QR encode
  await go(page, 'ext.app.other.image-qrcode');
  await setTextarea(page, 0, 'hello');
  const qrSrc = await page.evaluate(() => {
    // Vuetify v-img renders a div with a background image rather than <img>.
    const image = [...document.querySelectorAll('.v-image__image')].find((el) =>
      (el.getAttribute('style') || '').includes('data:image/')
    );
    return image ? image.getAttribute('style').slice(0, 60) : null;
  });
  checks.qrEncode = !!qrSrc && qrSrc.includes('data:image/');

  // QR decode (generated image -> jsQR)
  const qrFile = path.join(TMP_DIR, 'qr.png');
  await require('qrcode').toFile(qrFile, 'hello-qr', { width: 256 });
  await go(page, 'ext.app.other.image-qrcode');
  await clickTabByText(page, '解码|Decode');
  await uploadFile(page, qrFile);
  checks.qrDecode = await page.evaluate(() =>
    [...document.querySelectorAll('textarea')].some((t) => t.value === 'hello-qr')
  );

  // Image -> base64 data URL
  await go(page, 'ext.app.other.image-base64');
  await clickTabByText(page, '编码|Encode');
  await uploadFile(page, pngFile);
  const imageBase64 = await getTextarea(page, 0);
  checks.imageBase64 = (imageBase64 || '').startsWith('data:image/png;base64,');

  // GIF frame extraction
  const gifFile = fixture(
    'pixel.gif',
    Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  );
  await go(page, 'ext.app.misc.image-gif-extractor');
  await uploadFile(page, gifFile);
  checks.gifFrames = await page.evaluate(
    () =>
      [...document.querySelectorAll('.v-image__image')].filter((el) =>
        (el.getAttribute('style') || '').includes('data:image/')
      ).length >= 1
  );

  // Route sweep: every extension view must render without throwing.
  const routeErrorsBefore = errors.length;
  for (const item of manifest.items) {
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, `#/extensions/${item.name}`);
    await wait(180);

    const rendered = await page.evaluate(() => !!document.querySelector('.v-application'));
    if (!rendered) errors.push('[route] failed to render ' + item.name);
  }
  checks.routesVisited = manifest.items.length;
  checks.routeErrors = errors.length - routeErrorsBefore;

  await page.screenshot({ path: 'smoke-final.png' });

  console.log('CHECKS:', JSON.stringify(checks, null, 2));
  console.log('ERRORS:', errors.length);
  errors.slice(0, 30).forEach((e) => console.log('  ' + e));
  console.log('WARNINGS:', warnings.length);
  warnings.slice(0, 10).forEach((w) => console.log('  ' + w));

  await browser.close();

  const failed = Object.entries(checks).filter(([key, value]) => {
    if (key === 'navGroups') return value < 6;
    if (key === 'routesVisited') return value !== manifest.items.length;
    if (key === 'routeErrors') return value !== 0;
    return value !== true;
  });

  if (failed.length || errors.length) {
    console.error('FAILED:', failed.map(([key]) => key).join(', '));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
