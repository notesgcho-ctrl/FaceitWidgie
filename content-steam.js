// Runs only on steamcommunity.com/sharedfiles/edititem/*.
// Reads the image the popup stored and assigns it to Steam's own file input.
// It never reads cookies, tokens or form credentials, and never submits the form:
// the user reviews and clicks Steam's Upload button themselves.

(async () => {
  const MAX_AGE_MS = 10 * 60 * 1000;
  const { pendingUpload } = await chrome.storage.local.get("pendingUpload");
  if (!pendingUpload || Date.now() - pendingUpload.createdAt > MAX_AGE_MS) return;

  const input = await waitFor(() => document.querySelector('input[type="file"]'), 15000);
  if (!input) return banner("Faceit card: couldn't find Steam's file picker. Use Download PNG in the extension popup instead.", true);

  const files = pendingUpload.files.map(toFile);
  let index = 0;

  function fill(i) {
    const dt = new DataTransfer();
    dt.items.add(files[i]);
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  try {
    fill(0);
    if (!input.files.length) throw new Error("input rejected file");
  } catch {
    return banner("Faceit card: Steam blocked the automatic fill. Use Download PNG in the extension popup and choose the file manually.", true);
  }

  // Clear the stored image so it isn't re-injected on the next visit.
  await chrome.storage.local.remove("pendingUpload");

  const extra = files.length > 1 ? " Showcase mode: upload the main image first, then use “Load side image” for the 100px one." : "";
  const el = banner(`Faceit card loaded into Steam's file picker. Review it and press Upload.${extra}`);
  if (files.length > 1) {
    const btn = document.createElement("button");
    btn.textContent = "Load side image";
    btn.style.cssText = "margin-left:10px;padding:4px 8px;cursor:pointer;";
    btn.onclick = () => {
      index = (index + 1) % files.length;
      fill(index);
      btn.textContent = index === 0 ? "Load side image" : "Load main image";
    };
    el.appendChild(btn);
  }

  function toFile({ name, dataUrl }) {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  }

  function waitFor(fn, timeout) {
    return new Promise((resolve) => {
      const found = fn();
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = fn();
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(fn()); }, timeout);
    });
  }

  function banner(text, isError = false) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText =
      "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;max-width:560px;" +
      "padding:10px 14px;border-radius:8px;font:13px/1.4 Arial,sans-serif;color:#fff;" +
      `background:${isError ? "#b3261e" : "#1d6b3a"};box-shadow:0 4px 16px rgba(0,0,0,.4);`;
    document.body.appendChild(el);
    return el;
  }
})();
