const jsQR = require('jsqr');

/**
 * Browser replacement for qrcode-reader + Jimp.
 * The input is a data URL; the image is drawn to a canvas and decoded
 * with jsQR.
 */
module.exports = async function (input, options = {}) {
    try {
        let output = '';

        if (input && input.length > 0) {
            output = await decodeDataUrl(input);
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

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to load image'));
        image.src = src;
    });
}

async function decodeDataUrl(src) {
    const image = await loadImage(src);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const result = jsQR(imageData.data, width, height);

    if (!result) {
        throw new Error('QR code not found in image');
    }

    return result.data;
}
