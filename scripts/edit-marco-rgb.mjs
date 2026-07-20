import sharp from "sharp";
const path = require("path");

const input =
  "C:/Users/itsmo/.cursor/projects/d-NFC-Lorena/assets/c__Users_itsmo_AppData_Roaming_Cursor_User_workspaceStorage_06eee1a42c838cb6c88a191cb6a037d0_images_WhatsApp_Image_2026-07-20_at_16.05.26-b78820c9-255f-4eb1-9233-443f7269580f.png";
const output = "d:/NFC/Lorena/images/marco/foto-marco-rgb.jpg";

async function main() {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(data.length);
  const cx = width * 0.5;
  const cy = height * 0.28;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const dx = (x - cx) / width;
      const dy = (y - cy) / height;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Silueta: negro puro para que el RGB brille alrededor
      if (lum < 0.12) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        if (channels === 4) out[i + 3] = 255;
        continue;
      }

      // Contraste agresivo + curva luminosa
      let t = Math.pow(Math.min(1, Math.max(0, (lum - 0.08) / 0.92)), 0.72);

      // Zona sol/cielo: muy luminosa, cálida
      const sunGlow = Math.exp(-dist * dist * 9) * 0.55;
      t = Math.min(1, t + sunGlow);

      // Agua (parte baja): reflejos más brillantes y fríos → reacciona al azul/verde RGB
      const water = Math.max(0, (y / height - 0.55) / 0.45);
      const sparkle = water * Math.pow(t, 1.4) * 0.35;

      // Gradiente cromático suave según zona (visual con cualquier color RGB)
      const skyWarm = Math.exp(-dist * 2.2) * 0.9;
      const waterCool = water * 0.85;
      const rim = Math.exp(-Math.pow((lum - 0.18) * 6, 2)) * 0.25;

      let nr = t * (255 + skyWarm * 40 + sparkle * 30 + rim * 80);
      let ng = t * (255 + skyWarm * 20 + sparkle * 60 + rim * 40);
      let nb = t * (255 + waterCool * 90 + sparkle * 80 + rim * 110);

      // Saturación en medios-altos
      const sat = 1.35 + water * 0.25;
      const avg = (nr + ng + nb) / 3;
      nr = avg + (nr - avg) * sat;
      ng = avg + (ng - avg) * sat;
      nb = avg + (nb - avg) * sat;

      out[i] = Math.round(Math.min(255, nr));
      out[i + 1] = Math.round(Math.min(255, ng));
      out[i + 2] = Math.round(Math.min(255, nb));
      if (channels === 4) out[i + 3] = data[i + 3];
    }
  }

  // Halo RGB sutil en el contorno de la silueta
  const base = await sharp(out, { raw: { width, height, channels } })
    .removeAlpha()
    .toBuffer();

  const glowSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <radialGradient id="sun" cx="50%" cy="22%" r="55%">
          <stop offset="0%" stop-color="rgb(255,255,255)" stop-opacity="0.95"/>
          <stop offset="45%" stop-color="rgb(255,220,180)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="rgb(120,180,255)" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="water" x1="0" y1="55%" x2="0" y2="100%">
          <stop offset="0%" stop-color="rgb(180,220,255)" stop-opacity="0"/>
          <stop offset="100%" stop-color="rgb(100,200,255)" stop-opacity="0.22"/>
        </linearGradient>
        <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgb(255,80,180)" stop-opacity="0.12"/>
          <stop offset="50%" stop-color="rgb(80,255,180)" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="rgb(80,120,255)" stop-opacity="0.14"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sun)"/>
      <rect width="100%" height="100%" fill="url(#water)"/>
      <rect width="100%" height="100%" fill="url(#rim)"/>
    </svg>`;

  await sharp(base)
    .composite([
      {
        input: Buffer.from(glowSvg),
        blend: "screen",
      },
    ])
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.3 })
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(output);

  console.log("Saved:", output);
}

main().catch(console.error);
