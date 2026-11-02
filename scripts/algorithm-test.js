/* eslint-disable no-console */
/**
 * Full algorithm regression test.
 *
 * Runs every extension controller in the browser and checks:
 *  - encode/decode pairs round-trip
 *  - hash / HMAC / CRC outputs against known vectors
 *  - file, image, QR, EXIF and RSA tools
 *
 * Usage:
 *   npm run build
 *   npm run preview
 *   BASE_URL=http://localhost:3000/ node scripts/algorithm-test.js
 */
const puppeteer = require('puppeteer-core');
const crc = require('crc');
const manifest = require('../src/generated/manifest.json');

const BASE = process.env.BASE_URL || 'http://localhost:5055/';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const GIF_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const TEXT_BASE64 = Buffer.from('hello world\n').toString('base64');

// Known vectors for input "hello" (HMAC key "secret").
const md5 = '5d41402abc4b2a76b9719d911017c592';
const sha1 = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d';
const sha224 = 'ea09ae9cc6768c50fcee903ed054556e5bfc8347907f12598aa24193';
const sha256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
const sha384 =
  '59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f';
const sha512 =
  '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043';
const ripemd160 = '108f07b8382412612c048d07d13f814118445acd';
const sm3 = 'becbbfaae6548b8bf0cfcad5a27183cd1be6093b1cceccc303d9c61d0a645268';
const hmacMd5 = 'bade63863c61ed0b3165806ecd6acefc';
const sha3 =
  '52fa80662e64c128f8389c9ea6c73d4c02368004bf4463491900d11aaadca39d47de1b01361f207c512cfa79f0f92c3395c67ff7928e3f5ce3e3c852b392f976';
const md2 = 'a9046c73e00331af68917d3804f70655';
const md4 = '866437cb7a794bce2b727acc0362ee27';

// ---------------------------------------------------------------- specs ----

const CUSTOM_PAIRS = new Set([
  'ext.app.other.mime',
  'ext.app.other.image-base64',
  'ext.app.pki.rsa',
]);

const PAIR_OPTIONS = {
  'ext.app.classical.affine': { multKey: 5, addKey: 8 },
  'ext.app.classical.rail-fence': { number: 3 },
  'ext.app.classical.rot18': { enctype: 'rot18' },
  'ext.app.classical.rot47': { enctype: 'rot47' },
  'ext.app.classical.rot5': { enctype: 'rot5' },
  'ext.app.crypto.aes': { key: '12345678' },
  'ext.app.crypto.des': { key: '12345678' },
  'ext.app.crypto.triple-des': { key: '12345678' },
  'ext.app.crypto.rabbit': { key: '12345678' },
  'ext.app.crypto.rc4': { key: '12345678' },
  'ext.app.crypto.rc2': { key: '12345678' },
  'ext.app.crypto.blowfish': {
    key: '0123456789abcdef',
    iv: '01234567',
    mode: 'ECB',
    padding: 'PKCS5',
    outputMode: 'BASE64',
  },
};

const PAIR_INPUTS = {
  'ext.app.classical.rot5': '1234567890',
  'ext.app.classical.rot18': 'HELLO123',
  'ext.app.classical.rot47': 'Hello, World! 123',
  'ext.app.converter.ascii': 'Hello',
  'ext.app.converter.escape': 'Hello\nWorld!',
  'ext.app.converter.hex': 'Hello World 123',
  'ext.app.converter.html-entity': 'Hello <World> & "Test"',
  'ext.app.converter.morse-code': 'HELLO WORLD',
  'ext.app.converter.quoted-printable': 'Hello=World umlaut',
  'ext.app.converter.shellcode': 'Hello',
  'ext.app.converter.sql': "Hello'World",
  'ext.app.converter.tap-code': 'HELLO WORLD',
  'ext.app.converter.unicode': 'Hello World',
  'ext.app.converter.url': 'Hello World/?a=1&b=2',
  'ext.app.other.brainfuck': 'Hello',
  'ext.app.other.bubble-babble': 'hello',
  'ext.app.other.image-qrcode': 'hello-qr',
  'ext.app.other.ip-addressv4': '192.168.1.1',
  'ext.app.other.jother': 'abc',
  'ext.app.other.jsfuck': 'abc',
  'ext.app.other.punycode': 'münich.example',
  'ext.app.other.uuencode': 'Hello World',
  'ext.app.other.xxencode': 'Hello World',
};

const PAIR_NORMALIZE = {
  'ext.app.converter.morse-code': 'letters',
  'ext.app.converter.tap-code': 'letters',
  'ext.app.classical.rot5': 'digits',
};

