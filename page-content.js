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

  var CSS_SL = '.bsg .pcw{position:relative}.bsg .pcs{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;aspect-ratio:3/4;overscroll-behavior-x:contain}.bsg .pcs::-webkit-scrollbar{display:none}.bsg .pcs img{flex:0 0 100%;width:100%;height:100%;scroll-snap-align:start;object-fit:cover;aspect-ratio:auto}.bsg .pcd{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:5px;pointer-events:none}.bsg .pcd i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 2px rgba(0,0,0,.5)}.bsg .pcd i.on{background:#fff}.bsg .pcn{position:absolute;top:8px;right:8px;background:rgba(12,31,56,.75);color:#fff;font-size:.75rem;font-weight:700;padding:2px 8px;border-radius:99px;pointer-events:none}';

  function photos(jobs) {
    var figs = [];
    jobs.forEach(function (j) {
      var ph = (j.photos || []).slice(), ord = { before: 1, during: 2, after: 3 };
      ph.sort(function (a, b) { return (a.sort - b.sort) || (ord[a.stage] - ord[b.stage]); });
      var cover = ph.filter(function (p) { return p.stage === 'after'; })[0];
      if (cover) ph = [cover].concat(ph.filter(function (p) { return p !== cover; }));
      if (!ph.length) return;
      var imgs = ph.map(function (p, n) {
        var alt = j.title + (j.area ? ' in ' + j.area : '') + (p.stage !== 'after' ? ' (' + p.stage + ')' : '') + ' by Southwark Heating';
        var k = p.width && p.height ? 640 / Math.max(p.width, p.height) : 0, wh = k ? ' width="' + Math.round(p.width * k) + '" height="' + Math.round(p.height * k) + '"' : '';
        return '<img src="' + E(pub(p.thumb_path)) + '"' + wh + ' loading="' + (n ? 'lazy' : 'eager') + '" decoding="async" alt="' + E(alt) + '">';
      }).join('');
      var many = ph.length > 1;
      figs.push('<figure><div class="pcw"><div class="pcs"' + (many ? ' tabindex="0" aria-label="' + E(j.title) + ': ' + ph.length + ' photos, swipe to see more"' : '') + '>' + imgs + '</div>' +
        (many ? '<span class="pcn">1/' + ph.length + '</span><div class="pcd">' + ph.map(function (_, n) { return '<i' + (n ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' : '') +
        '</div><figcaption>' + E(j.title) + '</figcaption></figure>');
    });
    if (!figs.length) return;
    css(CSS_SL);
    var html = figs.join(''), grid = document.querySelector('.bsg'), host;
    if (grid) { var mark = grid.children.length; grid.insertAdjacentHTML('beforeend', html); host = [].slice.call(grid.children, mark); }
    else { css(CSS_BSG); var sec = section('sec', '<h2>Photos from recent jobs</h2><div class="bsg">' + html + '</div><p class="center" style="text-align:center;margin-top:14px"><a href="our-work">See more of our work</a></p>'); host = [].slice.call(sec.querySelectorAll('.bsg figure')); }
    host.forEach(slider);
  }

  /* one picture per job: changes by itself every few seconds and can be swiped */
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function slider(fig, idx) {
    var box = fig.querySelector('.pcs'); if (!box) return;
    var n = box.children.length; if (n < 2) return;
    var dots = fig.querySelectorAll('.pcd i'), cnt = fig.querySelector('.pcn'), cur = 0, hold = 0, vis = false, t;
    function mark() {
      var w = box.clientWidth || 1, c = Math.round(box.scrollLeft / w); if (c === cur) return; cur = Math.max(0, Math.min(n - 1, c));
      for (var i = 0; i < dots.length; i++) dots[i].className = i === cur ? 'on' : ''; if (cnt) cnt.textContent = (cur + 1) + '/' + n;
    }
    box.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(mark, 60); }, { passive: true });
    ['touchstart', 'pointerdown', 'wheel', 'focus'].forEach(function (e) { box.addEventListener(e, function () { hold = Date.now() + 8000; }, { passive: true }); });
    if (RM) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(box); else vis = true;
    setTimeout(function () {
      setInterval(function () {
        if (!vis || document.hidden || Date.now() < hold) return;
        var next = (cur + 1) % n;
        try { box.scrollTo({ left: next * box.clientWidth, behavior: 'smooth' }); } catch (e) { box.scrollLeft = next * box.clientWidth; }
      }, 3500);
    }, (idx % 3) * 900);
  }

  function run() {
    get('site_testimonials?select=name,area,quote,rating&published=eq.true&pages=cs.' + tag + '&order=created_at.asc&limit=30').then(testimonials).catch(function () {});
    get('gallery_jobs?select=title,area,photos:gallery_photos(thumb_path,width,height,stage,sort)&published=eq.true&pages=cs.' + tag + '&order=job_date.desc&limit=24').then(photos).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
