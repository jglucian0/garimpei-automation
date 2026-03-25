const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageService {
  static async applyWatermark(inputPath) {
    try {
      const logoPath = path.resolve(__dirname, '../assets/watermark.png');
      const image = sharp(inputPath).rotate();
      const { width, height } = await image.metadata();

      const isLandscape = width > height;

      let logoWidth = Math.round(width * 0.18);
      if (isLandscape) logoWidth = Math.round(logoWidth * 0.72);

      const logo = await sharp(logoPath)
        .resize({ width: logoWidth })
        .png()
        .toBuffer();

      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_wm.jpg`);

      await image
        .composite([
          {
            input: logo,
            left: Math.round(width * 0.05),
            top: 0
          }
        ])
        .jpeg({ quality: 92 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error('Error when applying watermark.', { cause: error });
    }
  }
}

module.exports = ImageService;