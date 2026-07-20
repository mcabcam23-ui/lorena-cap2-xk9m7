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
      <img class="lightbox__img" src="" alt="">
    </figure>
  `;
  document.body.appendChild(lightbox);

  const img = lightbox.querySelector(".lightbox__img");
  const closeBtn = lightbox.querySelector(".lightbox__close");
  const backdrop = lightbox.querySelector(".lightbox__backdrop");

  function open(src, alt) {
    img.src = src;
    img.alt = alt || "";
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

    // Resto oculto hasta "Ver galería"
    items.slice(1).forEach((item) => {
      item.hidden = true;
      item.setAttribute("aria-hidden", "true");
    });

    // Cada foto se amplía sola (sin pasar a otra)
    items.forEach((item) => {
      const image = item.querySelector("img");
      item.classList.add("gallery__item--zoomable");
      item.addEventListener("click", (e) => {
        if (e.target.closest(".gallery__overlay")) return;
        if (!gallery.classList.contains("gallery--open") && item === cover) return;
        open(image.src, image.alt);
      });
    });
  }

  galleries.forEach(setupGallery);

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) close();
  });
})();
