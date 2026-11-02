import manifest from '../generated/manifest.json';

const LS_LOCALE = 'captfencoder.locale';
const LS_THEME = 'captfencoder.theme';
const LS_THEME_DARK = 'captfencoder.theme.dark';

const navigatorLanguage = (
  (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) ||
  'en'
).substr(0, 2);

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (err) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    // localStorage may be unavailable (private mode); preferences simply
    // fall back to their defaults.
  }
}

const state = {
  locale: navigatorLanguage,
  theme: {},
  languages: {},
  themes: [],
};

const getters = {
  locale: (state) => state.locale,
  theme: (state) => state.theme,
  languages: (state) => state.languages,
  themes: (state) => state.themes,
};

const mutations = {
  setConfiguration(state, obj) {
    if (obj) {
      state.locale = obj.locale;
      state.theme = obj.ui.theme;
      state.languages = obj.languages;
      state.themes = obj.themes;
    }
  },

  setLocale(state, obj) {
    if (obj) {
      state.locale = obj;
    }
  },

  setTheme(state, obj) {
    if (obj) {
      state.theme.name = obj;
    }
  },

  setThemeDark(state, obj) {
    state.theme.dark = obj;
  },
};

const actions = {
  async loadConfiguration({ commit }) {
    const languages = manifest.languages || {};
    const themes = manifest.themes || [];
    const defaults = manifest.config || {};

    let locale = readStorage(LS_LOCALE, null);
    if (!locale || !languages[locale]) {
      locale = languages[navigatorLanguage] ? navigatorLanguage : defaults.locale || 'en';
    }
    if (!languages[locale] && Object.keys(languages).length) {
      locale = Object.keys(languages)[0];
    }

    const defaultTheme = defaults.theme || { name: 'Theme_1', dark: false };
    const themeName = readStorage(LS_THEME, defaultTheme.name) || defaultTheme.name;
    const themeDarkRaw = readStorage(LS_THEME_DARK, null);
    const themeDark = themeDarkRaw === null ? !!defaultTheme.dark : themeDarkRaw === 'true';

    commit('setConfiguration', {
      locale,
      ui: { theme: { name: themeName, dark: themeDark } },
      languages,
      themes,
    });
  },

  async setLocale({ commit }, obj) {
    if (obj) {
      writeStorage(LS_LOCALE, obj);
      commit('setLocale', obj);
    }
  },

  async setTheme({ commit }, obj) {
    if (obj) {
      writeStorage(LS_THEME, obj);
      commit('setTheme', obj);
    }
  },

  async setThemeDark({ commit }, obj) {
    writeStorage(LS_THEME_DARK, obj ? 'true' : 'false');
    commit('setThemeDark', !!obj);
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
