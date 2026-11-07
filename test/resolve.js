var H = { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://dulo.mov', 'Referer': 'https://dulo.mov/' };
var q = process.argv[2] || 'tmdbId=550&type=movie&progressive=true';
var url = 'https://zstream-proxy1.2wwlgkfo-31a.workers.dev/?destination=' + encodeURIComponent('https://dulo.mov/api/streams/resolve?' + q);
function short(o) {
  if (typeof o === 'string') return o.length > 110 ? o.slice(0, 110) + '...(' + o.length + ')' : o;
  if (Array.isArray(o)) return o.map(short);
  if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { r[k] = short(o[k]); }); return r; }
  return o;
}
fetch(url, { headers: H }).then(function (r) { console.log(r.status); return r.json(); }).then(function (j) {
  if (process.argv[3] === 'raw') console.log(JSON.stringify(j));
  else console.log(JSON.stringify(short(j), null, 1));
});
