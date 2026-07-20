const fs = require("fs");
const path = require("path");
const sharp = require(path.join(process.env.TEMP, "sharp-lorena", "node_modules", "sharp"));

const input =
  "C:/Users/itsmo/.cursor/projects/d-NFC-Lorena/assets/c__Users_itsmo_AppData_Roaming_Cursor_User_workspaceStorage_06eee1a42c838cb6c88a191cb6a037d0_images_WhatsApp_Image_2026-07-20_at_16.05.26-b78820c9-255f-4eb1-9233-443f7269580f.png";
const outDir = "d:/NFC/Lorena/images/marco";

const RGB = {
  rojo: { r: 255, g: 35, b: 55, label: "Rojo" },
  verde: { r: 25, g: 255, b: 95, label: "Verde" },
  azul: { r: 30, g: 120, b: 255, label: "Azul" },
};

function processPixels(data, width, height, channels) {
  const out = Buffer.alloc(data.length);
  const cx = width * 0.5;
  const cy = height * 0.26;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const nx = x / width;
      const ny = y / height;
      const dx = (x - cx) / width;
      const dy = (y - cy) / height;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lum < 0.1) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        continue;
      }

      let t = Math.pow(Math.min(1, Math.max(0, (lum - 0.05) / 0.95)), 0.52);
      const sunCore = Math.exp(-dist * dist * 12) * 0.78;
      const sunHalo = Math.exp(-dist * dist * 3.2) * 0.32;
      t = Math.min(1, t + sunCore + sunHalo);

      const water = Math.max(0, (ny - 0.5) / 0.5);
      const sparkle =
        water *
        (0.5 + 0.5 * Math.abs(Math.sin(x * 0.11 + y * 0.05))) *
        Math.pow(t, 1.15);

      const rim = Math.exp(-Math.pow((lum - 0.14) * 7.5, 2)) * 0.48;
      const skyWarm = Math.exp(-dist * 1.6) * 1.15;
      const vignette =
        1 -
        Math.pow(Math.max(Math.abs(nx - 0.5) * 1.4, Math.abs(ny - 0.4) * 0.95), 2) *
          0.22;

      let nr = t * (255 + skyWarm * 60 + sparkle * 65 + rim * 130) * vignette;
      let ng = t * (255 + skyWarm * 30 + sparkle * 95 + rim * 60) * vignette;
      let nb = t * (255 + water * 140 + sparkle * 120 + rim * 170) * vignette;

      const sat = 1.65 + water * 0.5 + sunCore * 0.3;
      const avg = (nr + ng + nb) / 3;
      nr = avg + (nr - avg) * sat;
      ng = avg + (ng - avg) * sat;
      nb = avg + (nb - avg) * sat;

      out[i] = Math.round(Math.min(255, nr));
      out[i + 1] = Math.round(Math.min(255, ng));
      out[i + 2] = Math.round(Math.min(255, nb));
    }
  }

  return out;
}

function applyRgbPreview(baseData, width, height, colorKey) {
  const c = RGB[colorKey];
  const out = Buffer.alloc(baseData.length);
  const cx = width * 0.5;
  const cy = height * 0.62;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const nr = baseData[i];
      const ng = baseData[i + 1];
      const nb = baseData[i + 2];
      const lum = (0.2126 * nr + 0.7152 * ng + 0.0722 * nb) / 255;
      const ny = y / height;

      if (lum < 0.04) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        continue;
      }

      const dx = (x - cx) / width;
      const dy = (y - cy) / height;
      const distBody = Math.sqrt(dx * dx + dy * dy);
      const water = Math.max(0, (ny - 0.48) / 0.52);
      const sky = Math.max(0, 1 - ny * 1.1);
      const rim = Math.exp(-Math.pow((lum - 0.12) * 8, 2)) * (1 - distBody * 0.5);
      const glow = Math.pow(lum, 0.75);
      const edge = Math.exp(-distBody * distBody * 5) * 0.35;

      const mix = Math.min(
        0.92,
        glow * 0.55 + water * 0.35 + sky * 0.25 + rim * 0.55 + edge * 0.2
      );

      let r = nr * (1 - mix * 0.15) + c.r * mix * (0.55 + glow * 0.45);
      let g = ng * (1 - mix * 0.15) + c.g * mix * (0.55 + glow * 0.45);
      let b = nb * (1 - mix * 0.15) + c.b * mix * (0.55 + glow * 0.45);

      // Reflejos en el agua más intensos
      if (water > 0.2 && lum > 0.2) {
        const w = water * lum * 0.45;
        r = r * (1 - w) + c.r * w;
        g = g * (1 - w) + c.g * w;
        b = b * (1 - w) + c.b * w;
      }

      // Halo alrededor de la silueta
      if (rim > 0.08) {
        r = Math.min(255, r + c.r * rim * 0.9);
        g = Math.min(255, g + c.g * rim * 0.9);
        b = Math.min(255, b + c.b * rim * 0.9);
      }

      out[i] = Math.round(Math.min(255, r));
      out[i + 1] = Math.round(Math.min(255, g));
      out[i + 2] = Math.round(Math.min(255, b));
    }
  }

  return out;
}

