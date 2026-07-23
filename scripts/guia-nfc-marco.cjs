const path = require("path");
const sharp = require(path.join(process.env.TEMP, "sharp-lorena", "node_modules", "sharp"));

const cleanBase = "d:/NFC/Lorena/images/marco/foto-marco-rgb-limpia.jpg";
const outPrint = "d:/NFC/Lorena/images/marco/foto-marco-rgb.jpg";
const outPrintHd = "d:/NFC/Lorena/images/marco/foto-marco-rgb-hd.jpg";
const outNew = "d:/NFC/Lorena/images/marco/foto-marco-rgb-marcada.jpg";

function cornerMarkersSvg(w, h) {
  const pad = Math.round(w * 0.045);
  const badgeW = Math.round(w * 0.19);
  const badgeH = Math.round(badgeW * 0.38);
  const fontSm = Math.round(badgeH * 0.32);
  const fontLg = Math.round(badgeH * 0.52);
  const heart = Math.round(badgeH * 0.42);
  const arc = Math.round(w * 0.07);

  const marker = (x, y, label, num, flip) => {
    const tx = flip ? x - badgeW : x;
    const cornerX = flip ? x + pad * 0.3 : x - pad * 0.3;
    const cornerY = y - pad * 0.3;
    const arcPath = flip
      ? `M ${cornerX - arc} ${cornerY} Q ${cornerX} ${cornerY} ${cornerX} ${cornerY + arc}`
      : `M ${cornerX + arc} ${cornerY} Q ${cornerX} ${cornerY} ${cornerX} ${cornerY + arc}`;

    return `
    <g transform="translate(${tx}, ${y - badgeH})">
      <!-- halo suave -->
      <rect x="0" y="0" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}"
        fill="rgba(255,252,248,0.88)" stroke="rgba(196,165,116,0.85)" stroke-width="1.5"/>
      <!-- brillo interior -->
      <rect x="2" y="2" width="${badgeW - 4}" height="${badgeH - 4}" rx="${badgeH / 2 - 2}"
        fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
      <!-- corazón -->
      <text x="${flip ? badgeW - pad * 0.9 : pad * 0.9}" y="${badgeH * 0.58}"
        font-family="Georgia,serif" font-size="${heart}" fill="#9c4a5a">♥</text>
      <!-- texto -->
      <text x="${badgeW / 2 + (flip ? -pad * 0.4 : pad * 0.4)}" y="${badgeH * 0.42}"
        text-anchor="middle" font-family="Georgia,serif" font-size="${fontSm}"
        letter-spacing="0.12em" fill="#c4a574">AÑO</text>
      <text x="${badgeW / 2 + (flip ? -pad * 0.4 : pad * 0.4)}" y="${badgeH * 0.82}"
        text-anchor="middle" font-family="Georgia,serif" font-size="${fontLg}" font-weight="600"
        fill="#9c4a5a">${num}</text>
    </g>
    <!-- arco decorativo esquina -->
    <path d="${arcPath}" fill="none" stroke="rgba(196,165,116,0.75)" stroke-width="2" stroke-linecap="round"/>
    <!-- punto guía -->
    <circle cx="${flip ? x - pad * 1.1 : x + pad * 1.1}" cy="${y - pad * 0.55}"
      r="${Math.round(pad * 0.22)}" fill="none" stroke="rgba(156,74,90,0.55)" stroke-width="1.5"
      stroke-dasharray="2 3"/>
    `;
  };

  const y = h - pad;
  const leftX = pad;
  const rightX = w - pad - badgeW;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <g filter="url(#glow)">
      ${marker(leftX, y, "Año", "1", false)}
      ${marker(rightX + badgeW, y, "Año", "2", true)}
    </g>
  </svg>`);
}

const fs = require("fs");

async function addMarkers(src, dest) {
  const meta = await sharp(src).metadata();
  const svg = cornerMarkersSvg(meta.width, meta.height);
  const tmp = path.join(process.env.TEMP, "marco-marked-" + Date.now() + ".jpg");
  await sharp(src).composite([{ input: svg, blend: "over" }]).jpeg({ quality: 96 }).toFile(tmp);
  fs.copyFileSync(tmp, dest);
  fs.unlinkSync(tmp);
  console.log("Saved:", dest);
}

async function main() {
  if (!fs.existsSync(cleanBase)) {
    await sharp("d:/NFC/Lorena/images/marco/foto-marco-rgb.jpg").toFile(cleanBase);
  }

  await addMarkers(cleanBase, outNew);
  await sharp(outNew).resize(1152, 2048, { kernel: "lanczos3" }).jpeg({ quality: 96 }).toFile(outPrintHd);
  await sharp(outNew).jpeg({ quality: 96 }).toFile(outPrint);

  // Guía reverso (solo para montaje, sin texto NFC)
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
  const tagY = photoY + photoH + 45;

  const diagram = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${frameW}" height="${frameH}">
    <rect width="100%" height="100%" fill="#2a221c"/>
    <text x="${frameW/2}" y="32" text-anchor="middle" fill="#c4a574" font-family="Georgia,serif" font-size="16">Reverso del marco</text>
    <rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="4" fill="#1a1a1a" stroke="#5a4a3a" stroke-width="2"/>
    <text x="${frameW/2}" y="${tagY - 18}" text-anchor="middle" fill="#aaa" font-family="Arial,sans-serif" font-size="13">Pegatinas alineadas con las marcas ↓</text>
    <g transform="translate(${photoX + 55}, ${tagY})">
      <rect x="-46" y="-20" width="92" height="40" rx="20" fill="#fff" stroke="#9c4a5a" stroke-width="1.5"/>
      <text y="5" text-anchor="middle" fill="#9c4a5a" font-family="Georgia,serif" font-size="14">♥ Año 1</text>
    </g>
    <g transform="translate(${photoX + photoW - 55}, ${tagY})">
      <rect x="-46" y="-20" width="92" height="40" rx="20" fill="#fff" stroke="#9c4a5a" stroke-width="1.5"/>
      <text y="5" text-anchor="middle" fill="#9c4a5a" font-family="Georgia,serif" font-size="14">♥ Año 2</text>
    </g>
  </svg>`);

  await sharp(diagram).jpeg({ quality: 92 }).toFile("d:/NFC/Lorena/images/marco/guia-reverso-marco.jpg");
  console.log("Done");
}

main().catch(console.error);
