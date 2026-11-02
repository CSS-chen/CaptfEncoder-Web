const { fromBuffer } = require('file-type');

module.exports = async function (input, options = {}) {
    try {
        let output = '';

        if (input && input.data) {
            const data = Buffer.isBuffer(input.data)
                ? input.data
                : Buffer.from(input.data);

            // file-type v16 exposes an async fromBuffer() API.
            const result = await fromBuffer(data);

            if (result) {
                output = `ext: ${result.ext}\nmime: ${result.mime}`;
            }
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
