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
    <div class="lightbox__backdrop" aria-hidden="true"></div>
    <div class="lightbox__scroll"></div>
  `;
  document.body.appendChild(lightbox);

  const closeBtn = lightbox.querySelector(".lightbox__close");
  const backdrop = lightbox.querySelector(".lightbox__backdrop");
  const scroll = lightbox.querySelector(".lightbox__scroll");

  function open(photos) {
    scroll.innerHTML = "";
    photos.forEach((photo) => {
      const figure = document.createElement("figure");
      figure.className = "lightbox__figure";
      const img = document.createElement("img");
      img.className = "lightbox__img";
      img.src = photo.src;
      img.alt = photo.alt || "";
      img.draggable = false;
      figure.appendChild(img);
      scroll.appendChild(figure);
    });
    scroll.scrollTop = 0;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    closeBtn.focus();
  }

  function close() {
    lightbox.hidden = true;
    scroll.innerHTML = "";
    document.body.classList.remove("lightbox-open");
  }

  function setupGallery(gallery) {
    const items = [...gallery.querySelectorAll(".gallery__item")].filter((item) => {
      const image = item.querySelector("img");
      return image && image.getAttribute("src");
    });

    if (!items.length) return;

    const photos = items.map((item) => {
      const image = item.querySelector("img");
      return {
        src: image.currentSrc || image.src,
        alt: image.alt || "",
      };
    });

    const cover = items[0];
    cover.classList.add("gallery__cover");

    // Solo la portada en la página; el resto no se muestra debajo
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
      overlay.addEventListener("click", () => open(photos));
    }

    // Tocar la portada también abre la galería
    cover.addEventListener("click", (e) => {
      if (e.target.closest(".gallery__overlay") || e.target === cover.querySelector(".gallery__overlay")) {
        return;
      }
      open(photos);
    });
  }

  galleries.forEach(setupGallery);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });
  backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) close();
  });
})();
