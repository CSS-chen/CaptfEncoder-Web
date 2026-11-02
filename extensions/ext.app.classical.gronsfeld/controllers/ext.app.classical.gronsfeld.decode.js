const defaultValue = require('../../ext.common/default-value');

/**
 * Gronsfeld cipher, previously implemented in Python (pycipher).
 * Equivalent to a Vigenere cipher whose key is a sequence of digits.
 */
module.exports = async function (input, options = {}) {
    let output = '';

    if (input && input.length > 0) {
        try {
            const ciphertext = input.toUpperCase().replace(/[^A-Z]/g, '');
            const key = parseKey(defaultValue(options.numericKey, ''));

            if (!key.length) {
                throw new Error('Numeric key is required');
            }

            output = transform(ciphertext, key, -1);
        }
        catch (err) {
            return {
                success: false,
                output: '',
                message: err.message
            };
        }
    }

    return {
        success: true,
        output: output,
    };
};

function parseKey(value) {
    return String(value)
        .replace(/[^0-9\s]/g, '')
        .split(/\s+/)
        .filter((item) => item.length > 0)
        .map((item) => parseInt(item, 10) % 26);
}

function transform(text, key, direction) {
    let index = 0;

    return text.replace(/[A-Z]/g, (ch) => {
        const shift = key[index % key.length] * direction;
        index++;
        return String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26 + 26) % 26 + 65);
    });
}
