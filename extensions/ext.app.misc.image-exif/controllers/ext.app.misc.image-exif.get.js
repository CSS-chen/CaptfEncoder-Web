const exifr = require('exifr');

/**
 * Browser replacement for the Jimp based EXIF reader.
 * The input is a data URL produced by the image-base64 encoder.
 */
module.exports = async function (input, options = {}) {
    try {
        let output = '';

        if (input) {
            const bytes = dataUrlToBytes(input);

            if (!bytes) {
                throw new Error('Invalid image data');
            }

            const exif = await exifr.parse(bytes);
            output = JSON.stringify(exif || {}, null, 4);
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

function dataUrlToBytes(value) {
    const match = String(value).match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
        return null;
    }

    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}
