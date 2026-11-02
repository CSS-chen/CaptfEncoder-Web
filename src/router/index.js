import Vue from 'vue';
import Router from 'vue-router';

import { getView, MissingView } from '../extensions-registry';

Vue.use(Router);

const homeRoute = {
  name: 'ext.app.home',
  path: '/extensions/ext.app.home',
  title: 'Home',
};

const router = new Router({
  mode: 'hash',
  isAdd: false,
  routes: [],
});

router.beforeEach((to, from, next) => {
  if (router.options.isAdd) {
    next();
    return;
  }

  router.app.$store
    .dispatch('loadExtensions')
    .then(() => {
      const routes = filterAsyncRoutes(router.app.$store.getters.extensions);

      router.addRoutes(routes);
      router.options.isAdd = true;

      next({ ...to, replace: true });
    })
    .catch((err) => {
      // Avoid a blank screen if the manifest fails to load.
      console.error('Failed to load extensions', err);
      next();
    });
});

function filterAsyncRoutes(extensions) {
  const routes = [];
  let existHome = false;

  if (extensions && extensions.items && extensions.items.length > 0) {
    extensions.items.forEach((item) => {
      routes.push({
        name: item.name,
        path: item.path,
        component: loadComponent(item.name),
        meta: { title: item.title, titles: item.titles, catalog: item.catalog },
      });

      if (!existHome && item.name === homeRoute.name) {
        existHome = true;
      }
    });
  }

  if (existHome) {
    routes.unshift({
      path: '/',
      redirect: `/extensions/${homeRoute.name}/`,
    });
  }

  return routes;
}

function loadComponent(name) {
  return () => Promise.resolve(getView(name) || MissingView);
}

// Keep vue-router from surfacing redundant navigation errors to the console.
const originalPush = Router.prototype.push;
Router.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => err);
};

export default router;
