import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

const STORAGE_KEY = "lorena-ano3-v1";
const DB_NAME = "lorena-ano3";
const DB_STORE = "photos";
const DOC_PATH = ["capitulos", "ano3"];
const MAX_PHOTO_EDGE = 1600;
const JPEG_QUALITY = 0.82;

const MONTHS_ES = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

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
let applyingRemote = false;
let lastRemoteUpdatedAt = "";
let cloudReady = false;
let unsubSnapshot = null;

let state = {
  letterHtml: letterEl.innerHTML,
  moments: [],
  photoIds: [],
  updatedAt: "",
};

const firebaseConfig = window.LORENA_FIREBASE_CONFIG;
if (!firebaseConfig || !firebaseConfig.projectId) {
  setStatus("Falta la config de Firebase");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const ano3Ref = doc(db, ...DOC_PATH);

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function toIso(year, month, day) {
  if (!year || !month || !day) return "";
  const iso = year + "-" + pad2(month) + "-" + pad2(day);
  return isIsoDate(iso) ? iso : "";
}

function todayIso() {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function formatDateEs(iso) {
  if (!isIsoDate(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return d + " de " + MONTH_NAMES_ES[m - 1] + " de " + y;
}

function parseFlexibleDate(raw) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s || /^fecha$/i.test(s)) return "";
  if (isIsoDate(s)) return s;

  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return toIso(+m[3], +m[2], +m[1]);

  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return toIso(+m[1], +m[2], +m[3]);

  const normalized = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  m = normalized.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]+)\s*(?:de\s+)?(\d{4})$/);
  if (m) {
    const month = MONTHS_ES[m[2]];
    if (month) return toIso(+m[3], month, +m[1]);
  }

  m = normalized.match(/^([a-z]+)\s*(?:de\s+)?(\d{4})$/);
  if (m) {
    const month = MONTHS_ES[m[1]];
    if (month) return toIso(+m[2], month, 1);
  }

  return "";
}

function displayDate(moment) {
  if (isIsoDate(moment.date)) return formatDateEs(moment.date);
  if (moment.date && !/^fecha$/i.test(String(moment.date).trim())) {
    return String(moment.date).trim();
  }
  return "Sin fecha";
}

function sortKey(date) {
  if (isIsoDate(date)) return date;
  const parsed = parseFlexibleDate(date);
  return parsed || null;
}

function sortMoments() {
  state.moments.sort((a, b) => {
    const ka = sortKey(a.date);
    const kb = sortKey(b.date);
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
}

function migrateMoment(moment) {
  const raw = moment && moment.date != null ? String(moment.date) : "";
  const parsed = parseFlexibleDate(raw);
  if (parsed) return { date: parsed, text: moment.text || "" };
  if (!raw || /^fecha$/i.test(raw.trim())) {
    return { date: "", text: moment.text || "" };
  }
  return { date: raw.trim(), text: moment.text || "" };
}

function migrateMoments(list) {
  return (Array.isArray(list) ? list : []).map(migrateMoment);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(DB_STORE)) {
        idb.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(id, blob) {
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(id) {
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readwrite");
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
    if (Array.isArray(data.photoIds)) state.photoIds = data.photoIds;
    if (data.updatedAt) state.updatedAt = data.updatedAt;
    if (Array.isArray(data.moments)) {
      state.moments = migrateMoments(data.moments);
      sortMoments();
    }
  } catch (_) {
    /* ignore */
  }
}

function saveMeta() {
  sortMoments();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      letterHtml: state.letterHtml,
      moments: state.moments,
      photoIds: state.photoIds,
      updatedAt: state.updatedAt || new Date().toISOString(),
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
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
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

function photoStorageRef(id) {
  return ref(storage, "ano3/photos/" + id);
}

async function ensurePhotoLocal(id) {
  const existing = await idbGet(id);
  if (existing) return existing;
  try {
    const url = await getDownloadURL(photoStorageRef(id));
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    await idbPut(id, blob);
    return blob;
  } catch (_) {
    return null;
  }
}

async function uploadPhoto(id, blob) {
  await uploadBytes(photoStorageRef(id), blob, {
    contentType: blob.type || "image/jpeg",
  });
}

async function deleteRemotePhoto(id) {
  try {
    await deleteObject(photoStorageRef(id));
  } catch (_) {
    /* already gone */
  }
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
    const blob = await ensurePhotoLocal(id);
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
        setStatus("Foto eliminada (guarda para sincronizar)");
      });
      item.appendChild(remove);
    }

    galleryEl.appendChild(item);
  }
}

