# Faceit Stats → Steam Artwork

A Manifest V3 browser extension that turns your Faceit stats into a shareable card and loads it into Steam's artwork upload form. Fully client-side: no server, and it never reads or stores Steam credentials or cookies.

## Install (unpacked)
1. Get a free API key at https://developers.faceit.com (App Studio → create app → server-side API key).
2. Either paste it into `config.js` (`DEFAULT_API_KEY`) or enter it later in the popup's Settings.
3. Chrome/Edge: `chrome://extensions` → Developer mode → **Load unpacked** → select this folder.

## Use
1. Open the popup, enter a Faceit nickname, player ID or profile URL, pick Featured (630px) or Showcase (506 + 100px), click **Generate**.
2. **Send to Steam** opens `steamcommunity.com/sharedfiles/edititem/767/3/` (log in to Steam yourself), fills the file picker, and you click Steam's own Upload button. **Download PNG** is the manual fallback.

## Permissions
- `https://open.faceit.com/*`: Faceit Data API calls
- `https://*.faceit-cdn.net/*`: avatar image
- `https://steamcommunity.com/sharedfiles/edititem/*`: content script, upload pages only
- `storage`: remembers your API key, last query, and the pending image

## Notes / to verify
- Faceit lifetime stats field names vary by game. `faceit.js` tries several candidates; ADR and KDA show "—" if the API doesn't return them (KDA is derived from totals when present). Check a real response and adjust the key lists.
- Steam may add anti-automation checks on the file input; if the fill is blocked, use Download PNG.
- Steam's two-part Artwork Showcase handling (506 + 100px) should be tested against the live form.
- The bundled key is public to anyone who unpacks the extension; heavy use can trigger 429s, in which case the popup prompts for a personal key.

MIT licensed.
