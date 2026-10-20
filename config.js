// Optional bundled Faceit Data API key (free, from https://developers.faceit.com).
// Anything here ships inside the extension and is publicly readable, so use a
// low-privilege server-side key only. Users can override it in the popup settings.
export const DEFAULT_API_KEY = "";

export const GAME = "cs2"; // falls back to "csgo" automatically if no cs2 data
export const STEAM_UPLOAD_URL = "https://steamcommunity.com/sharedfiles/edititem/767/3/";
