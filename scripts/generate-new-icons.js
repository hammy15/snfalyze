const fs = require('fs');
const path = require('path');

// Create a modern, distinctive SNFalyze icon
// Combines: Healthcare/Building + Analytics/Chart + Modern design
const generateModernSVG = (size) => {
  const padding = size * 0.12;
  const innerSize = size - (padding * 2);
  const cornerRadius = size * 0.22;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main gradient - deep teal to vibrant turquoise -->
    <linearGradient id="bgGrad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D9488"/>
      <stop offset="50%" style="stop-color:#14B8A6"/>
      <stop offset="100%" style="stop-color:#2DD4BF"/>
    </linearGradient>

    <!-- Subtle inner shadow -->
    <filter id="innerGlow${size}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Drop shadow for depth -->
    <filter id="shadow${size}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.015}" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background rounded square -->
  <rect
    x="0" y="0"
    width="${size}" height="${size}"
    rx="${cornerRadius}"
    fill="url(#bgGrad${size})"
  />

  <!-- Subtle pattern overlay for texture -->
  <rect
    x="0" y="0"
    width="${size}" height="${size}"
    rx="${cornerRadius}"
    fill="url(#bgGrad${size})"
    opacity="0.1"
  />

  <!-- Main icon group - centered -->
  <g transform="translate(${padding}, ${padding})" filter="url(#shadow${size})">

    <!-- Stylized "S" shape made from bars (representing both SNF and analytics) -->
    <g transform="translate(${innerSize * 0.15}, ${innerSize * 0.12})">
      <!-- Top horizontal bar -->
      <rect
        x="0"
        y="0"
        width="${innerSize * 0.55}"
        height="${innerSize * 0.13}"
        rx="${innerSize * 0.04}"
        fill="white"
        opacity="0.95"
      />

      <!-- Middle connector (diagonal feel) -->
      <rect
        x="${innerSize * 0.08}"
        y="${innerSize * 0.18}"
        width="${innerSize * 0.13}"
        height="${innerSize * 0.35}"
        rx="${innerSize * 0.04}"
        fill="white"
        opacity="0.95"
      />

      <!-- Middle horizontal bar -->
      <rect
        x="${innerSize * 0.08}"
        y="${innerSize * 0.33}"
        width="${innerSize * 0.55}"
        height="${innerSize * 0.13}"
        rx="${innerSize * 0.04}"
        fill="white"
        opacity="0.95"
      />

      <!-- Bottom connector -->
      <rect
        x="${innerSize * 0.50}"
        y="${innerSize * 0.33}"
        width="${innerSize * 0.13}"
        height="${innerSize * 0.35}"
        rx="${innerSize * 0.04}"
        fill="white"
        opacity="0.95"
      />

      <!-- Bottom horizontal bar -->
      <rect
        x="${innerSize * 0.15}"
        y="${innerSize * 0.55}"
        width="${innerSize * 0.55}"
        height="${innerSize * 0.13}"
        rx="${innerSize * 0.04}"
        fill="white"
        opacity="0.95"
      />
    </g>

    <!-- Rising chart line overlay (analytics indicator) -->
    <g transform="translate(${innerSize * 0.45}, ${innerSize * 0.15})">
      <path
        d="M0,${innerSize * 0.45}
           Q${innerSize * 0.1},${innerSize * 0.35} ${innerSize * 0.2},${innerSize * 0.25}
           Q${innerSize * 0.3},${innerSize * 0.15} ${innerSize * 0.4},${innerSize * 0.05}"
        stroke="white"
        stroke-width="${innerSize * 0.045}"
        stroke-linecap="round"
        fill="none"
        opacity="0.9"
      />

      <!-- Arrow head -->
      <polygon
        points="${innerSize * 0.35},${innerSize * 0.12} ${innerSize * 0.45},0 ${innerSize * 0.48},${innerSize * 0.15}"
        fill="white"
        opacity="0.9"
      />
    </g>

  </g>
</svg>`;
};

// Alternative: Cleaner building + chart icon
const generateCleanSVG = (size) => {
  const cornerRadius = size * 0.22;
  const center = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D9488"/>
      <stop offset="100%" style="stop-color:#14B8A6"/>
    </linearGradient>
    <linearGradient id="accent${size}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#5EEAD4"/>
      <stop offset="100%" style="stop-color:#99F6E4"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg${size})"/>

  <!-- Subtle glow in corner -->
  <circle cx="${size * 0.8}" cy="${size * 0.2}" r="${size * 0.3}" fill="url(#accent${size})" opacity="0.15"/>

  <!-- Icon group -->
  <g transform="translate(${size * 0.18}, ${size * 0.18})">
    <!-- Building silhouette (simplified) -->
    <rect x="0" y="${size * 0.22}" width="${size * 0.22}" height="${size * 0.42}" rx="${size * 0.02}" fill="white" opacity="0.9"/>
    <rect x="${size * 0.07}" y="${size * 0.28}" width="${size * 0.04}" height="${size * 0.06}" fill="url(#bg${size})"/>
    <rect x="${size * 0.07}" y="${size * 0.38}" width="${size * 0.04}" height="${size * 0.06}" fill="url(#bg${size})"/>
    <rect x="${size * 0.14}" y="${size * 0.28}" width="${size * 0.04}" height="${size * 0.06}" fill="url(#bg${size})"/>
    <rect x="${size * 0.14}" y="${size * 0.38}" width="${size * 0.04}" height="${size * 0.06}" fill="url(#bg${size})"/>

    <!-- Chart bars (ascending) -->
    <rect x="${size * 0.28}" y="${size * 0.44}" width="${size * 0.1}" height="${size * 0.2}" rx="${size * 0.02}" fill="white" opacity="0.7"/>
    <rect x="${size * 0.40}" y="${size * 0.32}" width="${size * 0.1}" height="${size * 0.32}" rx="${size * 0.02}" fill="white" opacity="0.85"/>
    <rect x="${size * 0.52}" y="${size * 0.18}" width="${size * 0.1}" height="${size * 0.46}" rx="${size * 0.02}" fill="white" opacity="1"/>

    <!-- Trend line -->
    <path
      d="M${size * 0.33},${size * 0.40} L${size * 0.45},${size * 0.28} L${size * 0.57},${size * 0.12}"
      stroke="url(#accent${size})"
      stroke-width="${size * 0.035}"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Data point dots -->
    <circle cx="${size * 0.33}" cy="${size * 0.40}" r="${size * 0.025}" fill="white"/>
    <circle cx="${size * 0.45}" cy="${size * 0.28}" r="${size * 0.025}" fill="white"/>
    <circle cx="${size * 0.57}" cy="${size * 0.12}" r="${size * 0.035}" fill="url(#accent${size})"/>
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

// Generate clean icon SVGs (this looks better)
sizes.forEach(size => {
  const svg = generateCleanSVG(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

// Generate Apple touch icon (180px)
const appleSvg = generateCleanSVG(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
console.log('Generated: apple-touch-icon.svg');

// Generate favicon SVG (use at smaller size)
const faviconSvg = generateCleanSVG(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
console.log('Generated: favicon.svg');

console.log('\nAll new icons generated! Now converting to PNG...');

// Convert to PNG using Sharp if available
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

    console.log('\nAll icons converted to PNG!');
  } catch (err) {
    console.error('Sharp not available or error:', err.message);
    console.log('Please install sharp: npm install sharp');
  }
}

convertToPng();
