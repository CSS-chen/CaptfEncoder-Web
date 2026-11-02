const omggif = require('omggif');

/**
 * Browser replacement for the Jimp based GIF frame extractor.
 * Each frame is rendered to a canvas and returned as a JPEG data URL.
 */
module.exports = async function (input, options = {}) {
    try {
        let output = null;

        if (input && input.data) {
            const bytes = input.data instanceof Uint8Array
                ? input.data
                : Uint8Array.from(input.data);

            const gifReader = new omggif.GifReader(bytes);
            const frameZero = gifReader.frameInfo(0);
            const width = frameZero.width;
            const height = frameZero.height;

            const result = [];

            for (let i = 0; i < gifReader.numFrames(); i++) {
                const imageBuffer = new Uint8ClampedArray(width * height * 4);
                gifReader.decodeAndBlitFrameRGBA(i, imageBuffer);

                result.push(frameToDataUrl(imageBuffer, width, height));
            }

            output = result;
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

function frameToDataUrl(data, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.92);
}