const ONE_WAY = [
  { id: 'md5', controller: 'ext.app.crypto.md5.encode', input: 'hello', expect: md5 },
  { id: 'sha1', controller: 'ext.app.crypto.sha1.encode', input: 'hello', expect: sha1 },
  { id: 'sha224', controller: 'ext.app.crypto.sha224.encode', input: 'hello', expect: sha224 },
  { id: 'sha256', controller: 'ext.app.crypto.sha256.encode', input: 'hello', expect: sha256 },
  { id: 'sha384', controller: 'ext.app.crypto.sha384.encode', input: 'hello', expect: sha384 },
  { id: 'sha512', controller: 'ext.app.crypto.sha512.encode', input: 'hello', expect: sha512 },
  { id: 'sha3', controller: 'ext.app.crypto.sha3.encode', input: 'hello', expect: sha3 },
  { id: 'sm3', controller: 'ext.app.crypto.sm3.encode', input: 'hello', expect: sm3 },
  { id: 'ripemd160', controller: 'ext.app.crypto.ripe-md.encode', input: 'hello', expect: ripemd160 },
  { id: 'md2', controller: 'ext.app.crypto.md2.encode', input: 'hello', expect: md2 },
  { id: 'md4', controller: 'ext.app.crypto.md4.encode', input: 'hello', expect: md4 },
  {
    id: 'hmac-md5',
    controller: 'ext.app.crypto.hmac.encode',
    input: 'hello',
    options: { key: 'secret', digestMode: 'hmac-md5', outputMode: 'HEX' },
    expect: hmacMd5,
  },
  { id: 'crc8', controller: 'ext.app.other.crc8.encode', input: 'hello', expect: crc.crc8('hello').toString(16) },
  { id: 'crc16', controller: 'ext.app.other.crc16.encode', input: 'hello', expect: crc.crc16('hello').toString(16) },
  { id: 'crc32', controller: 'ext.app.other.crc32.encode', input: 'hello', expect: crc.crc32('hello').toString(16) },
  {
    id: 'mime-encode',
    controller: 'ext.app.other.mime.encode',
    input: 'index.html',
    expect: 'text/html',
  },
  {
    id: 'mime-decode',
    controller: 'ext.app.other.mime.decode',
    input: 'text/html',
    expect: 'html',
  },
  {
    id: 'file-hash-md5',
    controller: 'ext.app.misc.file-hash.get',
    inputKind: 'file',
    file: 'hello.txt',
    inputBase64: TEXT_BASE64,
    options: { algorithm: 'md5' },
    expect: '6f5902ac237024bdd0c176cb93063dc4',
  },
  {
    id: 'file-crc32',
    controller: 'ext.app.misc.file-crc32.get',
    inputKind: 'file',
    file: 'hello.txt',
    inputBase64: TEXT_BASE64,
    expect: crc.crc32('hello world\n'),
  },
  {
    id: 'file-type',
    controller: 'ext.app.misc.file-type.get',
    inputKind: 'file',
    file: 'pixel.png',
    inputBase64: PNG_BASE64,
    expectIncludes: 'ext: png',
  },
  {
    id: 'hash-identification',
    controller: 'ext.app.misc.hash-identification.get',
    input: md5,
    expectIncludes: 'MD5',
  },
  {
    id: 'image-exif',
    controller: 'ext.app.misc.image-exif.get',
    input: `data:image/png;base64,${PNG_BASE64}`,
    expectIncludes: 'ImageWidth',
  },
  {
    id: 'gif-extractor',
    controller: 'ext.app.misc.image-gif-extractor.get',
    inputKind: 'file',
    file: 'pixel.gif',
    inputBase64: GIF_BASE64,
    checkKind: 'gif',
  },
  {
    id: 'bcrypt',
    controller: 'ext.app.crypto.bcrypt.encode',
    input: 'hello',
    options: { rounds: 4 },
    checkKind: 'bcrypt',
  },
  {
    id: 'scrypt',
    controller: 'ext.app.crypto.scrypt.encode',
    input: 'hello',
    options: { salt: 'salt', iterations: 1024, memoryFactor: 8, parallelizationFactor: 1, keyLength: 64 },
    checkKind: 'scrypt',
  },
];

// Generate round-trip specs for every encode/decode pair.
const controllerOwner = new Map();
manifest.items.forEach((item) => {
  (item.controllers || []).forEach((id) => controllerOwner.set(id, item.name));
});

const byBase = new Map();
for (const id of controllerOwner.keys()) {
  const match = id.match(/^(.*)\.(encode|decode)$/);
  if (!match) continue;
  if (!byBase.has(match[1])) byBase.set(match[1], {});
  byBase.get(match[1])[match[2]] = id;
}

