const path = require("path");
const fs = require("fs");
const sharp = require(path.join(process.env.TEMP, "sharp-lorena", "node_modules", "sharp"));

const cleanBase = "d:/NFC/Lorena/images/marco/foto-marco-rgb-limpia.jpg";
const out = "d:/NFC/Lorena/images/marco/foto-marco-10x15.jpg";
const W = Math.round((10 / 2.54) * 300);
const H = Math.round((15 / 2.54) * 300);

function cornerMarkersSvg(w, h) {
  const padX = Math.round(w * 0.05);
  const padY = Math.round(h * 0.018);
  const badgeW = Math.round(w * 0.22);
  const badgeH = Math.round(badgeW * 0.4);
  const fontSm = Math.round(badgeH * 0.3);
  const fontLg = Math.round(badgeH * 0.55);
  const heart = Math.round(badgeH * 0.44);
  const arc = Math.round(w * 0.065);

  const marker = (x, y, num, flip) => {
    const tx = flip ? x - badgeW : x;
    const cornerX = flip ? x + padX * 0.25 : x - padX * 0.25;
    const cornerY = y - padY * 0.35;
    const arcPath = flip
      ? `M ${cornerX - arc} ${cornerY} Q ${cornerX} ${cornerY} ${cornerX} ${cornerY + arc}`
      : `M ${cornerX + arc} ${cornerY} Q ${cornerX} ${cornerY} ${cornerX} ${cornerY + arc}`;

    return `
    <g transform="translate(${tx}, ${y - badgeH})">
      <rect x="0" y="0" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}"
        fill="rgba(255,252,248,0.92)" stroke="rgba(196,165,116,0.9)" stroke-width="2"/>
      <rect x="2.5" y="2.5" width="${badgeW - 5}" height="${badgeH - 5}" rx="${badgeH / 2 - 2.5}"
        fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
      <text x="${flip ? badgeW - padX : padX}" y="${badgeH * 0.58}"
        font-family="Georgia,serif" font-size="${heart}" fill="#9c4a5a">♥</text>
      <text x="${badgeW / 2 + (flip ? -padX * 0.35 : padX * 0.35)}" y="${badgeH * 0.4}"
        text-anchor="middle" font-family="Georgia,serif" font-size="${fontSm}"
        letter-spacing="0.14em" fill="#c4a574">AÑO</text>
      <text x="${badgeW / 2 + (flip ? -padX * 0.35 : padX * 0.35)}" y="${badgeH * 0.84}"
        text-anchor="middle" font-family="Georgia,serif" font-size="${fontLg}" font-weight="600"
        fill="#9c4a5a">${num}</text>
    </g>
    <path d="${arcPath}" fill="none" stroke="rgba(196,165,116,0.8)" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="${flip ? x - padX : x + padX}" cy="${y - badgeH * 0.45}"
      r="${Math.round(padX * 0.25)}" fill="none" stroke="rgba(156,74,90,0.6)" stroke-width="2"
      stroke-dasharray="3 4"/>
    `;
  };

  const y = h - padY;
  const leftX = padX;
  const rightX = w - padX;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#glow)">
      ${marker(leftX, y, "1", false)}
      ${marker(rightX, y, "2", true)}
    </g>
  </svg>`);
}

async function main() {
  const base = fs.existsSync(cleanBase)
    ? cleanBase
    : "d:/NFC/Lorena/images/marco/foto-marco-rgb.jpg";

  const cropped = await sharp(base)
    .resize(W, H, { fit: "cover", position: "bottom" })
    .jpeg({ quality: 96 })
    .toBuffer();

  const svg = cornerMarkersSvg(W, H);
  await sharp(cropped)
    .composite([{ input: svg, blend: "over" }])
    .jpeg({ quality: 96, mozjpeg: true })
    .toFile(out);

  console.log("Saved", out, W + "x" + H);
}

main().catch(console.error);
