const defaultValue = require('../../ext.common/default-value');
const { uint8ArrayToStr } = require('../../ext.common/string');

module.exports = async function (input, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            let output = '';

            if (input && input.length > 0) {
                const encoding = defaultValue(options.encoding, 'utf8');

                let hex = String(input).trim().toLowerCase();
                if (hex.startsWith('0x')) {
                    hex = hex.slice(2);
                }
                hex = hex.replace(/\s+/g, '');

                if (!/^[0-9a-f]*$/.test(hex)) {
                    throw new Error('Invalid hex string');
                }
                if (hex.length % 2 !== 0) {
                    throw new Error('Hex string length must be even');
                }

                const bytes = [];
                for (let i = 0; i < hex.length; i += 2) {
                    bytes.push(parseInt(hex.substr(i, 2), 16));
                }

                output = uint8ArrayToStr(new Uint8Array(bytes), encoding);
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