const defaultInput = (extension) => {
  if (extension.startsWith('ext.app.classical.')) return 'HELLOWORLD';
  if (extension.startsWith('ext.app.converter.')) return 'Hello World 123';
  if (extension.startsWith('ext.app.crypto.')) return 'Hello World 123';
  return 'Hello World';
};

const defaultNormalize = (extension) => (extension.startsWith('ext.app.classical.') ? 'letters' : 'none');

const ROUND_TRIPS = [];
for (const [base, pair] of byBase.entries()) {
  if (!pair.encode || !pair.decode) continue;
  if (CUSTOM_PAIRS.has(base)) continue;

  const extension = controllerOwner.get(pair.encode);
  ROUND_TRIPS.push({
    id: base,
    kind: 'roundtrip',
    encode: pair.encode,
    decode: pair.decode,
    extension,
    input: PAIR_INPUTS[base] || defaultInput(extension),
    options: PAIR_OPTIONS[base] || {},
    normalize: PAIR_NORMALIZE[base] || defaultNormalize(extension),
  });
}

const CUSTOM = [
  {
    id: 'image-base64',
    kind: 'image-base64',
    encode: 'ext.app.other.image-base64.encode',
    decode: 'ext.app.other.image-base64.decode',
    inputBase64: PNG_BASE64,
    file: 'pixel.png',
  },
  {
    id: 'pki-rsa',
    kind: 'rsa',
    generate: 'ext.app.pki.rsa-key.generate',
    encode: 'ext.app.pki.rsa.encode',
    decode: 'ext.app.pki.rsa.decode',
    input: 'Hello RSA',
  },
];

const specs = [
  ...ROUND_TRIPS.map((spec) => ({ ...spec, kind: 'roundtrip' })),
  ...ONE_WAY.map((spec) => ({ ...spec, kind: 'oneway' })),
  ...CUSTOM,
];

// Coverage check: every controller in the manifest must be exercised.
const used = new Set();
ROUND_TRIPS.forEach((s) => {
  used.add(s.encode);
  used.add(s.decode);
});
ONE_WAY.forEach((s) => used.add(s.controller));
CUSTOM.forEach((s) => {
  if (s.encode) used.add(s.encode);
  if (s.decode) used.add(s.decode);
  if (s.generate) used.add(s.generate);
});
const allControllers = [...controllerOwner.keys()];
const uncovered = allControllers.filter((id) => !used.has(id));

