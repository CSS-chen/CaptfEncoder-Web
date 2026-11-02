/**
 * Browser port of the original name_that_hash based controller.
 *
 * hashes.json was generated from the vendored name_that_hash prototype
 * table, so the identification rules are the same as the desktop version.
 */
const prototypes = require('../hashes.json');

module.exports = async function (input, options = {}) {
    try {
        let output = '';

        if (input && input.length > 0) {
            const value = String(input).trim();
            const matches = [];
            const seen = new Set();

            for (const prototype of prototypes) {
                let regex;

                try {
                    regex = new RegExp('^(?:' + prototype.regex + ')$', 'i');
                }
                catch (err) {
                    continue;
                }

                if (!regex.test(value)) {
                    continue;
                }

                for (const mode of prototype.modes) {
                    const key = mode.name + '|' + mode.hashcat;

                    if (seen.has(key)) {
                        continue;
                    }

                    seen.add(key);
                    matches.push(mode);
                }
            }

            output = matches
                .map((item) => `name: ${item.name}, hashcat: ${item.hashcat === null ? 'None' : item.hashcat}`)
                .join('\r\n');
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
