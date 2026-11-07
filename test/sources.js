// Offline: dulo /api/streams/resolve -> every source -> master -> variant -> first segment bytes
var PROXY = 'https://zstream-proxy1.2wwlgkfo-31a.workers.dev/';
var H = { 'User-Agent': 'Mozilla/5.0' };
var withOrigin = process.argv[2] !== 'noorigin';
if (withOrigin) { H.Origin = 'https://dulo.mov'; H.Referer = 'https://dulo.mov/'; }
function abs(u, b) { return new URL(u, b).href; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function resolve(q) {
  var url = PROXY + '?destination=' + encodeURIComponent('https://dulo.mov/api/streams/resolve?' + q + '&progressive=true');
  var best = { sources: [] };
  for (var i = 0; i < 40; i++) {
    var r = await fetch(url, { headers: H });
    var j = await r.json().catch(function () { return null; });
    if (j && j.sources && j.sources.length) best = j;
    console.log('  poll', i, r.status, 'pending', j && j.pending, 'sources', j && j.sources && j.sources.map(function (s) { return s.label; }).join(' | '));
    if (j && !j.pending) break;
    await sleep(1000);
  }
  return best;
}

async function checkSource(s) {
  var out = { label: s.label, type: s.type };
  try {
    var m = await fetch(s.url, { headers: H });
    var txt = await m.text();
    out.master = m.status + ' ' + txt.length + 'b ' + (m.headers.get('content-type') || '');
    if (txt.indexOf('#EXTM3U') !== 0) { out.err = 'not m3u8: ' + txt.slice(0, 80).replace(/\s+/g, ' '); return out; }
    var lines = txt.split(/\r?\n/);
    var variants = [];
    for (var i = 0; i < lines.length; i++) if (lines[i].indexOf('#EXT-X-STREAM-INF') === 0) variants.push({ info: lines[i], url: abs(lines[i + 1], s.url) });
    out.audio = lines.filter(function (l) { return l.indexOf('#EXT-X-MEDIA:TYPE=AUDIO') === 0; }).length;
    out.variants = [];
    var mediaUrl = variants.length ? null : s.url;
    var list = variants.length ? variants : [{ info: 'media', url: s.url }];
    for (var v of list) {
      var vr = await fetch(v.url, { headers: H });
      var vt = await vr.text();
      var segs = vt.split(/\r?\n/).filter(function (l) { return l && l[0] !== '#'; });
      var res = (/RESOLUTION=(\d+x\d+)/.exec(v.info) || [])[1] || '?';
      var o = { res: res, status: vr.status, segs: segs.length };
      if (!segs.length) { o.err = vt.slice(0, 80).replace(/\s+/g, ' '); out.variants.push(o); continue; }
      var sr = await fetch(abs(segs[Math.min(1, segs.length - 1)], v.url), { headers: H });
      var buf = new Uint8Array(await sr.arrayBuffer());
      o.seg = sr.status + ' ' + buf.length + 'B ' + (buf[0] === 0x47 ? 'TS' : String.fromCharCode.apply(null, buf.slice(4, 8))) + ' ' + (sr.headers.get('content-type') || '');
      out.variants.push(o);
    }
  } catch (e) { out.err = String(e && e.message || e); }
  return out;
}

async function main() {
  var cases = [
    'tmdbId=550&type=movie',
    'tmdbId=1396&type=tv&seasonId=1&episodeId=1&title=Breaking%20Bad&year=2008&runtime=59',
    'tmdbId=296756&type=tv&seasonId=1&episodeId=6&title=Shrinking&year=2023&runtime=40'
  ];
  for (var q of cases) {
    console.log('\n=====', q);
    var t0 = Date.now();
    var d = await resolve(q);
    console.log('resolved in', Date.now() - t0, 'ms;', d.sources.length, 'sources; captions:', d.sources.map(function (s) { return (s.captions || []).length; }).join(','));
    for (var s of d.sources) console.log(JSON.stringify(await checkSource(s)));
  }
}
main();
