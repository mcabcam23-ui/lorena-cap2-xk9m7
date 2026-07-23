(function () {
  const STORAGE_KEY = "lorena-ano3-v1";
  const DB_NAME = "lorena-ano3";
  const DB_STORE = "photos";
  const MAX_PHOTO_EDGE = 1600;
  const JPEG_QUALITY = 0.82;

  const letterEl = document.getElementById("letter");
  const galleryEl = document.getElementById("gallery");
  const timelineEl = document.getElementById("timeline");
  const photosEmpty = document.getElementById("photos-empty");
  const momentsEmpty = document.getElementById("moments-empty");
  const statusEl = document.getElementById("edit-status");

  const btnEdit = document.getElementById("btn-edit");
  const btnSave = document.getElementById("btn-save");
  const btnExport = document.getElementById("btn-export");
  const btnImport = document.getElementById("btn-import");
  const btnImportLabel = document.getElementById("btn-import-label");
  const btnAddPhoto = document.getElementById("btn-add-photo");
  const btnAddMoment = document.getElementById("btn-add-moment");
  const photoInput = document.getElementById("photo-input");

  let editing = false;
  let state = {
    letterHtml: letterEl.innerHTML,
    moments: [],
    photoIds: [],
  };

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(id, blob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDelete(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.letterHtml) state.letterHtml = data.letterHtml;
      if (Array.isArray(data.moments)) state.moments = data.moments;
      if (Array.isArray(data.photoIds)) state.photoIds = data.photoIds;
    } catch (_) {
      /* ignore corrupt storage */
    }
  }

  function saveMeta() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        letterHtml: state.letterHtml,
        moments: state.moments,
        photoIds: state.photoIds,
        updatedAt: new Date().toISOString(),
      })
    );
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const max = Math.max(width, height);
        if (max > MAX_PHOTO_EDGE) {
          const scale = MAX_PHOTO_EDGE / max;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir"))),
          "image/jpeg",
          JPEG_QUALITY
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Imagen no válida"));
      };
      img.src = url;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mime = (header.match(/:(.*?);/) || [])[1] || "image/jpeg";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function renderLetter() {
    letterEl.innerHTML = state.letterHtml;
    letterEl.contentEditable = editing ? "true" : "false";
    letterEl.classList.toggle("is-editing", editing);
  }

  const objectUrls = new Set();

  function revokeObjectUrls() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
  }

  async function renderPhotos() {
    revokeObjectUrls();
    galleryEl.querySelectorAll(".gallery__item").forEach((el) => el.remove());
    photosEmpty.hidden = state.photoIds.length > 0;

    for (let i = 0; i < state.photoIds.length; i++) {
      const id = state.photoIds[i];
      const blob = await idbGet(id);
      if (!blob) continue;

      const item = document.createElement("div");
      item.className = "gallery__item" + (i === 0 ? " gallery__item--wide" : "");
      item.dataset.id = id;

      const img = document.createElement("img");
      const url = URL.createObjectURL(blob);
      objectUrls.add(url);
      img.src = url;
      img.alt = "Foto del año 3";
      item.appendChild(img);

      if (editing) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "gallery__remove";
        remove.setAttribute("aria-label", "Quitar foto");
        remove.textContent = "×";
        remove.addEventListener("click", async (e) => {
          e.stopPropagation();
          state.photoIds = state.photoIds.filter((x) => x !== id);
          await idbDelete(id);
          saveMeta();
          await renderPhotos();
          setStatus("Foto eliminada");
        });
        item.appendChild(remove);
      }

      galleryEl.appendChild(item);
    }
  }

  function renderMoments() {
    timelineEl.innerHTML = "";
    momentsEmpty.hidden = state.moments.length > 0;

    state.moments.forEach((moment, index) => {
      const li = document.createElement("li");
      li.className = "timeline__item";
      if (editing) li.classList.add("timeline__item--editable");

      const date = document.createElement("p");
      date.className = "timeline__date";
      date.textContent = moment.date || "Fecha";
      date.contentEditable = editing ? "true" : "false";

      const text = document.createElement("p");
      text.className = "timeline__text";
      text.textContent = moment.text || "Escribe el momento…";
      text.contentEditable = editing ? "true" : "false";

      date.addEventListener("input", () => {
        state.moments[index].date = date.textContent.trim();
      });
      text.addEventListener("input", () => {
        state.moments[index].text = text.textContent.trim();
      });

      li.appendChild(date);
      li.appendChild(text);

      if (editing) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "timeline__remove";
        remove.setAttribute("aria-label", "Quitar momento");
        remove.textContent = "Quitar";
        remove.addEventListener("click", () => {
          state.moments.splice(index, 1);
          renderMoments();
          setStatus("Momento eliminado");
        });
        li.appendChild(remove);
      }

      timelineEl.appendChild(li);
    });
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("is-editing", on);
    btnEdit.hidden = on;
    btnSave.hidden = !on;
    btnExport.hidden = !on;
    btnImportLabel.hidden = !on;
    btnAddPhoto.hidden = !on;
    btnAddMoment.hidden = !on;
    renderLetter();
    renderMoments();
    renderPhotos();
    setStatus(on ? "Modo edición" : "");
  }

  function collectAndSave() {
    state.letterHtml = letterEl.innerHTML;
    saveMeta();
    setStatus("Guardado ✓");
  }

  async function exportBackup() {
    collectAndSave();
    const photos = {};
    for (const id of state.photoIds) {
      const blob = await idbGet(id);
      if (blob) photos[id] = await blobToDataUrl(blob);
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      letterHtml: state.letterHtml,
      moments: state.moments,
      photoIds: state.photoIds,
      photos,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lorena-ano3-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Exportado");
  }

  async function importBackup(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    state.letterHtml = data.letterHtml || state.letterHtml;
    state.moments = Array.isArray(data.moments) ? data.moments : [];
    state.photoIds = Array.isArray(data.photoIds) ? data.photoIds : [];

    if (data.photos && typeof data.photos === "object") {
      for (const id of state.photoIds) {
        if (data.photos[id]) {
          await idbPut(id, dataUrlToBlob(data.photos[id]));
        }
      }
    }

    saveMeta();
    renderLetter();
    renderMoments();
    await renderPhotos();
    setStatus("Importado ✓");
  }

  btnEdit.addEventListener("click", () => setEditing(true));
  btnSave.addEventListener("click", () => {
    collectAndSave();
    setEditing(false);
  });
  btnExport.addEventListener("click", () => {
    exportBackup().catch(() => setStatus("Error al exportar"));
  });
  btnImport.addEventListener("change", () => {
    const file = btnImport.files && btnImport.files[0];
    btnImport.value = "";
    if (!file) return;
    importBackup(file).catch(() => setStatus("Error al importar"));
  });

  btnAddMoment.addEventListener("click", () => {
    state.moments.push({
      date: "Fecha",
      text: "Escribe el momento…",
    });
    renderMoments();
    const last = timelineEl.querySelector(".timeline__item:last-child .timeline__date");
    if (last) last.focus();
  });

  btnAddPhoto.addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", async () => {
    const files = [...(photoInput.files || [])];
    photoInput.value = "";
    if (!files.length) return;

    setStatus("Añadiendo fotos…");
    for (const file of files) {
      try {
        const blob = await compressImage(file);
        const id = "p-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        await idbPut(id, blob);
        state.photoIds.push(id);
      } catch (_) {
        /* skip bad file */
      }
    }
    saveMeta();
    await renderPhotos();
    setStatus("Fotos añadidas");
  });

  loadMeta();
  renderLetter();
  renderMoments();
  renderPhotos().catch(() => setStatus("Error al cargar fotos"));
})();
