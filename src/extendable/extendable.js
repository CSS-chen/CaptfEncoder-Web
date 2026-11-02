import ExtEncoder from './componets/ExtEncoder';
import ExtForm from './componets/ExtForm';
import ExtTab from './componets/ExtTab';
import ExtTabEncoder from './componets/ExtTabEncoder';
import ExtEditor from './componets/ExtEditor';
import ExtLoading from './componets/ExtLoading';

import { getController } from '../extensions-registry';

const ExtendablePlugin = {
  install(Vue, options) {
    /**
     * Invoke an extension controller in the browser.
     *
     * The original implementation forwarded this call to the Electron main
     * process through ipcRenderer.invoke. Controllers keep their original
     * (input, options) -> { success, output, message } contract.
     */
    Vue.prototype.$extInvoke = async function (handler, input = '', options = {}) {
      const controller = getController(handler);

      if (typeof controller !== 'function') {
        return {
          success: false,
          output: '',
          message: `Extension controller not found: ${handler}`,
        };
      }

      try {
        return await controller(input, options);
      } catch (err) {
        return {
          success: false,
          output: '',
          message: err && err.message ? err.message : String(err),
        };
      }
    };

    Vue.component('ext-form', ExtForm);
    Vue.component('ext-tab', ExtTab);
    Vue.component('ext-tab-encoder', ExtTabEncoder);
    Vue.component('ext-loading', ExtLoading);
    Vue.component('ext-editor', ExtEditor);
  },
};

export default ExtendablePlugin;
