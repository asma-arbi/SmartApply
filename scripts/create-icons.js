// Run this script with: node scripts/create-icons.js
// Or open scripts/generate-icons.html in a browser and download the icons manually

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 4}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <path d="M ${size * 0.25} ${size * 0.188} A ${size * 0.125} ${size * 0.125} 0 0 1 ${size * 0.5} ${size * 0.188}" 
          stroke="white" stroke-width="${size * 0.047}" fill="none"/>
    <rect x="${size * 0.0625}" y="${size * 0.25}" width="${size * 0.375}" height="${size * 0.25}" fill="white"/>
    <circle cx="${size * 0.25}" cy="${size * 0.375}" r="${size * 0.03125}" fill="#2563eb"/>
    <rect x="${size * 0.234}" y="${size * 0.375}" width="${size * 0.03125}" height="${size * 0.0625}" fill="#2563eb"/>
  </g>
  <text x="${size / 2}" y="${size * 0.86}" font-family="Arial, sans-serif" font-size="${size * 0.16}" 
        font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">SA</text>
</svg>`;
}

// Save SVG files
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create SVG icons
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createSVGIcon(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createSVGIcon(512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), createSVGIcon(180));

console.log('✅ SVG icons created successfully!');
console.log('📝 Note: For better browser support, convert these to PNG:');
console.log('   1. Open scripts/generate-icons.html in a browser');
console.log('   2. Click "Download All Icons"');
console.log('   3. Move the downloaded PNG files to the public/ directory');
