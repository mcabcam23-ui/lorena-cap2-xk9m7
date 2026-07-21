const path = require("path");
const fs = require("fs");
const sharp = require(path.join(process.env.TEMP, "sharp-lorena", "node_modules", "sharp"));

const input = "d:/NFC/Lorena/images/marco/foto-marco-rgb-hd.jpg";
const outGuide = "d:/NFC/Lorena/images/marco/foto-marco-guia-nfc.jpg";
const outGuideHd = "d:/NFC/Lorena/images/marco/foto-marco-guia-nfc-hd.jpg";

async function addNfcMarkers(src, dest) {
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;

  // Posición: esquinas inferiores (reverso del marco / borde del paspartú)
  const padX = Math.round(w * 0.08);
  const padY = Math.round(h * 0.06);
  const markerR = Math.round(w * 0.055);

  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#000" flood-opacity="0.45"/>
      </filter>
    </defs>

    <!-- Año 1 — izquierda -->
    <g filter="url(#shadow)" transform="translate(${padX + markerR}, ${h - padY - markerR})">
      <circle r="${markerR}" fill="rgba(255,255,255,0.92)" stroke="#9c4a5a" stroke-width="3"/>
      <circle r="${markerR - 8}" fill="none" stroke="#9c4a5a" stroke-width="2" stroke-dasharray="6 4" opacity="0.7"/>
      <text y="-4" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(markerR * 0.55)}" font-weight="700" fill="#9c4a5a">NFC</text>
      <text y="${Math.round(markerR * 0.45)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(markerR * 0.38)}" fill="#6b5e57">Año 1</text>
    </g>

    <!-- Año 2 — derecha -->
    <g filter="url(#shadow)" transform="translate(${w - padX - markerR}, ${h - padY - markerR})">
      <circle r="${markerR}" fill="rgba(255,255,255,0.92)" stroke="#9c4a5a" stroke-width="3"/>
      <circle r="${markerR - 8}" fill="none" stroke="#9c4a5a" stroke-width="2" stroke-dasharray="6 4" opacity="0.7"/>
      <text y="-4" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(markerR * 0.55)}" font-weight="700" fill="#9c4a5a">NFC</text>
      <text y="${Math.round(markerR * 0.45)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(markerR * 0.38)}" fill="#6b5e57">Año 2</text>
    </g>

    <!-- Flechas desde el borde -->
    <line x1="${padX}" y1="${h - padY - markerR}" x2="${padX + markerR * 0.4}" y2="${h - padY - markerR}"
      stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-dasharray="4 3"/>
    <line x1="${w - padX}" y1="${h - padY - markerR}" x2="${w - padX - markerR * 0.4}" y2="${h - padY - markerR}"
      stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-dasharray="4 3"/>
  </svg>`);

  await sharp(src).composite([{ input: svg, blend: "over" }]).jpeg({ quality: 96 }).toFile(dest);
  console.log("Saved:", dest, w + "x" + h);
}

async function main() {
  await addNfcMarkers("d:/NFC/Lorena/images/marco/foto-marco-rgb.jpg", outGuide.replace("-hd", "").replace("guia-nfc.jpg", "guia-nfc.jpg"));
  await addNfcMarkers(input, outGuideHd);

  // Guía reverso del marco (vista esquemática)
  const frameW = 800;
  const frameH = 1200;
  const margin = 48;
  const innerW = frameW - margin * 2;
  const innerH = frameH - margin * 2 - 80;
  const photoAspect = 1024 / 576;
  let photoW = innerW;
  let photoH = Math.round(photoW * photoAspect);
  if (photoH > innerH - 60) {
    photoH = innerH - 60;
    photoW = Math.round(photoH / photoAspect);
  }
  const photoX = (frameW - photoW) / 2;
  const photoY = margin + 20;
  const nfcY = photoY + photoH + 45;

  const diagram = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${frameW}" height="${frameH}">
    <rect width="100%" height="100%" fill="#2a221c"/>
    <text x="${frameW/2}" y="32" text-anchor="middle" fill="#c4a574" font-family="Arial,sans-serif" font-size="16" font-weight="600">REVERSO DEL MARCO</text>
    <rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="4" fill="#1a1a1a" stroke="#5a4a3a" stroke-width="2"/>
    <text x="${frameW/2}" y="${nfcY - 18}" text-anchor="middle" fill="#aaa" font-family="Arial,sans-serif" font-size="13">Pega las pegatinas NFC aquí ↓</text>

    <g transform="translate(${photoX + 60}, ${nfcY})">
      <rect x="-52" y="-24" width="104" height="48" rx="24" fill="#fff" stroke="#9c4a5a" stroke-width="2"/>
      <text y="6" text-anchor="middle" fill="#9c4a5a" font-family="Arial,sans-serif" font-size="14" font-weight="700">NFC Año 1</text>
    </g>
    <g transform="translate(${photoX + photoW - 60}, ${nfcY})">
      <rect x="-52" y="-24" width="104" height="48" rx="24" fill="#fff" stroke="#9c4a5a" stroke-width="2"/>
      <text y="6" text-anchor="middle" fill="#9c4a5a" font-family="Arial,sans-serif" font-size="14" font-weight="700">NFC Año 2</text>
    </g>

    <line x1="${photoX + 60}" y1="${photoY + photoH + 8}" x2="${photoX + 60}" y2="${nfcY - 26}" stroke="#9c4a5a" stroke-width="2" stroke-dasharray="5 4"/>
    <line x1="${photoX + photoW - 60}" y1="${photoY + photoH + 8}" x2="${photoX + photoW - 60}" y2="${nfcY - 26}" stroke="#9c4a5a" stroke-width="2" stroke-dasharray="5 4"/>
  </svg>`);

  await sharp(diagram).jpeg({ quality: 92 }).toFile("d:/NFC/Lorena/images/marco/guia-reverso-marco.jpg");
  console.log("Saved diagram");
}

main().catch(console.error);
