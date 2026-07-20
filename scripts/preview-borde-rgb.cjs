const fs = require("fs");
const path = require("path");
const sharp = require(path.join(process.env.TEMP, "sharp-lorena", "node_modules", "sharp"));

const outDir = "d:/NFC/Lorena/images/marco";
const basePath = path.join(outDir, "foto-marco-rgb.jpg");

const COLORS = {
  rojo: { r: 255, g: 40, b: 55, label: "Rojo" },
  verde: { r: 30, g: 255, b: 100, label: "Verde" },
  azul: { r: 40, g: 130, b: 255, label: "Azul" },
};

function edgeLit(data, width, height, color) {
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r0 = data[i];
      const g0 = data[i + 1];
      const b0 = data[i + 2];
      const lum = (0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0) / 255;

      const dx = Math.min(x, width - 1 - x) / (width * 0.5);
      const dy = Math.min(y, height - 1 - y) / (height * 0.5);
      const edgeDist = Math.min(dx, dy);
      const edgeGlow = Math.pow(1 - Math.min(1, edgeDist / 0.42), 1.65);
      const bleed = edgeGlow * Math.pow(lum, 0.55) * 0.85;
      const rim = edgeGlow * Math.exp(-Math.pow((lum - 0.08) * 10, 2)) * 0.55;
      const mix = Math.min(0.88, bleed * 0.7 + rim + edgeGlow * 0.35);

      if (lum < 0.035 && edgeDist > 0.35) {
        out[i] = r0;
        out[i + 1] = g0;
        out[i + 2] = b0;
        continue;
      }

      let r = r0 * (1 - mix * 0.25) + color.r * mix;
      let g = g0 * (1 - mix * 0.25) + color.g * mix;
      let b = b0 * (1 - mix * 0.25) + color.b * mix;

      if (edgeGlow > 0.05) {
        const v = edgeGlow * 0.45;
        r = Math.min(255, r + color.r * v);
        g = Math.min(255, g + color.g * v);
        b = Math.min(255, b + color.b * v);
      }

      out[i] = Math.round(Math.min(255, r));
      out[i + 1] = Math.round(Math.min(255, g));
      out[i + 2] = Math.round(Math.min(255, b));
    }
  }
  return out;
}

function frameOnlySvg(w, h, hex, label) {
  const f = Math.max(18, Math.round(w * 0.05));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#3a2f26"/>
        <stop offset="45%" stop-color="#2a221c"/>
        <stop offset="100%" stop-color="#1a1510"/>
      </linearGradient>
    </defs>
    <!-- marco con agujero transparente -->
    <path fill="url(#wood)" fill-rule="evenodd"
      d="M0,0 H${w} V${h} H0 Z M${f},${f} H${w - f} V${h - f} H${f} Z"/>
    <!-- brillo LED en el borde interior -->
    <rect x="${f}" y="${f}" width="${w - f * 2}" height="${h - f * 2}"
      fill="none" stroke="${hex}" stroke-width="6" stroke-opacity="0.95"/>
    <rect x="${f + 3}" y="${f + 3}" width="${w - f * 2 - 6}" height="${h - f * 2 - 6}"
      fill="none" stroke="${hex}" stroke-width="14" stroke-opacity="0.35"/>
    <rect x="${f + 8}" y="${f + 8}" width="140" height="32" rx="16" fill="rgba(0,0,0,0.55)"/>
    <text x="${f + 78}" y="${f + 29}" text-anchor="middle" fill="${hex}"
      font-family="Arial,sans-serif" font-size="14" font-weight="700">${label} · borde</text>
  </svg>`);
}

async function main() {
  const { data, info } = await sharp(basePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const thumbs = [];

  for (const [key, c] of Object.entries(COLORS)) {
    const tinted = edgeLit(data, width, height, c);
    const hex = `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

    const photoJpeg = await sharp(tinted, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 96 })
      .toBuffer();

    const composed = await sharp(photoJpeg)
      .composite([{ input: frameOnlySvg(width, height, hex, c.label), blend: "over" }])
      .jpeg({ quality: 95 })
      .toBuffer();

    await sharp(composed).toFile(path.join(outDir, `foto-marco-borde-${key}.jpg`));
    await sharp(composed)
      .resize(width * 2, height * 2, { kernel: "lanczos3" })
      .jpeg({ quality: 95 })
      .toFile(path.join(outDir, `foto-marco-borde-${key}-hd.jpg`));

    thumbs.push(
      await sharp(composed)
        .resize(Math.floor(width / 3), height, { fit: "cover", position: "centre" })
        .toBuffer()
    );
  }

  const colW = Math.floor(width / 3);
  await sharp({
    create: { width: colW * 3, height, channels: 3, background: "#111" },
  })
    .composite([
      { input: thumbs[0], left: 0, top: 0 },
      { input: thumbs[1], left: colW, top: 0 },
      { input: thumbs[2], left: colW * 2, top: 0 },
    ])
    .jpeg({ quality: 94 })
    .toFile(path.join(outDir, "foto-marco-borde-comparativa.jpg"));

  fs.writeFileSync(
    path.join(outDir, "preview.html"),
    `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Preview marco Ikea · luz de borde</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0d0d0d;color:#eee;padding:1.5rem 1rem 3rem}
    h1{text-align:center;font-size:1.3rem;margin-bottom:.35rem}
    p.sub{text-align:center;color:#888;font-size:.9rem;margin-bottom:1.5rem;max-width:36ch;margin-left:auto;margin-right:auto;line-height:1.45}
    .grid{display:grid;gap:1.25rem;max-width:380px;margin:0 auto}
    .card{border-radius:12px;overflow:hidden}
    .card img{width:100%;display:block}
    .card.rojo{box-shadow:0 0 28px rgba(255,40,55,.4)}
    .card.verde{box-shadow:0 0 28px rgba(30,255,100,.35)}
    .card.azul{box-shadow:0 0 28px rgba(40,130,255,.4)}
    .compare{max-width:720px;margin:2rem auto 0;border-radius:12px;overflow:hidden}
    .compare img{width:100%;display:block}
    .note{text-align:center;color:#666;font-size:.8rem;margin-top:1.5rem}
  </style>
</head>
<body>
  <h1>Marco Ikea · luces por el borde</h1>
  <p class="sub">Simulación: el color se concentra en el contorno y cae hacia el centro (como LEDs en el perímetro).</p>
  <div class="grid">
    <figure class="card rojo"><img src="foto-marco-borde-rojo-hd.jpg" alt="Borde rojo"></figure>
    <figure class="card verde"><img src="foto-marco-borde-verde-hd.jpg" alt="Borde verde"></figure>
    <figure class="card azul"><img src="foto-marco-borde-azul-hd.jpg" alt="Borde azul"></figure>
  </div>
  <figure class="compare">
    <img src="foto-marco-borde-comparativa.jpg" alt="Comparativa borde RGB">
  </figure>
  <p class="note">Aproximación · el efecto real depende del brillo de los LED y la luz de la habitación</p>
</body>
</html>`
  );

  console.log("Done edge previews");
}

main().catch(console.error);
