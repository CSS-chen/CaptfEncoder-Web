const defaultValue = require('../../ext.common/default-value');
const { strToUint8Array } = require('../../ext.common/string');

module.exports = async function (input, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            let output = '';

            if (input && input.length > 0) {
                const encoding = defaultValue(options.encoding, 'utf8');
                const uint8array = strToUint8Array(input, encoding);

                // Standard SQL hex literal: two hex digits per byte.
                const hex = Array.from(uint8array)
                    .map((value) => value.toString(16).padStart(2, '0'))
                    .join('');

                output = '0x' + hex;
            }

            return resolve({
                success: true,
                output: output,
            });
        }
        catch (err) {
            return resolve({
                success: false,
                output: '',
                message: err.message
            });
        }
    });
};
