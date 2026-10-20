import { fetchCard, FaceitError } from "./faceit.js";
import { renderCard } from "./renderer.js";
import { STEAM_UPLOAD_URL } from "./config.js";

const $ = (id) => document.getElementById(id);
let current = null; // { files: [{name, blob}] }

function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg;
  el.className = isError ? "error" : "";
}

const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

async function init() {
  const { lastQuery, lastMode } = await chrome.storage.local.get(["lastQuery", "lastMode"]);
  if (lastQuery) $("query").value = lastQuery;
  if (lastMode) $("mode").value = lastMode;
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("query").value;
  const mode = $("mode").value;
  $("generate").disabled = true;
  $("preview").hidden = true;
  setStatus("Fetching stats…");
  try {
    const card = await fetchCard(query);
    setStatus("Rendering…");
    const out = await renderCard(card, mode);
    current = out;

    const main = $("canvas");
    main.width = out.canvas.width;
    main.height = out.canvas.height;
    main.getContext("2d").drawImage(out.canvas, 0, 0);

    // Preview the side image for the two-part showcase.
    $("sidewrap").hidden = out.files.length < 2;
    if (out.files.length > 1) {
      const bmp = await createImageBitmap(out.files[1].blob);
      const sc = $("sidecanvas");
      sc.width = bmp.width;
      sc.height = bmp.height;
      sc.getContext("2d").drawImage(bmp, 0, 0);
    }

    $("preview").hidden = false;
    setStatus(`${card.nickname} · Level ${card.level ?? "?"} · ${card.elo ?? "?"} ELO`);
    chrome.storage.local.set({ lastQuery: query, lastMode: mode });
  } catch (err) {
    if (err instanceof FaceitError) {
      setStatus(err.message, true);
      if (err.code === "NO_KEY" || err.code === "RATE_LIMIT" || err.code === "AUTH") {
        $("settings").open = true;
      }
    } else {
      console.error(err);
      setStatus("Something went wrong: " + err.message, true);
    }
  } finally {
    $("generate").disabled = false;
  }
});

$("download").addEventListener("click", () => {
  if (!current) return;
  for (const f of current.files) {
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
});

$("send").addEventListener("click", async () => {
  if (!current) return;
  const files = [];
  for (const f of current.files) files.push({ name: f.name, dataUrl: await blobToDataUrl(f.blob) });
  await chrome.storage.local.set({ pendingUpload: { files, createdAt: Date.now() } });
  chrome.tabs.create({ url: STEAM_UPLOAD_URL });
});

$("savekey").addEventListener("click", async () => {
  const key = $("apikey").value.trim();
  await chrome.storage.local.set({ userApiKey: key });
  $("apikey").value = "";
  setStatus(key ? "API key saved." : "API key cleared.");
});

init();
