const fs = require('fs');
const path = require('path');

// SVG icon template - SNFalyze logo (chart icon with turquoise background)
const generateSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14B8A6"/>
      <stop offset="100%" style="stop-color:#0D9488"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size * 0.006})">
    <path d="M10 80 L10 20 L90 20" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M25 60 L40 45 L55 55 L75 30" stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="25" cy="60" r="4" fill="white"/>
    <circle cx="40" cy="45" r="4" fill="white"/>
    <circle cx="55" cy="55" r="4" fill="white"/>
    <circle cx="75" cy="30" r="4" fill="white"/>
  </g>
</svg>`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files (can be converted to PNG using other tools)
sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

// Generate Apple touch icon
const appleSvg = generateSVG(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
console.log('Generated: apple-touch-icon.svg');

// Generate shortcut icons
const shortcutSvg = generateSVG(96);
fs.writeFileSync(path.join(iconsDir, 'shortcut-new.svg'), shortcutSvg);
fs.writeFileSync(path.join(iconsDir, 'shortcut-deals.svg'), shortcutSvg);
fs.writeFileSync(path.join(iconsDir, 'shortcut-map.svg'), shortcutSvg);
console.log('Generated shortcut icons');

// Generate badge icon (smaller, simpler)
const badgeSvg = `
<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="36" fill="#14B8A6"/>
  <text x="36" y="44" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">S</text>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'badge-72x72.svg'), badgeSvg);
console.log('Generated: badge-72x72.svg');

console.log('\\nAll icons generated! Convert SVGs to PNGs using a tool like Inkscape, ImageMagick, or an online converter.');
