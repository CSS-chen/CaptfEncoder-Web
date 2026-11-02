import urlParse from 'url-parse';

/**
 * Browser replacement for the Electron command plugin.
 *
 * File dialogs, clipboard access and window controls are implemented with
 * standard Web APIs so the application can run as a static site (Vercel).
 */

function filtersToAccept(filters) {
  if (!Array.isArray(filters)) return undefined;

  const extensions = [];
  filters.forEach((filter) => {
    (filter.extensions || []).forEach((ext) => {
      if (!ext || ext === '*') return;
      extensions.push('.' + String(ext).replace(/^\./, ''));
    });
  });

  return extensions.length ? extensions.join(',') : undefined;
}

function pickFile(options = {}) {
  const { filters, readAs = 'arrayBuffer' } = options;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filtersToAccept(filters) || '';
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    input.style.top = '-10000px';

    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) {
        finish(null);
        return;
      }

      try {
        if (readAs === 'text') {
          finish({ file: file.name, size: file.size, data: await file.text() });
        } else {
          const data = new Uint8Array(await file.arrayBuffer());
          finish({ file: file.name, size: file.size, data });
        }
      } catch (err) {
        finish(null);
      }
    });

    input.addEventListener('cancel', () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}

function toBlob(data, mime) {
  if (data instanceof Blob) return data;
  if (typeof data === 'string') return new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
  if (data instanceof ArrayBuffer) return new Blob([new Uint8Array(data)], { type: mime });
  if (ArrayBuffer.isView(data)) {
    return new Blob([new Uint8Array(data.buffer, data.byteOffset, data.byteLength)], { type: mime });
  }
  // Buffer polyfill still exposes the Uint8Array API; handle it explicitly.
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
    return new Blob([new Uint8Array(data.data)], { type: mime });
  }
  return new Blob([data], { type: mime });
}

function download(data, filename, mime) {
  const blob = toBlob(data, mime);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function defaultExtension(filters, fallback) {
  if (Array.isArray(filters)) {
    for (const filter of filters) {
      const ext = filter.extensions && filter.extensions[0];
      if (ext && ext !== '*') return String(ext).replace(/^\./, '');
    }
  }
  return fallback;
}

function timestampName(extension) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `captfencoder-${stamp}.${extension || 'bin'}`;
}

const IMAGE_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

const CommandsPlugin = {
  install(Vue, options) {
    Vue.prototype.$createWindow = function (title, hash) {
      const base = window.location.origin + window.location.pathname;
      window.open(base + '#' + String(hash).replace(/^#/, ''), '_blank', 'noopener');
    };

    Vue.prototype.$minimizeWindow = async function () {
      return false;
    };

    Vue.prototype.$closeWindow = async function () {
      return false;
    };

    Vue.prototype.$openFile = async function (dialogTitle, dialogFilters) {
      return pickFile({ title: dialogTitle, filters: dialogFilters, readAs: 'arrayBuffer' });
    };

    Vue.prototype.$openTextFile = async function (dialogTitle, dialogFilters) {
      return pickFile({ title: dialogTitle, filters: dialogFilters, readAs: 'text' });
    };

    Vue.prototype.$openImageFile = async function (dialogTitle, dialogFilters) {
      const filters = dialogFilters || [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: 'All Files', extensions: ['*'] },
      ];
      return pickFile({ title: dialogTitle, filters, readAs: 'arrayBuffer' });
    };

    Vue.prototype.$saveFile = async function (data, dialogTitle, dialogFilters) {
      const extension = defaultExtension(dialogFilters, 'txt');
      download(data, timestampName(extension), 'application/octet-stream');
      return true;
    };

    Vue.prototype.$saveImageFile = async function (data, extension, dialogTitle) {
      const ext = (extension || 'png').toLowerCase();
      const mime = IMAGE_MIME[ext] || 'application/octet-stream';
      download(data, timestampName(ext), mime);
      return true;
    };

    Vue.prototype.$copyToClipboard = function (text) {
      const value = text == null ? '' : String(text);

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).catch(() => fallbackCopy(value));
      } else {
        fallbackCopy(value);
      }

      return true;
    };

    Vue.prototype.$pasteFromClipboard = async function () {
      if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
        try {
          return await navigator.clipboard.readText();
        } catch (err) {
          return '';
        }
      }
      return '';
    };

    Vue.prototype.$getExtensionsFolder = async function () {
      return '';
    };

    Vue.prototype.$openExternalUrl = function (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    Vue.prototype.$openExtensionsFolder = async function () {
      return false;
    };

    Vue.prototype.$initLocale = function () {
      const languages = this.$store.getters.languages;

      for (const key of Object.keys(languages)) {
        this.$i18n.setLocaleMessage(key, languages[key]);
      }

      this.$i18n.locale = this.$store.getters.locale;

      this.$setWindowLocaleTitle();
    };

    Vue.prototype.$setLocale = function (locale) {
      const languages = this.$store.getters.languages;

      if (languages[locale]) {
        this.$store.dispatch('setLocale', locale);
        this.$i18n.locale = locale;
        this.$setWindowLocaleTitle();
      }
    };

    Vue.prototype.$setTheme = function (name) {
      const theme = this.$store.getters.theme;
      const themes = this.$store.getters.themes;

      if (typeof name !== 'undefined' && name !== null) {
        this.$store.dispatch('setTheme', name);
      } else if (theme) {
        name = theme.name;
      }

      if (name && themes) {
        themes.some((item) => {
          if (item.name === name) {
            Object.keys(item.dark).forEach((i) => {
              this.$vuetify.theme.themes.dark[i] = item.dark[i];
            });
            Object.keys(item.light).forEach((i) => {
              this.$vuetify.theme.themes.light[i] = item.light[i];
            });
            return true;
          }
          return false;
        });
      }
    };

    Vue.prototype.$setThemeDark = function (dark) {
      const theme = this.$store.getters.theme;

      if (typeof dark !== 'undefined' && dark !== null) {
        this.$store.dispatch('setThemeDark', dark);
      } else if (theme) {
        dark = theme.dark;
      }

      this.$vuetify.theme.dark = !!dark;
    };

    Vue.prototype.$setWindowLocaleTitle = function () {
      document.title = this.$t('renderer.window.title');
    };

    Vue.prototype.$getItemLocaleTitle = function (item) {
      const locale = this.$store.getters.locale;

      if (item.titles && item.titles[locale]) {
        return item.titles[locale];
      }

      return item.title;
    };

    Vue.prototype.$checkUpdate = async function () {
      return { hasUpdate: false };
    };

    Vue.prototype.$sleep = function (time) {
      return new Promise((resolve) => setTimeout(() => resolve('over'), time));
    };

    Vue.prototype.$urlParse = function (url) {
      return urlParse(url);
    };
  },
};

function fallbackCopy(value) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.left = '-10000px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  } catch (err) {
    // Ignore clipboard failures; the UI remains usable.
  }
}

export default CommandsPlugin;
