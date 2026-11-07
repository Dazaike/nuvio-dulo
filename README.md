# nuvio-dulo

Nuvio plugin for [dulo.mov](https://dulo.mov). Add the manifest URL in **Settings > Media > Plugins**.
Use the commit-pinned raw URL (raw.githubusercontent.com `main` is cached for ~5 minutes).

## How dulo serves streams

The site is a SvelteKit front end over its own Cloudflare Workers (no third-party iframes). The worker domain is
published at runtime in `https://dulo.mov/dulo-config.js` (`WORKER_DOMAIN`); the plugin reads it and falls back to the last known value.

1. **Pickle (ZCDN)**: `GET https://zcdn{1,2,3}.<domain>/cdn?tmdb=<id>&type=movie|tv[&season=S&episode=E]`
   returns `{"ready":true,"url":".../play/<token>/~<token>","rb":"..."}`. The URL is an HLS master playlist (up to 2160p, fMP4, ABR).
   The link is bound to the requesting IP (403 from another IP; a datacenter IP is answered with a promo clip), so it only works when the
   plugin requests it from the device that plays it.
2. **Extra servers**: `GET https://zstream-proxy{1,2,3}.<domain>/?destination=https://dulo.mov/api/streams/resolve?tmdbId=<id>&type=movie|tv[&seasonId=S&episodeId=E][&title=&year=&runtime=]&progressive=true`
   returns `{found, pending, sources:[{label, url, captions[]}]}` (Zephyr, Breeze, Ripple, Cobalt, ...). Poll while `pending:true`.
   Sources are HLS media playlists whose segments are self-contained proxy links (work from any IP). The result set depends on the exact query,
   so the plugin runs the bare query and the title/year/runtime query (like the site) and merges them.
3. Playlists, segments and subtitles are refused (`403 nope`) unless the request has a `Referer` or `Origin` of `https://dulo.mov`.
   The plugin sets both on every stream. Subtitle links are returned through the companion addon's `/sub` route
   (`SUB_PROXY`), because players fetch subtitles without headers.

Rank: Pickle first (`Dulo - Auto (Best)`), then the other servers by resolution, +subtitle bonus. Everything else is listed after it.

## Test

`node test/verify.js [movie|tv tmdbId season episode]` runs the plugin in Node and checks every returned stream down to the first, middle and last segment.
Other files in `test/` are the probing scripts used to reverse-engineer the API.