function labelSvg(w, h, text, hex) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="14" y="14" width="130" height="38" rx="19" fill="rgba(0,0,0,0.55)"/>
    <text x="79" y="40" text-anchor="middle" fill="${hex}" font-family="Arial,sans-serif" font-size="17" font-weight="700">${text}</text>
  </svg>`);
}

function spectacularOverlaySvg(w, h) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="sun" cx="50%" cy="19%" r="65%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
        <stop offset="20%" stop-color="#fff8e8" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="#ffa850" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#5080ff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="water" x1="0" y1="50%" x2="0" y2="100%">
        <stop offset="0%" stop-color="#80e0ff" stop-opacity="0"/>
        <stop offset="55%" stop-color="#30b8ff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#1060ff" stop-opacity="0.5"/>
      </linearGradient>
      <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff2080" stop-opacity="0.2"/>
        <stop offset="50%" stop-color="#30ff90" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#3080ff" stop-opacity="0.22"/>
      </linearGradient>
      <radialGradient id="vig" cx="50%" cy="42%" r="72%">
        <stop offset="50%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.4"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sun)"/>
    <rect width="100%" height="100%" fill="url(#water)"/>
    <rect width="100%" height="100%" fill="url(#rim)"/>
    <rect width="100%" height="100%" fill="url(#vig)" style="mix-blend-mode:multiply"/>
  </svg>`);
}

async function saveJpeg(pipeline, filepath, width, height) {
  await pipeline
    .clone()
    .resize(width, height, { kernel: "lanczos3" })
    .jpeg({ quality: 96, mozjpeg: true })
    .toFile(filepath);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const { data, info } = await sharp(input)
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const processed = processPixels(data, info.width, info.height, info.channels);

  const base = await sharp(processed, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .composite([{ input: spectacularOverlaySvg(info.width, info.height), blend: "screen" }])
    .sharpen({ sigma: 1.2, m1: 0.65, m2: 0.4 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const baseSharp = sharp(base.data, {
    raw: { width: info.width, height: info.height, channels: 3 },
  });

  await saveJpeg(baseSharp, path.join(outDir, "foto-marco-rgb.jpg"), info.width, info.height);
  await saveJpeg(baseSharp, path.join(outDir, "foto-marco-rgb-hd.jpg"), info.width * 2, info.height * 2);

  const previewBuffers = [];

  for (const [key, cfg] of Object.entries(RGB)) {
    const tinted = applyRgbPreview(base.data, info.width, info.height, key);
    const hex = `#${cfg.r.toString(16).padStart(2, "0")}${cfg.g.toString(16).padStart(2, "0")}${cfg.b.toString(16).padStart(2, "0")}`;

    const previewSharp = sharp(tinted, {
      raw: { width: info.width, height: info.height, channels: 3 },
    }).composite([{ input: labelSvg(info.width, info.height, cfg.label + " RGB", hex), blend: "over" }]);

    await saveJpeg(
      previewSharp,
      path.join(outDir, `foto-marco-preview-${key}.jpg`),
      info.width,
      info.height
    );
    await saveJpeg(
      previewSharp,
      path.join(outDir, `foto-marco-preview-${key}-hd.jpg`),
      info.width * 2,
      info.height * 2
    );

    previewBuffers.push(
      await sharp(tinted, {
        raw: { width: info.width, height: info.height, channels: 3 },
      })
        .jpeg()
        .toBuffer()
    );
  }

  const colW = Math.floor(info.width / 3);
  const thumbs = await Promise.all(
    previewBuffers.map((buf) =>
      sharp(buf).resize(colW, info.height, { fit: "cover", position: "centre" }).toBuffer()
    )
  );

  await sharp({
    create: {
      width: colW * 3,
      height: info.height,
      channels: 3,
      background: "#050505",
    },
  })
    .composite([
      { input: thumbs[0], left: 0, top: 0 },
      { input: thumbs[1], left: colW, top: 0 },
      { input: thumbs[2], left: colW * 2, top: 0 },
    ])
    .jpeg({ quality: 95 })
    .toFile(path.join(outDir, "foto-marco-preview-comparativa.jpg"));

  console.log("Done:", outDir);
}

main().catch(console.error);
