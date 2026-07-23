const path = require("path");
const fs = require("fs");
const sharp = require(path.join(process.env.TEMP, "sharp-lorena", "node_modules", "sharp"));

const cleanBase = "d:/NFC/Lorena/images/marco/foto-marco-rgb-limpia.jpg";
const outDir = "d:/NFC/Lorena/images/marco";
const outPhoto = path.join(outDir, "foto-marco-13x18.jpg");
const outPhoto10 = path.join(outDir, "foto-marco-10x15.jpg");
const outAno1 = path.join(outDir, "marca-ano1-print.png");
const outAno2 = path.join(outDir, "marca-ano2-print.png");

const W = Math.round((13 / 2.54) * 300);
const H = Math.round((18 / 2.54) * 300);
const PHOTO_W = Math.round((10 / 2.54) * 300);
const PHOTO_H = Math.round((15 / 2.54) * 300);

function markerDims(photoW, photoH) {
  const padX = Math.round(photoW * 0.05);
  const padY = Math.round(photoH * 0.018);
  const badgeW = Math.round(photoW * 0.22);
  const badgeH = Math.round(badgeW * 0.4);
  const fontSm = Math.round(badgeH * 0.3);
  const fontLg = Math.round(badgeH * 0.55);
  const heart = Math.round(badgeH * 0.44);
  const arc = Math.round(photoW * 0.065);
  return { padX, padY, badgeW, badgeH, fontSm, fontLg, heart, arc };
}

function badgeGroup(num, flip, d, originX, originY) {
  const { padX, padY, badgeW, badgeH, fontSm, fontLg, heart, arc } = d;
  const tx = flip ? originX - badgeW : originX;
  const cornerX = flip ? originX + padX * 0.25 : originX - padX * 0.25;
  const cornerY = originY - padY * 0.35;
  const arcPath = flip
    ? `M ${cornerX - arc} ${cornerY} Q ${cornerX} ${cornerY} ${cornerX} ${cornerY + arc}`
    : `M ${cornerX + arc} ${cornerY} Q ${cornerX} ${cornerY} ${cornerX} ${cornerY + arc}`;

  return `
    <g transform="translate(${tx}, ${originY - badgeH})">
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
    <circle cx="${flip ? originX - padX : originX + padX}" cy="${originY - badgeH * 0.45}"
      r="${Math.round(padX * 0.25)}" fill="none" stroke="rgba(156,74,90,0.6)" stroke-width="2"
      stroke-dasharray="3 4"/>
  `;
}

function singleMarkerSvg(num, flip, photoW, photoH, offsetX, offsetY) {
  const d = markerDims(photoW, photoH);
  const { padX, padY, badgeW, arc } = d;
  const margin = Math.round(Math.max(padX, padY) + arc + 12);

  const originY = offsetY + photoH - padY;
  const originX = flip ? offsetX + photoW - padX : offsetX + padX;

  const minX = flip ? originX - badgeW - padX - arc : originX - arc - margin * 0.3;
  const maxX = flip ? originX + arc + margin * 0.3 : originX + badgeW + padX + arc;
  const minY = originY - d.badgeH - padY - arc;
  const maxY = originY + margin * 0.2;

  const svgW = maxX - minX + margin;
  const svgH = maxY - minY + margin;
  const ox = originX - minX + margin * 0.15;
  const oy = originY - minY + margin * 0.1;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
    <defs>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#glow)">
      ${badgeGroup(num, flip, d, ox, oy)}
    </g>
  </svg>`);
}

async function buildSharpPhoto(base) {
  return sharp(base)
    .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "bottom" })
    .jpeg({ quality: 96, mozjpeg: true })
    .toBuffer();
}

async function buildBlurredCanvas(base) {
  return sharp(base)
    .resize(W, H, { fit: "cover", position: "bottom" })
    .blur(45)
    .modulate({ brightness: 0.92, saturation: 1.08 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function main() {
  const base = fs.existsSync(cleanBase)
    ? cleanBase
    : "d:/NFC/Lorena/images/marco/foto-marco-rgb.jpg";

  const sharpPhoto = await buildSharpPhoto(base);
  await sharp(sharpPhoto).toFile(outPhoto10);

  const blurredBg = await buildBlurredCanvas(base);
  const offsetX = Math.round((W - PHOTO_W) / 2);
  const offsetY = Math.round((H - PHOTO_H) / 2);

  await sharp(blurredBg)
    .composite([{ input: sharpPhoto, left: offsetX, top: offsetY }])
    .jpeg({ quality: 96, mozjpeg: true })
    .toFile(outPhoto);

  const svg1 = singleMarkerSvg("1", false, PHOTO_W, PHOTO_H, offsetX, offsetY);
  const svg2 = singleMarkerSvg("2", true, PHOTO_W, PHOTO_H, offsetX, offsetY);

  await sharp(svg1).png().toFile(outAno1);
  await sharp(svg2).png().toFile(outAno2);

  const m1 = await sharp(outAno1).metadata();
  const m2 = await sharp(outAno2).metadata();

  console.log("Saved", outPhoto10, PHOTO_W + "x" + PHOTO_H);
  console.log("Saved", outPhoto, W + "x" + H, `(foto centrada ${PHOTO_W}x${PHOTO_H})`);
  console.log("Saved", outAno1, m1.width + "x" + m1.height);
  console.log("Saved", outAno2, m2.width + "x" + m2.height);
}

main().catch(console.error);
