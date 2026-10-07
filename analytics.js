/* Southwark Heating - cookie consent + Google Analytics (GA4)
   Google Analytics is only loaded AFTER a visitor clicks "Accept analytics".
   Until then no analytics script is loaded and no analytics cookies are set. */
(function () {
  'use strict';

  var GA_ID = 'G-2ZB9F5F2JC';
  var KEY = 'sh_cookie_consent';
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // ask again after 12 months
  var loaded = false;

  /* ---------- consent storage (fails safe if storage is blocked) ---------- */
  function getConsent() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || (c.v !== 'granted' && c.v !== 'denied')) return null;
      if (Date.now() - c.t > MAX_AGE_MS) return null;
      return c.v;
    } catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  /* ---------- Google Analytics ---------- */
  function loadGA() {
    if (loaded) return;
    loaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      // send the page address WITHOUT any ?query or #hash so personal details can never reach Google
      page_location: location.origin + location.pathname,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function deleteGACookies() {
    var names = ['_ga', '_ga_' + GA_ID.replace('G-', ''), '_gid', '_gat'];
    var host = location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    if (parts.length === 2) domains.push('.' + host);
    names.forEach(function (n) {
      domains.forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function stopGA() {
    window['ga-disable-' + GA_ID] = true;
    deleteGACookies();
  }

  /* ---------- banner ---------- */
  function injectStyles() {
    if (document.getElementById('sh-cc-css')) return;
    var st = document.createElement('style');
    st.id = 'sh-cc-css';
    st.textContent =
      '#sh-cc{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#112B4F;color:#fff;' +
      'border-top:4px solid #C42727;box-shadow:0 -10px 30px rgba(12,31,56,.35);' +
      'padding:16px 20px calc(16px + env(safe-area-inset-bottom,0px));' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:.95rem;line-height:1.5}' +
      '#sh-cc .sh-cc-in{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:12px}' +
      '#sh-cc h2{margin:0 0 4px;font-size:1.05rem;color:#fff;border:0;padding:0}' +
      '#sh-cc p{margin:0;color:rgba(255,255,255,.92)}' +
      '#sh-cc a{color:#fff;text-decoration:underline}' +
      '#sh-cc .sh-cc-btns{display:flex;gap:10px;flex-wrap:wrap}' +
      '#sh-cc button{flex:1 1 150px;padding:13px 18px;border-radius:8px;font:inherit;font-weight:700;cursor:pointer;border:2px solid #fff;background:#fff;color:#112B4F}' +
      '#sh-cc button:focus-visible{outline:3px solid #FFD100;outline-offset:2px}' +
      '@media(min-width:760px){#sh-cc .sh-cc-in{flex-direction:row;align-items:center;gap:24px}#sh-cc .sh-cc-btns{flex:0 0 auto;flex-wrap:nowrap}#sh-cc button{flex:0 0 auto;min-width:160px}}';
    document.head.appendChild(st);
  }

  function removeBanner() {
    var b = document.getElementById('sh-cc');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function showBanner() {
    if (document.getElementById('sh-cc')) return;
    injectStyles();
    var b = document.createElement('div');
    b.id = 'sh-cc';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookie choices');
    b.innerHTML =
      '<div class="sh-cc-in">' +
      '<div class="sh-cc-txt"><h2>Cookies on this website</h2>' +
      '<p>We would like to use Google Analytics cookies to count visitors and see which pages are used, so we can improve the site. ' +
      'These are only set if you accept. Nothing is used for advertising. ' +
      '<a href="privacy#cookies">Read our cookie policy</a>.</p></div>' +
      '<div class="sh-cc-btns">' +
      '<button type="button" id="sh-cc-accept">Accept analytics</button>' +
      '<button type="button" id="sh-cc-reject">Reject analytics</button>' +
      '</div></div>';
    document.body.appendChild(b);
    document.getElementById('sh-cc-accept').addEventListener('click', function () {
      setConsent('granted'); loadGA(); removeBanner();
    });
    document.getElementById('sh-cc-reject').addEventListener('click', function () {
      setConsent('denied'); stopGA(); removeBanner();
    });
  }

  /* ---------- footer "Cookie settings" link (lets people change their mind) ---------- */
  function addFooterLink() {
    var privacyLink = document.querySelector('footer a[href="privacy"]');
    if (!privacyLink || document.getElementById('sh-cc-open')) return;
    var terms = document.querySelector('footer a[href="terms"]');
    var anchor = terms || privacyLink;
    var br = document.createElement('br');
    var a = document.createElement('a');
    a.href = '#';
    a.id = 'sh-cc-open';
    a.textContent = 'Cookie settings';
    a.addEventListener('click', function (e) { e.preventDefault(); showBanner(); });
    anchor.parentNode.insertBefore(br, anchor.nextSibling);
    anchor.parentNode.insertBefore(a, br.nextSibling);
  }

  /* ---------- start ---------- */
  function init() {
    addFooterLink();
    var c = getConsent();
    if (c === 'granted') loadGA();
    else if (c === 'denied') stopGA();
    else showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
