(function () {
  const galleries = document.querySelectorAll(".gallery");
  if (!galleries.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Galería de fotos");
  lightbox.innerHTML = `
    <button type="button" class="lightbox__close" aria-label="Cerrar">×</button>
    <button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Foto anterior">‹</button>
    <button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Foto siguiente">›</button>
    <div class="lightbox__backdrop" aria-hidden="true"></div>
    <figure class="lightbox__figure">
      <img class="lightbox__img" src="" alt="" draggable="false">
      <figcaption class="lightbox__caption"></figcaption>
    </figure>
  `;
  document.body.appendChild(lightbox);

  const img = lightbox.querySelector(".lightbox__img");
  const caption = lightbox.querySelector(".lightbox__caption");
  const closeBtn = lightbox.querySelector(".lightbox__close");
  const backdrop = lightbox.querySelector(".lightbox__backdrop");
  const prevBtn = lightbox.querySelector(".lightbox__nav--prev");
  const nextBtn = lightbox.querySelector(".lightbox__nav--next");

  let photos = [];
  let index = 0;

  // Touch state: ignore swipe if there was a pinch (2 fingers)
  let touchStartX = 0;
  let touchStartY = 0;
  let multiTouch = false;
  let tracking = false;

  function show(i) {
    if (!photos.length) return;
    index = (i + photos.length) % photos.length;
    const photo = photos[index];
    img.src = photo.src;
    img.alt = photo.alt || "";
    caption.textContent = `${index + 1} / ${photos.length}`;
  }

  function open(startIndex, galleryPhotos) {
    photos = galleryPhotos;
    show(startIndex || 0);
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    closeBtn.focus();
  }

  function close() {
    lightbox.hidden = true;
    img.src = "";
    document.body.classList.remove("lightbox-open");
  }

  function setupGallery(gallery) {
    const items = [...gallery.querySelectorAll(".gallery__item")].filter((item) => {
      const image = item.querySelector("img");
      return image && image.getAttribute("src");
    });

    if (!items.length) return;

    const galleryPhotos = items.map((item) => {
      const image = item.querySelector("img");
      return {
        src: image.currentSrc || image.src,
        alt: image.alt || "",
      };
    });

    const cover = items[0];
    cover.classList.add("gallery__cover");

    // Solo la portada en la página
    items.slice(1).forEach((item) => {
      item.hidden = true;
      item.setAttribute("aria-hidden", "true");
    });

    if (!cover.querySelector(".gallery__overlay")) {
      const overlay = document.createElement("button");
      overlay.type = "button";
      overlay.className = "gallery__overlay";
      overlay.setAttribute("aria-label", "Ver galería");
      overlay.innerHTML = `<span class="gallery__overlay-text">Ver galería</span>`;
      cover.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        e.stopPropagation();
        open(0, galleryPhotos);
      });
    }

    cover.addEventListener("click", (e) => {
      if (e.target.closest(".gallery__overlay")) return;
      open(0, galleryPhotos);
    });
  }

  galleries.forEach(setupGallery);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });
  backdrop.addEventListener("click", close);
  prevBtn.addEventListener("click", () => show(index - 1));
  nextBtn.addEventListener("click", () => show(index + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });

  // Un dedo = cambiar foto. Dos dedos (pellizcar) = no cambiar.
  lightbox.addEventListener(
    "touchstart",
    (e) => {
      if (lightbox.hidden) return;
      if (e.touches.length >= 2) {
        multiTouch = true;
        tracking = false;
        return;
      }
      if (e.touches.length === 1 && !multiTouch) {
        tracking = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  lightbox.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length >= 2) {
        multiTouch = true;
        tracking = false;
      }
    },
    { passive: true }
  );

  lightbox.addEventListener(
    "touchend",
    (e) => {
      if (lightbox.hidden) return;

      // Si hubo pellizco / 2 dedos, nunca cambiar de foto
      if (multiTouch) {
        if (e.touches.length === 0) multiTouch = false;
        tracking = false;
        return;
      }

      if (!tracking || e.changedTouches.length === 0) return;

      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      tracking = false;

      // Solo swipe horizontal claro con un dedo
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      if (dx > 0) show(index - 1);
      else show(index + 1);
    },
    { passive: true }
  );

  lightbox.addEventListener(
    "touchcancel",
    () => {
      multiTouch = false;
      tracking = false;
    },
    { passive: true }
  );
})();
