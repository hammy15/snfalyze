const fs = require('fs');
const path = require('path');

// Create a VIBRANT, eye-catching SNFalyze icon with more POP
const generateVibrantSVG = (size) => {
  const cornerRadius = size * 0.22;
  const center = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Vibrant gradient - deeper to bright electric teal -->
    <linearGradient id="bg${size}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#047857"/>
      <stop offset="40%" style="stop-color:#0D9488"/>
      <stop offset="100%" style="stop-color:#14B8A6"/>
    </linearGradient>

    <!-- Hot accent gradient - bright cyan/mint -->
    <linearGradient id="accent${size}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2DD4BF"/>
      <stop offset="100%" style="stop-color:#5EEAD4"/>
    </linearGradient>

    <!-- Golden accent for highlights -->
    <linearGradient id="gold${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FCD34D"/>
      <stop offset="100%" style="stop-color:#FBBF24"/>
    </linearGradient>

    <!-- Glow filter -->
    <filter id="glow${size}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Strong drop shadow -->
    <filter id="shadow${size}" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="${size * 0.015}" stdDeviation="${size * 0.02}" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background with vibrant gradient -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg${size})"/>

  <!-- Bright glow accent in top right -->
  <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.35}" fill="url(#accent${size})" opacity="0.25"/>

  <!-- Small bright accent bottom left -->
  <circle cx="${size * 0.2}" cy="${size * 0.85}" r="${size * 0.15}" fill="url(#accent${size})" opacity="0.2"/>

  <!-- Main icon group -->
  <g transform="translate(${size * 0.15}, ${size * 0.15})" filter="url(#shadow${size})">

    <!-- Building - BOLDER, more prominent -->
    <g>
      <rect
        x="0"
        y="${size * 0.20}"
        width="${size * 0.26}"
        height="${size * 0.50}"
        rx="${size * 0.03}"
        fill="white"
      />
      <!-- Windows - 2x3 grid -->
      <rect x="${size * 0.04}" y="${size * 0.26}" width="${size * 0.06}" height="${size * 0.08}" rx="${size * 0.01}" fill="url(#bg${size})"/>
      <rect x="${size * 0.14}" y="${size * 0.26}" width="${size * 0.06}" height="${size * 0.08}" rx="${size * 0.01}" fill="url(#bg${size})"/>
      <rect x="${size * 0.04}" y="${size * 0.38}" width="${size * 0.06}" height="${size * 0.08}" rx="${size * 0.01}" fill="url(#bg${size})"/>
      <rect x="${size * 0.14}" y="${size * 0.38}" width="${size * 0.06}" height="${size * 0.08}" rx="${size * 0.01}" fill="url(#bg${size})"/>
      <rect x="${size * 0.04}" y="${size * 0.50}" width="${size * 0.06}" height="${size * 0.08}" rx="${size * 0.01}" fill="url(#bg${size})"/>
      <rect x="${size * 0.14}" y="${size * 0.50}" width="${size * 0.06}" height="${size * 0.08}" rx="${size * 0.01}" fill="url(#bg${size})"/>
      <!-- Door -->
      <rect x="${size * 0.08}" y="${size * 0.58}" width="${size * 0.08}" height="${size * 0.12}" rx="${size * 0.015}" fill="url(#accent${size})"/>
    </g>

    <!-- Chart bars - BOLDER, ascending with gradient -->
    <rect
      x="${size * 0.32}"
      y="${size * 0.48}"
      width="${size * 0.12}"
      height="${size * 0.22}"
      rx="${size * 0.025}"
      fill="white"
      opacity="0.75"
    />
    <rect
      x="${size * 0.46}"
      y="${size * 0.32}"
      width="${size * 0.12}"
      height="${size * 0.38}"
      rx="${size * 0.025}"
      fill="white"
      opacity="0.9"
    />
    <rect
      x="${size * 0.60}"
      y="${size * 0.14}"
      width="${size * 0.12}"
      height="${size * 0.56}"
      rx="${size * 0.025}"
      fill="white"
    />

    <!-- Rising trend line - BOLDER, with glow -->
    <g filter="url(#glow${size})">
      <path
        d="M${size * 0.38},${size * 0.44}
           L${size * 0.52},${size * 0.28}
           L${size * 0.66},${size * 0.08}"
        stroke="url(#gold${size})"
        stroke-width="${size * 0.045}"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </g>

    <!-- Data points - bright with glow -->
    <circle cx="${size * 0.38}" cy="${size * 0.44}" r="${size * 0.028}" fill="white"/>
    <circle cx="${size * 0.52}" cy="${size * 0.28}" r="${size * 0.028}" fill="white"/>

    <!-- Top data point - GOLDEN highlight for emphasis -->
    <circle cx="${size * 0.66}" cy="${size * 0.08}" r="${size * 0.045}" fill="url(#gold${size})" filter="url(#glow${size})"/>
    <circle cx="${size * 0.66}" cy="${size * 0.08}" r="${size * 0.025}" fill="white"/>

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

// Generate vibrant icon SVGs
sizes.forEach(size => {
  const svg = generateVibrantSVG(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

// Generate Apple touch icon (180px)
const appleSvg = generateVibrantSVG(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
console.log('Generated: apple-touch-icon.svg');

console.log('\nAll vibrant icons generated! Now converting to PNG...');

// Convert to PNG using Sharp
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

    console.log('\n✨ All vibrant icons converted to PNG!');
  } catch (err) {
    console.error('Sharp error:', err.message);
  }
}

convertToPng();
