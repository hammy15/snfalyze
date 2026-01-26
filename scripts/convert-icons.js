const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');

// Convert all SVG files to PNG
async function convertIcons() {
  const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));

  for (const file of files) {
    const svgPath = path.join(iconsDir, file);
    const pngPath = path.join(iconsDir, file.replace('.svg', '.png'));

    try {
      await sharp(svgPath)
        .png()
        .toFile(pngPath);
      console.log(`Converted: ${file} -> ${file.replace('.svg', '.png')}`);
    } catch (err) {
      console.error(`Error converting ${file}:`, err.message);
    }
  }

  console.log('\nAll icons converted to PNG!');
}

convertIcons();
