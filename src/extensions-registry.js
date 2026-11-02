/**
 * Browser-side replacement for the Electron IPC extension registry.
 *
 * webpack's require.context makes every view and controller part of the
 * build, so the app keeps the original extension structure without needing
 * filesystem access at runtime.
 */
import Vue from 'vue';

const viewContext = require.context('../extensions', true, /\/view\.component\.js$/);
const controllerContext = require.context('../extensions', true, /\/controllers\/[^/]+\.js$/);

function normalize(moduleExports) {
  if (
    moduleExports &&
    moduleExports.__esModule &&
    Object.prototype.hasOwnProperty.call(moduleExports, 'default')
  ) {
    return moduleExports.default;
  }
  return moduleExports;
}

const views = {};
viewContext.keys().forEach((key) => {
  const match = key.match(/^\.\/(.+)\/view\.component\.js$/);
  if (match) {
    views[match[1]] = normalize(viewContext(key));
  }
});

const controllers = {};
controllerContext.keys().forEach((key) => {
  const file = key.split('/').pop();
  const id = file.replace(/\.js$/, '');
  controllers[id] = normalize(controllerContext(key));
});

export function getView(name) {
  return views[name];
}

export function getController(name) {
  return controllers[name];
}

export function hasController(name) {
  return typeof controllers[name] === 'function';
}

export function getControllerIds() {
  return Object.keys(controllers);
}

// Test-only hook: expose the registry when the page is opened with
// ?__test=1. It lets the Puppeteer suite exercise every controller directly.
if (
  typeof window !== 'undefined' &&
  /(?:^|[?&])__test=1(?:&|$)/.test(window.location.search)
) {
  window.__CAPTF_TEST__ = {
    controllers,
    views,
    getController,
    getView,
    getControllerIds,
  };
}

/**
 * Fallback component for an extension that has no view in this build.
 */
export const MissingView = Vue.extend({
  name: 'missing-view',
  render(h) {
    return h(
      'v-container',
      { class: 'pa-6' },
      [
        h('v-alert', { props: { type: 'info', text: true } }, [
          'This extension does not provide a browser view.',
        ]),
      ]
    );
  },
});