function renderMoments(focusMoment) {
  sortMoments();
  timelineEl.innerHTML = "";
  momentsEmpty.hidden = state.moments.length > 0;

  state.moments.forEach((moment) => {
    const li = document.createElement("li");
    li.className = "timeline__item";
    if (editing) li.classList.add("timeline__item--editable");

    if (editing) {
      const dateWrap = document.createElement("div");
      dateWrap.className = "timeline__date-field";

      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.className = "timeline__date-input";
      dateInput.setAttribute("aria-label", "Fecha del momento");
      const isoValue = isIsoDate(moment.date)
        ? moment.date
        : parseFlexibleDate(moment.date);
      dateInput.value = isoValue || "";

      const datePreview = document.createElement("p");
      datePreview.className = "timeline__date timeline__date-preview";
      datePreview.textContent = isoValue
        ? formatDateEs(isoValue)
        : moment.date && !/^fecha$/i.test(String(moment.date).trim())
          ? String(moment.date).trim() + " · elige una fecha"
          : "Elige una fecha";

      dateInput.addEventListener("change", () => {
        const next = dateInput.value;
        moment.date = isIsoDate(next) ? next : "";
        sortMoments();
        renderMoments(moment);
      });

      dateWrap.appendChild(dateInput);
      dateWrap.appendChild(datePreview);
      li.appendChild(dateWrap);
    } else {
      const date = document.createElement("p");
      date.className = "timeline__date";
      date.textContent = displayDate(moment);
      li.appendChild(date);
    }

    const text = document.createElement("p");
    text.className = "timeline__text";
    const placeholder = "Escribe el momento…";
    const hasText = Boolean(moment.text && moment.text !== placeholder);
    text.textContent = hasText ? moment.text : editing ? placeholder : "";
    if (!hasText && editing) text.classList.add("placeholder");
    text.contentEditable = editing ? "true" : "false";

    text.addEventListener("input", () => {
      const value = text.textContent.trim();
      moment.text = value === placeholder ? "" : value;
      text.classList.toggle("placeholder", !moment.text);
    });
    text.addEventListener("focus", () => {
      if (text.textContent.trim() === placeholder) {
        text.textContent = "";
        text.classList.remove("placeholder");
      }
    });
    text.addEventListener("blur", () => {
      if (!text.textContent.trim()) {
        text.textContent = placeholder;
        text.classList.add("placeholder");
        moment.text = "";
      }
    });

    li.appendChild(text);

    if (editing) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "timeline__remove";
      remove.setAttribute("aria-label", "Quitar momento");
      remove.textContent = "Quitar";
      remove.addEventListener("click", () => {
        const idx = state.moments.indexOf(moment);
        if (idx >= 0) state.moments.splice(idx, 1);
        renderMoments();
        setStatus("Momento eliminado");
      });
      li.appendChild(remove);
    }

    timelineEl.appendChild(li);

    if (focusMoment === moment) {
      const input = li.querySelector(".timeline__date-input");
      if (input) requestAnimationFrame(() => input.focus());
    }
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
  setStatus(on ? "Modo edición" : cloudReady ? "Sincronizado" : "");
}

function collectLocal() {
  state.letterHtml = letterEl.innerHTML;
  state.moments = state.moments.map((m) => ({
    date: isIsoDate(m.date) ? m.date : parseFlexibleDate(m.date) || m.date || "",
    text:
      (m.text || "").trim() === "Escribe el momento…"
        ? ""
        : (m.text || "").trim(),
  }));
  sortMoments();
}

async function pushToCloud() {
  if (!cloudReady) throw new Error("Cloud no listo");
  collectLocal();
  setStatus("Sincronizando…");

  const remoteSnap = await getDoc(ano3Ref);
  const remoteIds = remoteSnap.exists()
    ? remoteSnap.data().photoIds || []
    : [];

  for (const id of state.photoIds) {
    const blob = await idbGet(id);
    if (blob) await uploadPhoto(id, blob);
  }

  for (const id of remoteIds) {
    if (!state.photoIds.includes(id)) {
      await deleteRemotePhoto(id);
    }
  }

  const updatedAt = new Date().toISOString();
  const payload = {
    letterHtml: state.letterHtml,
    moments: state.moments,
    photoIds: state.photoIds,
    updatedAt,
  };

  await setDoc(ano3Ref, payload);
  state.updatedAt = updatedAt;
  lastRemoteUpdatedAt = updatedAt;
  saveMeta();
  setStatus("Guardado y sincronizado ✓");
}

async function applyRemoteData(data) {
  if (!data) return;
  if (data.updatedAt && data.updatedAt === lastRemoteUpdatedAt) return;
  if (editing) {
    setStatus("Cambios en la nube (guarda cuando termines)");
    return;
  }

  applyingRemote = true;
  try {
    if (typeof data.letterHtml === "string") state.letterHtml = data.letterHtml;
    state.moments = migrateMoments(data.moments);
    sortMoments();
    state.photoIds = Array.isArray(data.photoIds) ? data.photoIds : [];
    state.updatedAt = data.updatedAt || "";
    lastRemoteUpdatedAt = state.updatedAt;
    saveMeta();

    for (const id of state.photoIds) {
      await ensurePhotoLocal(id);
    }

    renderLetter();
    renderMoments();
    await renderPhotos();
    setStatus("Actualizado desde la nube");
  } finally {
    applyingRemote = false;
  }
}

function startCloudSync() {
  if (unsubSnapshot) unsubSnapshot();
  unsubSnapshot = onSnapshot(
    ano3Ref,
    (snap) => {
      if (!snap.exists()) {
        cloudReady = true;
        setStatus(editing ? "Modo edición" : "Listo para sincronizar");
        return;
      }
      cloudReady = true;
      applyRemoteData(snap.data()).catch(() =>
        setStatus("Error al aplicar cambios remotos")
      );
    },
    (err) => {
      console.error(err);
      setStatus("Error de sincronización");
    }
  );
}

async function exportBackup() {
  collectLocal();
  saveMeta();
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
  state.moments = migrateMoments(data.moments);
  sortMoments();
  state.photoIds = Array.isArray(data.photoIds) ? data.photoIds : [];

  if (data.photos && typeof data.photos === "object") {
    for (const id of state.photoIds) {
      if (data.photos[id]) await idbPut(id, dataUrlToBlob(data.photos[id]));
    }
  }

  saveMeta();
  renderLetter();
  renderMoments();
  await renderPhotos();
  setStatus("Importado — pulsa Guardar para sincronizar");
}

btnEdit.addEventListener("click", () => setEditing(true));
btnSave.addEventListener("click", async () => {
  try {
    await pushToCloud();
    setEditing(false);
  } catch (err) {
    console.error(err);
    collectLocal();
    saveMeta();
    setStatus("Guardado local (revisa Auth/Firestore/Storage)");
    setEditing(false);
  }
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
  const moment = { date: todayIso(), text: "" };
  state.moments.push(moment);
  sortMoments();
  renderMoments(moment);
  setStatus("Momento añadido");
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
      /* skip */
    }
  }
  saveMeta();
  await renderPhotos();
  setStatus("Fotos añadidas (guarda para sincronizar)");
});

loadMeta();
renderLetter();
renderMoments();
renderPhotos().catch(() => setStatus("Error al cargar fotos"));

setStatus("Conectando…");
onAuthStateChanged(auth, async (user) => {
  if (user) {
    cloudReady = true;
    startCloudSync();
    return;
  }
  try {
    await signInAnonymously(auth);
  } catch (err) {
    console.error(err);
    setStatus("Activa Authentication → Anónimo en Firebase");
  }
});
