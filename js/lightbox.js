(function () {
  const galleries = document.querySelectorAll(".gallery");
  if (!galleries.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Foto ampliada");
  lightbox.innerHTML = `
    <button type="button" class="lightbox__close" aria-label="Cerrar">×</button>
    <div class="lightbox__backdrop" aria-hidden="true"></div>
    <figure class="lightbox__figure">
      <img class="lightbox__img" src="" alt="" draggable="false">
    </figure>
  `;
  document.body.appendChild(lightbox);

  const img = lightbox.querySelector(".lightbox__img");
  const figure = lightbox.querySelector(".lightbox__figure");
  const closeBtn = lightbox.querySelector(".lightbox__close");
  const backdrop = lightbox.querySelector(".lightbox__backdrop");

  let scale = 1;
  let panX = 0;
  let panY = 0;
  let startScale = 1;
  let startPanX = 0;
  let startPanY = 0;
  let pinchStartDist = 0;
  let panStartX = 0;
  let panStartY = 0;
  let isPinching = false;
  let isPanning = false;

  function applyTransform() {
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    img.style.transform = "";
  }

  function open(src, alt) {
    resetZoom();
    img.src = src;
    img.alt = alt || "";
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    closeBtn.focus();
  }

  function close() {
    lightbox.hidden = true;
    img.src = "";
    resetZoom();
    document.body.classList.remove("lightbox-open");
  }

  function touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function touchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  // Bloquear scroll/gestos del navegador con la galería abierta
  function lockScroll(e) {
    if (!lightbox.hidden) e.preventDefault();
  }

  document.addEventListener("touchmove", lockScroll, { passive: false });

  figure.addEventListener(
    "touchstart",
    (e) => {
      if (lightbox.hidden) return;

      if (e.touches.length === 2) {
        isPinching = true;
        isPanning = false;
        pinchStartDist = touchDistance(e.touches);
        startScale = scale;
        startPanX = panX;
        startPanY = panY;
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && scale > 1) {
        isPanning = true;
        isPinching = false;
        panStartX = e.touches[0].clientX;
        panStartY = e.touches[0].clientY;
        startPanX = panX;
        startPanY = panY;
        e.preventDefault();
      }
    },
    { passive: false }
  );

  figure.addEventListener(
    "touchmove",
    (e) => {
      if (lightbox.hidden) return;

      if (isPinching && e.touches.length === 2) {
        const dist = touchDistance(e.touches);
        scale = Math.min(4, Math.max(1, startScale * (dist / pinchStartDist)));
        if (scale === 1) {
          panX = 0;
          panY = 0;
        }
        applyTransform();
        e.preventDefault();
        return;
      }

      if (isPanning && e.touches.length === 1 && scale > 1) {
        panX = startPanX + (e.touches[0].clientX - panStartX);
        panY = startPanY + (e.touches[0].clientY - panStartY);
        applyTransform();
        e.preventDefault();
      }
    },
    { passive: false }
  );

  figure.addEventListener(
    "touchend",
    (e) => {
      if (e.touches.length < 2) isPinching = false;
      if (e.touches.length === 0) {
        isPanning = false;
        if (scale < 1.05) resetZoom();
      }
    },
    { passive: true }
  );

  // Evitar arrastrar la imagen nativa / gestos del navegador
  img.addEventListener("dragstart", (e) => e.preventDefault());

  function setupGallery(gallery) {
    const items = [...gallery.querySelectorAll(".gallery__item")].filter((item) => {
      const image = item.querySelector("img");
      return image && image.getAttribute("src");
    });

    if (!items.length) return;

    const cover = items[0];
    cover.classList.add("gallery__cover");

    if (!cover.querySelector(".gallery__overlay")) {
      const overlay = document.createElement("button");
      overlay.type = "button";
      overlay.className = "gallery__overlay";
      overlay.setAttribute("aria-label", "Ver galería");
      overlay.innerHTML = `<span class="gallery__overlay-text">Ver galería</span>`;
      cover.appendChild(overlay);

      overlay.addEventListener("click", () => {
        gallery.classList.add("gallery--open");
        items.forEach((item) => {
          item.hidden = false;
          item.removeAttribute("aria-hidden");
        });
        overlay.hidden = true;
        cover.classList.remove("gallery__cover");
      });
    }

    items.slice(1).forEach((item) => {
      item.hidden = true;
      item.setAttribute("aria-hidden", "true");
    });

    items.forEach((item) => {
      const image = item.querySelector("img");
      item.classList.add("gallery__item--zoomable");
      item.addEventListener("click", (e) => {
        if (e.target.closest(".gallery__overlay")) return;
        if (!gallery.classList.contains("gallery--open") && item === cover) return;
        open(image.currentSrc || image.src, image.alt);
      });
    });
  }

  galleries.forEach(setupGallery);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });
  backdrop.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) close();
  });
})();