// ---------------------------------------------------------------- runner ---

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 300000,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.goto(`${BASE}?__test=1#/extensions/ext.app.home`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await page.waitForFunction(() => !!window.__CAPTF_TEST__, { timeout: 30000 });

  const runSpecInPage = (spec) => {
    const { getController, getView } = window.__CAPTF_TEST__;
    const mockContext = {
      $t: (key) => key,
      $store: { dispatch() {}, getters: {} },
      $vuetify: { theme: { dark: false } },
    };

    const b64ToBytes = (base64) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    const normalize = (value, mode) => {
      const text = value == null ? '' : String(value);
      if (mode === 'letters') return text.toUpperCase().replace(/[^A-Z]/g, '');
      if (mode === 'digits') return text.replace(/[^0-9]/g, '');
      if (mode === 'upper') return text.toUpperCase();
      if (mode === 'lower') return text.toLowerCase();
      return text;
    };

    const buildOptions = (spec) => {
      let options = {};
      const viewName = spec.extension;
      if (viewName) {
        try {
          const view = getView(viewName);
          const data = view && typeof view.data === 'function' ? view.data.call(mockContext) : null;
          if (data && data.options && data.options.value) {
            options = JSON.parse(JSON.stringify(data.options.value));
          }
        } catch (err) {
          // Views without options are fine.
        }
      }
      return Object.assign(options, spec.options || {});
    };

    const materialize = (spec) => {
      if (spec.inputKind === 'file') {
        const bytes = b64ToBytes(spec.inputBase64);
        return { file: spec.file, size: bytes.length, data: bytes };
      }
      return spec.input;
    };

    const run = async (spec) => {
      if (spec.kind === 'roundtrip') {
        const encode = getController(spec.encode);
        const decode = getController(spec.decode);
        if (!encode || !decode) return { id: spec.id, ok: false, error: 'controller missing' };

        const options = buildOptions(spec);
        const encoded = await encode(spec.input, options);
        if (!encoded || !encoded.success) {
          return { id: spec.id, ok: false, stage: 'encode', result: encoded };
        }
        const decoded = await decode(encoded.output, options);
        if (!decoded || !decoded.success) {
          return { id: spec.id, ok: false, stage: 'decode', encoded: encoded.output, result: decoded };
        }

        const got = normalize(decoded.output, spec.normalize);
        const want = normalize(spec.input, spec.normalize);
        return {
          id: spec.id,
          ok: got === want,
          stage: 'roundtrip',
          input: spec.input,
          encoded: encoded.output,
          decoded: decoded.output,
          expected: want,
          got,
        };
      }

      if (spec.kind === 'oneway') {
        const controller = getController(spec.controller);
        if (!controller) return { id: spec.id, ok: false, error: 'controller missing' };

        const result = await controller(materialize(spec), spec.options || {});
        if (!result || !result.success) return { id: spec.id, ok: false, result };

        const output = result.output;
        let ok = true;
        let detail = output;

        if (spec.checkKind === 'bcrypt') {
          ok = typeof output === 'string' && output.startsWith('$2') && output.length === 60;
        } else if (spec.checkKind === 'scrypt') {
          ok = typeof output === 'string' && /^[0-9a-f]{128}$/i.test(output);
        } else if (spec.checkKind === 'gif') {
          ok = Array.isArray(output) && output.length >= 1 && /^data:image\//.test(output[0]);
          detail = Array.isArray(output) ? output.length + ' frame(s)' : output;
        } else if (spec.expectIncludes !== undefined) {
          ok = String(output).includes(spec.expectIncludes);
        } else if (spec.expect !== undefined) {
          ok = output === spec.expect;
        }

        return { id: spec.id, ok, expected: spec.expect ?? spec.expectIncludes ?? spec.checkKind, output: detail };
      }

      if (spec.kind === 'image-base64') {
        const encode = getController(spec.encode);
        const decode = getController(spec.decode);
        const bytes = b64ToBytes(spec.inputBase64);
        const encoded = await encode({ file: spec.file, size: bytes.length, data: bytes }, {});
        if (!encoded || !encoded.success) return { id: spec.id, ok: false, stage: 'encode', result: encoded };

        const decoded = await decode(encoded.output, {});
        if (!decoded || !decoded.success) return { id: spec.id, ok: false, stage: 'decode', result: decoded };

        const out = decoded.output;
        const sameLength = out && out.data && out.data.length === bytes.length;
        let sameBytes = sameLength;
        if (sameLength) {
          for (let i = 0; i < bytes.length; i++) {
            if (out.data[i] !== bytes[i]) {
              sameBytes = false;
              break;
            }
          }
        }
        return {
          id: spec.id,
          ok: !!(out && out.extension === 'png' && out.mime === 'image/png' && sameBytes),
          extension: out && out.extension,
          mime: out && out.mime,
        };
      }

      if (spec.kind === 'rsa') {
        const generate = getController(spec.generate);
        const encode = getController(spec.encode);
        const decode = getController(spec.decode);

        const keys = await generate('', {});
        if (!keys || !keys.success) return { id: spec.id, ok: false, stage: 'generate', result: keys };

        const encoded = await encode(spec.input, {
          key: keys.output.publicKey,
          keyKind: 'PUBLIC',
        });
        if (!encoded || !encoded.success || !encoded.output) {
          return { id: spec.id, ok: false, stage: 'encode', result: encoded };
        }

        const decoded = await decode(encoded.output, {
          key: keys.output.privateKey,
          keyKind: 'PRIVATE',
        });
        return {
          id: spec.id,
          ok: !!(decoded && decoded.success && decoded.output === spec.input),
          decoded: decoded && decoded.output,
        };
      }

      return { id: spec.id, ok: false, error: 'unknown spec kind' };
    };

    return run(spec);
  };

  const results = [];
  for (const spec of specs) {
    const started = Date.now();
    try {
      const result = await page.evaluate(runSpecInPage, spec);
      results.push(result);
      console.log(
        `[${results.length}/${specs.length}] ${result.ok ? 'PASS' : 'FAIL'} ${spec.id} (${Date.now() - started}ms)`
      );
    } catch (err) {
      results.push({ id: spec.id, ok: false, error: err.message || String(err) });
      console.log(
        `[${results.length}/${specs.length}] FAIL ${spec.id} (${Date.now() - started}ms) ${err.message}`
      );
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log(`Total specs: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Controllers covered: ${used.size}/${allControllers.length}`);
  if (uncovered.length) {
    console.log('Uncovered controllers:');
    uncovered.forEach((id) => console.log('  - ' + id));
  }

  if (failed.length) {
    console.log('\nFailures:');
    failed.forEach((r) => {
      console.log('  - ' + r.id + ': ' + JSON.stringify(r));
    });
    process.exitCode = 1;
  }

  if (uncovered.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
