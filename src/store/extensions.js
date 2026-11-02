import manifest from '../generated/manifest.json';

const state = {
  extensions: {},
  navItems: [],
};

const getters = {
  extensions: (state) => state.extensions,
  navItems: (state) => state.navItems,
};

const mutations = {
  setExtensions(state, obj) {
    state.extensions = obj;
  },
  setNavItems(state, obj) {
    state.navItems = obj;
  },
};

const actions = {
  async loadExtensions({ commit }) {
    // Clone so repeated navigation (or HMR) does not mutate the manifest.
    const extensions = JSON.parse(JSON.stringify(manifest));
    const navItems = [];
    const catalogLocator = new Map();
    const catalogs = [];

    (extensions.catalogs || []).forEach((item) => {
      let index = catalogs.findIndex((i) => i.text === item.text);

      if (index < 0) {
        catalogs.push({ name: item.key, text: item.text });
        index = catalogs.length - 1;

        navItems.push({
          name: item.key,
          title: item.text,
          titles: item.text_lang,
          items: [],
        });
      }

      catalogLocator.set(item.key, index);
    });

    for (let i = 0; i < extensions.items.length; i++) {
      const item = extensions.items[i];

      item.title = item.description ? item.description : 'Untitled-' + (i + 1);

      if (item.description_lang) {
        item.titles = item.description_lang;
      }

      delete item.description;
      delete item.description_lang;

      if (item.catalog && catalogLocator.get(item.catalog) != null) {
        const newCatalogKey = catalogs[catalogLocator.get(item.catalog)].name;
        const newName = item.name.substring(item.name.lastIndexOf('.') + 1);
        item.path = `/extensions/${newCatalogKey}.${newName}`;
      } else {
        item.path = `/extensions/${item.name}`;
      }
    }

    commit('setExtensions', extensions);

    extensions.items.forEach((item) => {
      if (item.catalog && catalogLocator.get(item.catalog) != null) {
        navItems[catalogLocator.get(item.catalog)].items.push({
          name: item.name,
          title: item.title,
          titles: item.titles,
          path: item.path,
        });
      }
    });

    commit('setNavItems', navItems);
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
