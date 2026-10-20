import { DEFAULT_API_KEY } from "./config.js";

const BASE = "https://open.faceit.com/data/v4";

export class FaceitError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // "NO_KEY" | "RATE_LIMIT" | "AUTH" | "NOT_FOUND" | "HTTP" | "NO_STATS"
  }
}

async function getKey() {
  const { userApiKey } = await chrome.storage.local.get("userApiKey");
  return (userApiKey || DEFAULT_API_KEY || "").trim();
}

async function api(path) {
  const key = await getKey();
  if (!key) throw new FaceitError("No Faceit API key set. Add one in Settings.", "NO_KEY");
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${key}` } });
  if (res.status === 429) throw new FaceitError("Rate limited by Faceit. Add your own API key in Settings.", "RATE_LIMIT");
  if (res.status === 401 || res.status === 403) throw new FaceitError("Faceit rejected the API key.", "AUTH");
  if (res.status === 404) throw new FaceitError("Player not found.", "NOT_FOUND");
  if (!res.ok) throw new FaceitError(`Faceit API error (${res.status}).`, "HTTP");
  return res.json();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPlayer(input) {
  const q = input.trim();
  if (!q) throw new FaceitError("Enter a Faceit nickname or player ID.", "NOT_FOUND");
  // Accept pasted profile URLs: faceit.com/en/players/<nick>
  const m = q.match(/faceit\.com\/[^/]+\/players\/([^/?#]+)/i);
  const term = m ? decodeURIComponent(m[1]) : q;
  if (UUID_RE.test(term)) return api(`/players/${term}`);
  return api(`/players?nickname=${encodeURIComponent(term)}`);
}

// Look up the first present key from a list of candidate names.
function pick(obj, names) {
  for (const n of names) {
    if (obj && obj[n] !== undefined && obj[n] !== "") return obj[n];
  }
  return null;
}

const num = (v) => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[%,]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Fetch player + lifetime stats and normalise into the card model. */
export async function fetchCard(input) {
  const player = await fetchPlayer(input);
  let game = "cs2";
  let gameInfo = player.games?.cs2;
  if (!gameInfo && player.games?.csgo) {
    game = "csgo";
    gameInfo = player.games.csgo;
  }
  if (!gameInfo) throw new FaceitError("This player has no CS2/CS:GO stats on Faceit.", "NO_STATS");

  const stats = await api(`/players/${player.player_id}/stats/${game}`);
  const l = stats.lifetime || {};

  const kd = num(pick(l, ["Average K/D Ratio", "K/D Ratio"]));
  const kr = num(pick(l, ["Average K/R Ratio", "K/R Ratio"]));
  const adr = num(pick(l, ["ADR", "Average ADR", "Average Damage per Round"]));
  const hs = num(pick(l, ["Average Headshots %", "Headshots %"]));
  const winRate = num(pick(l, ["Win Rate %"]));
  const matches = num(pick(l, ["Matches", "Total Matches"]));
  let kda = num(pick(l, ["KDA", "Average KDA"]));

  // Lifetime stats don't always include KDA; derive (K+A)/D when totals are present.
  if (kda === null) {
    const k = num(pick(l, ["Total Kills", "Kills"]));
    const a = num(pick(l, ["Total Assists", "Assists"]));
    const d = num(pick(l, ["Total Deaths", "Deaths"]));
    if (k !== null && a !== null && d) kda = (k + a) / d;
  }

  return {
    nickname: player.nickname,
    avatar: player.avatar || null,
    country: player.country || "",
    game,
    level: gameInfo.skill_level ?? null,
    elo: gameInfo.faceit_elo ?? null,
    winRate, matches, kd, kda, kr, hs, adr,
  };
}
