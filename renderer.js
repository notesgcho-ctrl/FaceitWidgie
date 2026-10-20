// Canvas stat-card renderer. All drawing happens locally in the popup.

const W = 630;           // logical design width
const H = 400;           // logical design height
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Faceit-style level colours (original palette, no Faceit badge art is used).
const LEVEL_COLORS = ["#9aa0a6", "#4caf50", "#4caf50", "#ffc107", "#ffc107", "#ffc107", "#ffc107", "#ff7a1a", "#ff7a1a", "#ff3d2e"];

function levelColor(level) {
  if (!level) return "#9aa0a6";
  return LEVEL_COLORS[Math.min(10, Math.max(1, level)) - 1];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadAvatar(url) {
  if (!url) return null;
  try {
    // fetch -> blob -> bitmap avoids tainting the canvas (host permission required).
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function drawLevelBadge(ctx, cx, cy, r, level) {
  const color = levelColor(level);
  ctx.save();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = color;
  ctx.fillStyle = "#14161a";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `800 ${r * 1.1}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(level ?? "?", cx, cy + r * 0.05);
  ctx.restore();
}

function fmt(v, digits = 2, suffix = "") {
  if (v === null || v === undefined) return "—";
  return v.toFixed(digits) + suffix;
}

function drawBackground(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#1b1e24");
  g.addColorStop(1, "#0d0f12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // accent glow
  const r = ctx.createRadialGradient(w, 0, 10, w, 0, w * 0.8);
  r.addColorStop(0, "rgba(255,85,0,0.25)");
  r.addColorStop(1, "rgba(255,85,0,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
}

/** Draws the main card at logical size W×H into ctx (caller applies scale). */
async function drawMain(ctx, card) {
  drawBackground(ctx, W, H);

  // Header: avatar, nickname, level
  const avatar = await loadAvatar(card.avatar);
  const ax = 28, ay = 28, as = 84;
  ctx.save();
  roundRect(ctx, ax, ay, as, as, 14);
  ctx.clip();
  if (avatar) {
    ctx.drawImage(avatar, ax, ay, as, as);
  } else {
    ctx.fillStyle = "#2a2e36";
    ctx.fillRect(ax, ay, as, as);
    ctx.fillStyle = "#ff5500";
    ctx.font = `800 40px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((card.nickname || "?").slice(0, 1).toUpperCase(), ax + as / 2, ay + as / 2);
  }
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  let size = 36;
  ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(card.nickname).width > 340 && size > 18) {
    size -= 2;
    ctx.font = `800 ${size}px ${FONT}`;
  }
  ctx.fillText(card.nickname, 128, 68);
  ctx.fillStyle = "#8b93a1";
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText(`FACEIT · ${card.game === "cs2" ? "CS2" : "CS:GO"}${card.country ? " · " + card.country.toUpperCase() : ""}`, 128, 98);

  // Level badge + ELO (right)
  drawLevelBadge(ctx, W - 118, 70, 38, card.level);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText(card.elo ?? "—", W - 66, 68);
  ctx.fillStyle = "#8b93a1";
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText("ELO", W - 66, 88);

  // Divider
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(28, 138, W - 56, 2);

  // Stat grid 3×3
  const stats = [
    ["WIN RATE", fmt(card.winRate, 0, "%")],
    ["MATCHES", card.matches === null ? "—" : String(Math.round(card.matches))],
    ["K/D", fmt(card.kd)],
    ["KDA", fmt(card.kda)],
    ["KR", fmt(card.kr)],
    ["HEADSHOT %", fmt(card.hs, 0, "%")],
    ["ADR", fmt(card.adr, 1)],
  ];
  const cols = 3, gx = 28, gy = 160, gw = (W - 56 - 24) / cols, gh = 100, gap = 12;
  stats.forEach(([label, value], i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = gx + c * (gw + 12), y = gy + r * (gh + gap);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, x, y, gw, gh, 12);
    ctx.fill();
    ctx.fillStyle = "#8b93a1";
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(label, x + 16, y + 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 36px ${FONT}`;
    ctx.fillText(value, x + 16, y + 74);
  });

  // Footer accent bar
  ctx.fillStyle = "#ff5500";
  ctx.fillRect(0, H - 6, W, 6);
}

/** Slim 100px-wide companion image for the two-part Artwork Showcase. */
async function drawSide(ctx, card, w, h) {
  drawBackground(ctx, w, h);
  drawLevelBadge(ctx, w / 2, 52, 30, card.level);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText(card.elo ?? "—", w / 2, 112);
  ctx.fillStyle = "#8b93a1";
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText("ELO", w / 2, 128);
  ctx.fillStyle = "#fff";
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText(fmt(card.kd), w / 2, 180);
  ctx.fillStyle = "#8b93a1";
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText("K/D", w / 2, 196);
  ctx.fillStyle = "#fff";
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText(fmt(card.winRate, 0, "%"), w / 2, 246);
  ctx.fillStyle = "#8b93a1";
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText("WIN", w / 2, 262);
  ctx.fillStyle = "#ff5500";
  ctx.fillRect(0, h - 4, w, 4);
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const toBlob = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));

/**
 * mode: "featured" -> one 630px-wide PNG
 *       "showcase" -> 506px-wide main PNG + 100px-wide side PNG
 * Returns { canvas (preview), files: [{name, blob}] }
 */
export async function renderCard(card, mode = "featured") {
  if (document.fonts?.ready) await document.fonts.ready;

  if (mode === "featured") {
    const canvas = makeCanvas(W, H);
    await drawMain(canvas.getContext("2d"), card);
    return { canvas, files: [{ name: "faceit-featured-630.png", blob: await toBlob(canvas) }] };
  }

  const mw = 506, mh = Math.round(H * (506 / W));
  const main = makeCanvas(mw, mh);
  const mctx = main.getContext("2d");
  mctx.scale(mw / W, mw / W);
  await drawMain(mctx, card);

  const side = makeCanvas(100, mh);
  await drawSide(side.getContext("2d"), card, 100, mh);

  return {
    canvas: main,
    files: [
      { name: "faceit-showcase-506.png", blob: await toBlob(main) },
      { name: "faceit-showcase-side-100.png", blob: await toBlob(side) },
    ],
  };
}
