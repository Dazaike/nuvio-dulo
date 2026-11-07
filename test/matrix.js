var H = { 'User-Agent': 'Mozilla/5.0', Origin: 'https://dulo.mov', Referer: 'https://dulo.mov/' };
var P = 'https://zstream-proxy1.2wwlgkfo-31a.workers.dev/';
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function run(label, q) {
  var t0 = Date.now(), last = null, polls = 0;
  for (; polls < 30; polls++) {
    var r = await fetch(P + '?destination=' + encodeURIComponent('https://dulo.mov/api/streams/resolve?' + q + '&progressive=true'), { headers: H });
    last = await r.json();
    if (!last.pending) break;
    await sleep(500);
  }
  console.log(label.padEnd(34), 'polls', polls + 1, (Date.now() - t0) + 'ms', 'found', last.found, (last.sources || []).map(function (s) { return s.label; }).join(' | '));
}
(async function () {
  var base = process.argv[2] || 'tmdbId=1396&type=tv&seasonId=1&episodeId=3';
  await run('bare', base);
  await run('title only', base + '&title=Breaking%20Bad');
  await run('title+year', base + '&title=Breaking%20Bad&year=2008');
  await run('title+year+runtime', base + '&title=Breaking%20Bad&year=2008&runtime=49');
  await run('all, wrong runtime', base + '&title=Breaking%20Bad&year=2008&runtime=10');
  await run('runtime+year only', base + '&year=2008&runtime=49');
})();
