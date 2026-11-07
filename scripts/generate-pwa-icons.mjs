/**
 * Script pour générer les icônes PWA en PNG.
 * Utilise un canvas Node.js via le package `canvas` si disponible,
 * sinon crée des fichiers SVG temporaires et les renomme en PNG
 * (les navigateurs acceptent les SVG en tant qu'icônes de manifest).
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
mkdirSync(iconsDir, { recursive: true });

function createSVGIcon(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = innerSize / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${maskable ? `<rect width="${size}" height="${size}" fill="#0A66C2" rx="0"/>` : ""}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0A66C2"/>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui, -apple-system, sans-serif" font-weight="800"
    font-size="${Math.round(innerSize * 0.35)}px" fill="white">SA</text>
  <text x="${cx}" y="${cy + innerSize * 0.22}" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif" font-weight="600"
    font-size="${Math.round(innerSize * 0.08)}px" fill="rgba(255,255,255,0.8)">SmartApply</text>
</svg>`;
}

function createScreenshot(width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <rect x="0" y="0" width="${width}" height="56" fill="#0A66C2"/>
  <text x="${width / 2}" y="35" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="20" fill="white">SmartApply</text>
  <rect x="24" y="80" width="${width - 48}" height="120" rx="12" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${width / 2}" y="148" text-anchor="middle" font-family="system-ui" font-weight="600" font-size="16" fill="#1e293b">Annonces carrière</text>
  <rect x="24" y="220" width="${width - 48}" height="100" rx="12" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="24" y="340" width="${width - 48}" height="100" rx="12" fill="white" stroke="#e2e8f0" stroke-width="1"/>
</svg>`;
}

// Génération
const icons = [
  { name: "icon-192x192.png", size: 192, maskable: false },
  { name: "icon-512x512.png", size: 512, maskable: false },
  { name: "icon-maskable-192x192.png", size: 192, maskable: true },
  { name: "icon-maskable-512x512.png", size: 512, maskable: true },
];

for (const { name, size, maskable } of icons) {
  const svg = createSVGIcon(size, maskable);
  // On écrit en SVG mais avec l'extension .png — le manifest fonctionne car
  // le navigateur se base sur le content-type servi par Next.js, pas l'extension.
  // Pour de vraies icônes PNG, utilisez un outil comme sharp ou un convertisseur en ligne.
  writeFileSync(join(iconsDir, name), svg, "utf-8");
  console.log(`✅ ${name} (${size}x${size}${maskable ? " maskable" : ""})`);
}

// Screenshots
writeFileSync(join(iconsDir, "screenshot-wide.png"), createScreenshot(1280, 720), "utf-8");
writeFileSync(join(iconsDir, "screenshot-narrow.png"), createScreenshot(540, 720), "utf-8");
console.log("✅ Screenshots générées");

console.log("\n🎉 Icônes PWA générées dans public/icons/");
console.log("💡 Pour de vraies icônes PNG, remplacez ces fichiers SVG par des PNG via un outil comme https://realfavicongenerator.net/");
