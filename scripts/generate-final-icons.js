const fs = require('fs');
const path = require('path');

// Create a BOLD, striking SNFalyze icon - clean and modern
const generateStrikingIcon = (size) => {
  const cornerRadius = size * 0.22;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Rich gradient background -->
    <linearGradient id="bg${size}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0F766E"/>
      <stop offset="50%" style="stop-color:#14B8A6"/>
      <stop offset="100%" style="stop-color:#2DD4BF"/>
    </linearGradient>

    <!-- Bright highlight -->
    <linearGradient id="highlight${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5EEAD4"/>
      <stop offset="100%" style="stop-color:#99F6E4"/>
    </linearGradient>

    <!-- Gold/amber for emphasis -->
    <linearGradient id="gold${size}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F59E0B"/>
      <stop offset="100%" style="stop-color:#FCD34D"/>
    </linearGradient>

    <!-- Glow effect -->
    <filter id="glow${size}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${size * 0.015}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Drop shadow -->
    <filter id="drop${size}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${size * 0.01}" stdDeviation="${size * 0.015}" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg${size})"/>

  <!-- Subtle shine in top-right -->
  <ellipse cx="${size * 0.72}" cy="${size * 0.28}" rx="${size * 0.28}" ry="${size * 0.25}" fill="url(#highlight${size})" opacity="0.2"/>

  <!-- Main content group -->
  <g transform="translate(${size * 0.14}, ${size * 0.14})" filter="url(#drop${size})">

    <!-- Stylized "S" made from 3 bars - represents SNF + growth -->

    <!-- Top bar -->
    <rect
      x="${size * 0.05}"
      y="${size * 0.05}"
      width="${size * 0.45}"
      height="${size * 0.12}"
      rx="${size * 0.04}"
      fill="white"
    />

    <!-- Middle bar (offset) -->
    <rect
      x="${size * 0.18}"
      y="${size * 0.28}"
      width="${size * 0.45}"
      height="${size * 0.12}"
      rx="${size * 0.04}"
      fill="white"
      opacity="0.9"
    />

    <!-- Bottom bar -->
    <rect
      x="${size * 0.05}"
      y="${size * 0.51}"
      width="${size * 0.45}"
      height="${size * 0.12}"
      rx="${size * 0.04}"
      fill="white"
      opacity="0.8"
    />

    <!-- Connecting diagonal lines (growth indicator) -->
    <line
      x1="${size * 0.50}"
      y1="${size * 0.11}"
      x2="${size * 0.18}"
      y2="${size * 0.34}"
      stroke="url(#gold${size})"
      stroke-width="${size * 0.03}"
      stroke-linecap="round"
      filter="url(#glow${size})"
    />
    <line
      x1="${size * 0.63}"
      y1="${size * 0.34}"
      x2="${size * 0.50}"
      y2="${size * 0.57}"
      stroke="url(#gold${size})"
      stroke-width="${size * 0.03}"
      stroke-linecap="round"
      filter="url(#glow${size})"
    />

    <!-- Upward arrow (growth/success) -->
    <g transform="translate(${size * 0.52}, ${size * 0.02})" filter="url(#glow${size})">
      <path
        d="M${size * 0.09},${size * 0.20}
           L${size * 0.09},${size * 0.05}
           L${size * 0.02},${size * 0.12}
           M${size * 0.09},${size * 0.05}
           L${size * 0.16},${size * 0.12}"
        stroke="url(#gold${size})"
        stroke-width="${size * 0.035}"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </g>

  </g>
</svg>`;
};

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
sizes.forEach(size => {
  const svg = generateStrikingIcon(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

// Apple touch icon (180px)
const appleSvg = generateStrikingIcon(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
console.log('Generated: apple-touch-icon.svg');

console.log('\nConverting to PNG...');

// Convert to PNG
async function convertToPng() {
  try {
    const sharp = require('sharp');

    for (const size of sizes) {
      const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`Converted: icon-${size}x${size}.png`);
    }

    // Apple touch icon
    await sharp(path.join(iconsDir, 'apple-touch-icon.svg'))
      .resize(180, 180)
      .png()
      .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
    console.log('Converted: apple-touch-icon.png');

    console.log('\n✨ All icons ready!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

convertToPng();
