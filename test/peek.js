var PROXY = 'https://zstream-proxy1.2wwlgkfo-31a.workers.dev/';
var H = { 'User-Agent': 'Mozilla/5.0' };
var q = process.argv[2] || 'tmdbId=550&type=movie';
fetch(PROXY + '?destination=' + encodeURIComponent('https://dulo.mov/api/streams/resolve?' + q + '&progressive=true'), { headers: H }).then(function (r) { return r.json(); }).then(function (j) {
  var s = j.sources[+(process.argv[3] || 0)];
  console.log(s.label, s.type, s.url.length);
  return fetch(s.url, { headers: H }).then(function (r) { console.log(r.status, JSON.stringify([...r.headers])); return r.text(); }).then(function (t) {
    var lines = t.split(/\r?\n/);
    console.log(lines.slice(0, 12).map(function (l) { return l.slice(0, 160); }).join('\n'));
    var seg = lines.filter(function (l) { return l && l[0] !== '#'; })[3];
    return fetch(seg, { headers: H }).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
      var u = new Uint8Array(b), ok = 0, n = 0;
      for (var i = 0; i + 188 <= u.length; i += 188) { n++; if (u[i] === 0x47) ok++; }
      console.log('segment', u.length, 'ts packets', n, 'with sync', ok);
    });
  });
});
