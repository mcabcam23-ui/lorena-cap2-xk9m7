(function () {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
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

  document.querySelectorAll(".gallery img[src]:not([src=''])").forEach((thumb) => {
    thumb.closest(".gallery__item")?.classList.add("gallery__item--zoomable");
    thumb.addEventListener("click", () => open(thumb.src, thumb.alt));
  });

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) close();
  });
})();
