/* Southwark Heating - photos and customer testimonials added from the business app.
   Shows the photos/testimonials ticked for this page. Uses the same photo grid (.bsg) and
   review cards (.rvc) as the rest of the site, adding to an existing grid when the page has one. */
(function () {
  'use strict';
  var SB = 'https://ylyasshhvuhhpmpotera.supabase.co', KEY = 'sb_publishable_FdGTquNbyai6eCKJvDbLsw_x5vYwaU9', BUCKET = 'website-gallery';
  var seg = location.pathname.split('/').pop().replace(/\.html$/, '');
  var slug = (!seg || seg === 'index') ? 'home' : seg.toLowerCase();
  if (/^(our-work|our-work-upload|login|booking-confirmation|404)$/.test(slug)) return;
  if (!window.fetch || !document.querySelector) return;

  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pub(p) { return SB + '/storage/v1/object/public/' + BUCKET + '/' + String(p).split('/').map(encodeURIComponent).join('/'); }
  function get(q) { return fetch(SB + '/rest/v1/' + q, { headers: { apikey: KEY, Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  var tag = encodeURIComponent('{' + slug + '}');

  var CSS_BSG = '.bsg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0 6px}@media(min-width:700px){.bsg{grid-template-columns:repeat(3,1fr);gap:16px}}.bsg figure{margin:0;background:#fff;border:1px solid var(--line,#DDE3E9);border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(17,43,79,.08)}.bsg img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover}.bsg figcaption{padding:10px 12px;font-weight:700;color:var(--navy,#112B4F);font-size:.92rem;line-height:1.3}';
  var CSS_RV = '.rvg{display:grid;gap:16px;margin:20px 0;text-align:left}@media(min-width:700px){.rvg{grid-template-columns:repeat(2,1fr)}}@media(min-width:1000px){.rvg{grid-template-columns:repeat(3,1fr)}}.rvc{margin:0;background:#fff;border:1px solid var(--line,#DDE3E9);border-radius:14px;padding:18px;display:flex;flex-direction:column;box-shadow:0 4px 14px rgba(17,43,79,.06)}.rvs{color:#A06A00;font-size:20px;letter-spacing:2px;line-height:1}.rvc blockquote{margin:10px 0 14px;font-size:1rem;line-height:1.5;flex:1}.rvc figcaption{font-weight:700;color:var(--navy,#112B4F)}.rvc figcaption span{display:block;font-weight:500;font-size:.85rem;color:var(--mut,#5A6978)}';
  function css(t) { var s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); }
  function spot() { var m = document.querySelector('main') || document.body, b = m.querySelector('section.band'); return { parent: b ? b.parentNode : m, before: b || null }; }
  function section(cls, inner) { var s = document.createElement('section'); s.className = cls; s.innerHTML = '<div class="wrap">' + inner + '</div>'; var p = spot(); p.parent.insertBefore(s, p.before); return s; }

  function testimonials(rows) {
    if (!rows.length) return;
    var cards = rows.map(function (t) {
      var n = Math.max(1, Math.min(5, t.rating || 5));
      return '<figure class="rvc"><div class="rvs" aria-label="' + n + ' out of 5 stars">' + new Array(n + 1).join('&#9733;') + '</div><blockquote>&ldquo;' + E(t.quote) + '&rdquo;</blockquote><figcaption>' + E(t.name) + '<span>Customer review' + (t.area ? ', ' + E(t.area) : '') + '</span></figcaption></figure>';
    }).join('');
    var grid = document.querySelector('#reviews .rvg') || document.querySelector('.rvg');
    if (grid) { grid.insertAdjacentHTML('beforeend', cards); return; }
    css(CSS_RV);
    var s = section('sec alt', '<div style="text-align:center"><h2>What our customers say</h2><div class="rvg">' + cards + '</div><a class="btn btn-dark" href="https://g.page/r/CfsQNlcypGPHECE/review" target="_blank" rel="noopener noreferrer">Read our Google reviews</a></div>');
    if (!document.getElementById('reviews')) s.id = 'reviews';
  }

  function photos(jobs) {
    var figs = [];
    jobs.forEach(function (j) {
      var ph = (j.photos || []).slice(), ord = { before: 0, during: 1, after: 2 };
      ph.sort(function (a, b) { return (ord[a.stage] - ord[b.stage]) || (a.sort - b.sort); });
      ph.forEach(function (p) {
        var alt = j.title + (j.area ? ' in ' + j.area : '') + (p.stage !== 'after' ? ' (' + p.stage + ')' : '') + ' by Southwark Heating';
        var k = p.width && p.height ? 640 / Math.max(p.width, p.height) : 0, wh = k ? ' width="' + Math.round(p.width * k) + '" height="' + Math.round(p.height * k) + '"' : '';
        figs.push('<figure><img src="' + E(pub(p.thumb_path)) + '"' + wh + ' loading="lazy" decoding="async" alt="' + E(alt) + '"><figcaption>' + E(j.title) + '</figcaption></figure>');
      });
    });
    if (!figs.length) return;
    figs = figs.slice(0, 24).join('');
    var grid = document.querySelector('.bsg');
    if (grid) { grid.insertAdjacentHTML('beforeend', figs); return; }
    css(CSS_BSG);
    section('sec', '<h2>Photos from recent jobs</h2><div class="bsg">' + figs + '</div><p class="center" style="text-align:center;margin-top:14px"><a href="our-work">See more of our work</a></p>');
  }

  function run() {
    get('site_testimonials?select=name,area,quote,rating&published=eq.true&pages=cs.' + tag + '&order=created_at.asc&limit=30').then(testimonials).catch(function () {});
    get('gallery_jobs?select=title,area,photos:gallery_photos(thumb_path,width,height,stage,sort)&published=eq.true&pages=cs.' + tag + '&order=job_date.desc&limit=12').then(photos).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
