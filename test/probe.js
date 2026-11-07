// Offline verification: /cdn -> master -> variant -> first segment bytes
var H = { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://dulo.mov', 'Referer': 'https://dulo.mov/' };
var HOST = process.argv[2] || 'zcdn1';
function abs(u, base) { return new URL(u, base).href; }
async function main() {
  var cases = [
    ['movie', 550], ['tv', 1396, 1, 1], ['tv', 296756, 1, 6]
  ];
  for (var c of cases) {
    var q = 'tmdb=' + c[1] + '&type=' + c[0] + (c[0] === 'tv' ? '&season=' + c[2] + '&episode=' + c[3] : '');
    var t0 = Date.now();
    var r = await fetch('https://' + HOST + '.2wwlgkfo-31a.workers.dev/cdn?' + q, { headers: H });
    var j = await r.json().catch(function () { return null; });
    console.log('\n==', q, r.status, Date.now() - t0 + 'ms', JSON.stringify(j && Object.assign({}, j, { url: j.url && j.url.slice(0, 80) + '...', rb: j.rb && '<rb>' })));
    if (!j || !j.url) continue;
    var m = await fetch(j.url, { headers: H });
    var mt = await m.text();
    console.log('master', m.status, mt.length);
    console.log(mt.split('\n').filter(function (l) { return l[0] === '#' && !/^#EXT-X-STREAM-INF/.test(l) || /RESOLUTION/.test(l); }).join('\n'));
    var lines = mt.split(/\r?\n/);
    var variants = [];
    for (var i = 0; i < lines.length; i++) if (lines[i].indexOf('#EXT-X-STREAM-INF') === 0) variants.push({ info: lines[i], url: abs(lines[i + 1], j.url) });
    for (var v of variants) {
      var vr = await fetch(v.url, { headers: H });
      var vt = await vr.text();
      var segs = vt.split(/\r?\n/).filter(function (l) { return l && l[0] !== '#'; });
      var map = /#EXT-X-MAP:URI="([^"]+)"/.exec(vt);
      var seg = abs(segs[0], v.url);
      var sr = await fetch(seg, { headers: H });
      var buf = new Uint8Array(await sr.arrayBuffer());
      var kind = buf[0] === 0x47 ? 'TS' : (String.fromCharCode.apply(null, buf.slice(4, 8)));
      console.log((/RESOLUTION=(\d+x\d+)/.exec(v.info) || [])[1], 'variant', vr.status, 'segs', segs.length, 'map', !!map, 'seg', sr.status, buf.length, 'bytes', kind, sr.headers.get('content-type'));
    }
  }
}
main();
