// Runs the plugin's getStreams in Node, then (offline, NOT part of the plugin) verifies every stream:
// playlist -> variant -> first / middle / last segment, requiring real media bytes.
var plugin = require('../providers/dulo.js');
function abs(u, b) { return new URL(u, b).href; }
function kind(buf) {
  var n = 0, ok = 0;
  for (var i = 0; i + 188 <= buf.length; i += 188) { n++; if (buf[i] === 0x47) ok++; }
  if (n > 5 && ok === n) return 'TS'; // every 188-byte packet starts with the sync byte
  var t = String.fromCharCode.apply(null, buf.slice(4, 8));
  return /^(ftyp|moof|styp)$/.test(t) ? 'fMP4:' + t : null;
}
async function get(url, headers) {
  var r = await fetch(url, { headers: headers });
  return r;
}
async function checkStream(s) {
  var H = s.headers, res = { name: s.name, title: s.title, quality: s.quality, ok: false, detail: '' };
  try {
    var r = await get(s.url, H);
    var txt = await r.text();
    if (!txt.startsWith('#EXTM3U')) { res.detail = 'playlist ' + r.status + ' ' + txt.slice(0, 40); return res; }
    var lines = txt.split(/\r?\n/), media = s.url, mediaTxt = txt, top = '';
    var vi = lines.findIndex(function (l) { return l.indexOf('#EXT-X-STREAM-INF') === 0; });
    if (vi >= 0) {
      // pick the top variant by bandwidth
      var vs = [];
      lines.forEach(function (l, i) { if (l.indexOf('#EXT-X-STREAM-INF') === 0) vs.push({ bw: +(/[:,]BANDWIDTH=(\d+)/.exec(l) || [])[1], res: (/RESOLUTION=(\d+x\d+)/.exec(l) || [])[1], url: abs(lines[i + 1], s.url) }); });
      vs.sort(function (a, b) { return b.bw - a.bw; });
      top = vs[0].res + ' of ' + vs.length + ' variants';
      media = vs[0].url;
      var vr = await get(media, H);
      mediaTxt = await vr.text();
      if (!mediaTxt.startsWith('#EXTM3U')) { res.detail = 'variant ' + vr.status; return res; }
    }
    var ml = mediaTxt.split(/\r?\n/);
    var segs = ml.filter(function (l) { return l && l[0] !== '#'; });
    var mp = /#EXT-X-MAP:URI="([^"]+)"/.exec(mediaTxt);
    var idx = [0, Math.floor(segs.length / 2), segs.length - 1];
    var parts = [];
    if (mp) { var ir = await get(abs(mp[1], media), H); var ib = new Uint8Array(await ir.arrayBuffer()); parts.push('init ' + ir.status + ' ' + ib.length + 'B ' + kind(ib)); if (ir.status !== 200 || !kind(ib)) return Object.assign(res, { detail: parts.join('; ') }); }
    var allOk = true;
    for (var i of idx) {
      var sr = await get(abs(segs[i], media), H);
      var b = new Uint8Array(await sr.arrayBuffer());
      var k = kind(b);
      var good = sr.status === 200 && b.length > 10000 && !!k;
      allOk = allOk && good;
      parts.push('seg' + i + ' ' + sr.status + ' ' + (b.length / 1048576).toFixed(2) + 'MB ' + k);
    }
    res.ok = allOk;
    res.detail = (top ? top + '; ' : '') + segs.length + ' segs; ' + parts.join('; ');
  } catch (e) { res.detail = 'ERR ' + (e && e.message || e); }
  return res;
}
async function checkSub(s) {
  if (!s.subtitles || !s.subtitles.length) return 'no subs';
  var en = s.subtitles[0];
  var r = await fetch(en.url); // deliberately NO headers: what a player/Nuvio would send
  var t = await r.text();
  return en.lang + ' ' + r.status + ' ' + (t.startsWith('WEBVTT') ? 'WEBVTT ok' : JSON.stringify(t.slice(0, 30))) + ' (' + s.subtitles.length + ' tracks)';
}
(async function () {
  var cases = [['movie', 550, 0, 0, 'Fight Club'], ['tv', 1396, 1, 1, 'Breaking Bad S1E1'], ['tv', 296756, 1, 6, 'President Curtis S1E6']];
  if (process.argv[2]) cases = [[process.argv[2], +process.argv[3], +process.argv[4] || 0, +process.argv[5] || 0, 'custom']];
  for (var c of cases) {
    var t0 = Date.now();
    var streams = await plugin.getStreams(String(c[1]), c[0], c[2], c[3]);
    console.log('\n##', c[4], '->', streams.length, 'streams in', Date.now() - t0, 'ms');
    var subRes = streams.length ? await checkSub(streams[0]) : '-';
    console.log('   subtitles (no headers):', subRes);
    for (var s of streams) {
      var r = await checkStream(s);
      console.log((r.ok ? '  PASS ' : '  FAIL ') + r.name + ' | ' + r.title + ' | ' + r.quality + ' | ' + r.detail);
    }
  }
})();
