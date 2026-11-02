const defaultValue = require('../../ext.common/default-value');

// hash-wasm provides MD5/SHA-1/SHA-2 hashing in the browser. WebCrypto
// does not expose MD5 or SHA-224, so a pure WASM implementation is used
// instead of the Node crypto module.
const { md5, sha1, sha224, sha256, sha384, sha512 } = require('hash-wasm');

const ALGORITHMS = {
    md5,
    sha1,
    sha224,
    sha256,
    sha384,
    sha512,
};

module.exports = async function (input, options = {}) {
    try {
        let output = '';

        if (input && input.data) {
            const algorithm = defaultValue(options.algorithm, 'md5');
            const hasher = ALGORITHMS[algorithm];

            if (!hasher) {
                throw new Error('Unsupported hash algorithm: ' + algorithm);
            }

            const data = input.data instanceof Uint8Array
                ? input.data
                : Uint8Array.from(input.data);

            output = await hasher(data);
        }

        return {
            success: true,
            output: output,
        };
    }
    catch (err) {
        return {
            success: false,
            output: '',
            message: err.message
        };
    }
};
