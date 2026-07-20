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
      <img class="lightbox__img" src="" alt="">
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

  function show(i) {
    if (!photos.length) return;
    index = (i + photos.length) % photos.length;
    const photo = photos[index];
    img.src = photo.src;
    img.alt = photo.alt || "";
    caption.textContent = `${index + 1} / ${photos.length}`;
  }

  function open(startIndex) {
    if (!photos.length) return;
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
      return { src: image.src, alt: image.alt || "" };
    });

    // Cover: primera foto oscurecida + "Ver galería"
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
        photos = galleryPhotos;
        open(0);
      });
    }

    // El resto solo vive dentro del lightbox
    items.slice(1).forEach((item) => {
      item.hidden = true;
      item.setAttribute("aria-hidden", "true");
    });
  }

  galleries.forEach(setupGallery);

  closeBtn.addEventListener("click", close);
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

  // Swipe en móvil
  let touchX = null;
  lightbox.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );
  lightbox.addEventListener(
    "touchend",
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].screenX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      if (dx > 0) show(index - 1);
      else show(index + 1);
    },
    { passive: true }
  );
})();
