import CAT from './boiler-data.js';
import * as C from './quote-core.js';

const API = 'https://ylyasshhvuhhpmpotera.supabase.co/functions/v1/boiler-order'; // V6: Supabase function - re-prices the order, creates the job in the app and the Stripe link
const FORM = 'https://formspree.io/f/mdekrqqj'; // your existing website form
const KEY = 'sh_boiler_journey_v2';
const root = document.getElementById('sj');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = C.gbp;

// ---------- state ----------
const newId = () => { try { return crypto.randomUUID(); } catch (e) { return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)); } };
const fresh = () => ({ oid: newId(), step: 'start', a: {}, product: null, extras: {}, date: null, cust: {}, pay: 'full', rental: '', notes: '', promo: '', terms: false, marketing: false, done: null });
let S = load();
function load() { try { const x = Object.assign(fresh(), JSON.parse(sessionStorage.getItem(KEY) || '{}')); if (!x.oid) x.oid = newId(); return x; } catch (e) { return fresh(); } }
function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } }

// ---------- questions (order follows a normal homeowner conversation) ----------
const Q = [
  { k: 'current_type', title: 'What kind of boiler do you have now?', help: 'If you have a hot water tank (cylinder), it is a standard or system boiler. A combi has no tank.', opts: [['combi', 'Combi'], ['standard', 'Standard (regular)'], ['system', 'System'], ['back', 'Back boiler'], ['unsure', 'I am not sure']] },
  { k: 'fuel', title: 'What does your boiler run on?', opts: [['gas', 'Mains gas'], ['lpg', 'LPG'], ['oil', 'Oil']] },
  { k: 'convert', title: 'Do you want to switch to a combi boiler?', help: 'We remove your hot water cylinder and tanks and alter the pipework. The cost of this is shown clearly in your price.', opts: [['yes', 'Yes, switch to a combi'], ['no', 'No, keep my current type']], show: (a) => ['standard', 'system'].includes(a.current_type) },
  { k: 'move', title: 'Do you want the new boiler in a different place?', help: 'Most people keep it where it is, which is the lowest price.', opts: [['no', 'No, same place'], ['yes', 'Yes, move it']] },
  { k: 'move_to', title: 'Where do you want the new boiler?', help: 'Moving costs more. The price is added to your installation.', show: (a) => a.move === 'yes', dyn: () => CAT.moves.map((m) => [m.id, m.label, m.price != null ? '+' + money(m.price) : 'We will price this for you']) },
  { k: 'property', title: 'Which of these best describes your home?', opts: [['detached', 'Detached'], ['semi', 'Semi-detached'], ['terraced', 'Terraced'], ['flat', 'Flat'], ['bungalow', 'Bungalow']] },
  { k: 'bedrooms', title: 'How many bedrooms do you have?', grid: true, num: true, opts: [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6 or more']] },
  { k: 'bathrooms', title: 'How many bathrooms and shower rooms?', grid: true, num: true, opts: [[1, '1'], [2, '2'], [3, '3 or more']] },
  { k: 'baths', title: 'How many baths do you have, or plan to have?', grid: true, num: true, opts: [[0, 'None'], [1, '1'], [2, '2 or more']] },
  { k: 'radiators', title: 'Roughly how many radiators do you have?', opts: C.BANDS.map((b) => [b, C.BAND_LABEL[b] + ' radiators']) },
  { k: 'trvs', title: 'Do all your radiators have thermostatic valves (TRVs)?', help: 'A TRV is the dial on a radiator that sets the temperature for that room.', opts: [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']] },
  { k: 'flue_outlet', title: 'Where will the flue come out?', help: 'The flue is the pipe that takes fumes from the boiler outside. Usually it goes straight through an outside wall.', opts: [['wall', 'Through a wall'], ['roof', 'Through the roof'], ['unknown', 'I do not know']] },
  { k: 'flue_distance', title: 'How far will the boiler be from an outside wall?', help: 'This tells us how much flue pipe is needed.', opts: [['<1', 'Under 1 metre'], ['1-2', '1 to 2 metres'], ['2-3', '2 to 3 metres'], ['3+', '3 metres or more'], ['unknown', 'I do not know']], show: (a) => a.flue_outlet !== 'roof' },
  { k: 'flue_issues', title: 'Do any of these apply to where the flue comes out?', help: 'Pick all that apply. These are safety clearances we check on site.', multi: true, opts: [['ground', 'Less than 2 metres from the ground'], ['boundary', 'Less than 2 metres from a neighbour\'s boundary'], ['cover', 'Under a carport, balcony or similar'], ['opening', 'Less than 30 cm from a door, window or vent'], ['none', 'None of these / not sure']] },
  { k: 'postcode', title: 'What is the postcode of the property?', help: 'So we can check we cover your area.', text: true },
];
const visibleQ = () => Q.filter((q) => !q.show || q.show(S.a));
const STAGES = ['Your home', 'Your boiler', 'Your booking', 'Review and pay'];
const stageOf = (s) => (s === 'results' || s === 'extras' ? 2 : s === 'date' || s === 'details' ? 3 : s === 'review' ? 4 : 1);

// ---------- helpers ----------
function go(step, push = true) {
  S.step = step; save();
  if (push) history.pushState({ step }, '', '#' + step);
  render();
  const h = root.querySelector('[data-focus]');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  const top = document.getElementById('finder'); if (top) window.scrollTo({ top: top.offsetTop - 70, behavior: 'smooth' });
}
window.addEventListener('popstate', (e) => { const st = (e.state && e.state.step) || 'start'; S.step = st; save(); render(); });

// The £100 code is only taken off when the customer has typed it (S.promo). If it no longer fits (e.g. a 2027 date) the order is shown without it, with a message.
function currentOrder() {
  const o = C.priceOrder(CAT, S.a, S.product, S.extras, S.date, undefined, S.promo);
  if (!o.ok && o.promoError) { const b = C.priceOrder(CAT, S.a, S.product, S.extras, S.date); b.promoErr = o.error; return b; }
  return o;
}
function safeOrder() { const o = currentOrder(); return o.ok ? o : C.priceOrder(CAT, S.a, S.product, S.extras, null); }
const dealLive = () => C.checkPromo(C.PROMO_DEFAULT, null).ok;
function promoBox(o) {
  if (!dealLive() && !S.promo) return '';
  const on = o && o.ok && o.promo;
  return `<div class="sj-promo" id="sj-promo"><p class="sj-promo-t"><b>Got a promo code?</b>${on ? '' : ' <span>Book and install by 31 December 2026 with code <b>SOUTHWARK100</b> to save £100.</span>'}</p>
  ${on ? `<p class="sj-promo-ok">&#10003; Code <b>${esc(o.promo)}</b> applied. You save ${money(C.PROMOS[o.promo].amount)}. <button type="button" class="sj-link" data-act="promo-off">Remove</button></p>`
  : `<form id="sj-pf" class="sj-promo-f" novalidate><label for="pcode" class="sj-vh">Promo code</label><input id="pcode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter code" value="${esc(S.promoTry || '')}"><button class="sj-btn sj-promo-b" type="submit">Apply</button></form>`}
  <p class="sj-err" id="pc-err" role="alert">${esc((o && o.promoErr) || S.promoMsg || '')}</p></div>`;
}

function boilerImg(p) {
  const svg = boilerSvg(p), alt = esc(p.manufacturer + ' ' + p.model) + ' boiler';
  const srcs = [p.image, p.image_url].filter(Boolean);
  if (srcs.length) return `<img src="${esc(srcs[0])}" data-alt-src="${esc(srcs[1] || '')}" alt="${alt}" loading="lazy" width="120" height="150" style="object-fit:contain" referrerpolicy="no-referrer" onerror="if(this.dataset.altSrc){this.src=this.dataset.altSrc;this.dataset.altSrc=''}else{var s=this.nextElementSibling;this.replaceWith(s.firstElementChild);s.remove()}"><span style="display:none">${svg}</span>`;
  return svg;
}
function boilerSvg(p) {
  return `<svg viewBox="0 0 120 150" role="img" aria-label="${esc(p.manufacturer + ' ' + p.model)} boiler"><rect x="22" y="22" width="76" height="106" rx="9" fill="#fff" stroke="#DDE3E9" stroke-width="2"/><rect x="42" y="6" width="36" height="18" rx="3" fill="#EEF1F5" stroke="#DDE3E9" stroke-width="2"/><rect x="32" y="34" width="56" height="42" rx="5" fill="#F4F6F9"/><rect x="26" y="88" width="68" height="14" fill="#112B4F"/><circle cx="40" cy="95" r="4" fill="#fff"/><circle cx="60" cy="95" r="4" fill="#fff"/><rect x="72" y="91" width="16" height="8" rx="2" fill="#C42727"/><rect x="34" y="132" width="52" height="10" rx="3" fill="#B8C2CD"/></svg>`;
}

function header(title, help, back = true) {
  const st = stageOf(S.step), q = visibleQ();
  let pct = st * 25 - 13;
  if (st === 1) { const i = q.findIndex((x) => x.k === S.step.replace('q:', '')); pct = Math.max(3, Math.round(((i < 0 ? 0 : i) / q.length) * 25)); }
  return `<div class="sj-prog" aria-label="Progress"><div class="sj-prog-t"><span>Step ${st} of 4: ${STAGES[st - 1]}</span></div><div class="sj-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div>
  ${back ? '<button class="sj-back" type="button" data-act="back">&larr; Back</button>' : ''}<h2 class="sj-h" data-focus>${title}</h2>${help ? `<p class="sj-help">${help}</p>` : ''}`;
}

function summaryBox(o, opts = {}) {
  if (!o || !o.ok) return '';
  const rows = o.lines.map((l) => `<div class="sj-row${l.amount < 0 ? ' sj-disc' : ''}"><span>${esc(l.label)}</span><b>${money(l.amount)}</b></div>`).join('');
  return `<div class="sj-sum" aria-live="polite"><div class="sj-sum-t">${esc(o.product.manufacturer + ' ' + o.product.model)}</div>${rows}<div class="sj-row sj-tot"><span>Total fixed price</span><b>${money(o.total)}</b></div><p class="sj-note">${esc(CAT.settings.price_note)}</p></div>`;
}

// ---------- screens ----------
function render() {
  const s = S.step;
  let h = '';
  if (s === 'start') h = scrStart();
  else if (s.startsWith('q:')) h = scrQuestion(s.slice(2));
  else if (s === 'quote') h = scrQuote();
  else if (s === 'results') h = scrResults();
  else if (s === 'extras') h = scrExtras();
  else if (s === 'date') h = scrDate();
  else if (s === 'details') h = scrDetails();
  else if (s === 'review') h = scrReview();
  else if (s === 'done') h = scrDone();
  root.innerHTML = h;
  bind();
}

function scrStart() {
  return `<div class="sj-card sj-start"><h2 class="sj-h" data-focus>Get your new boiler installed</h2><p class="sj-help">Answer a few quick questions about your home and we will show the boilers that suit it, each with a fixed, fully installed price. Choose yours, pick your installation date and book online.</p>
  <ul class="sj-ticks"><li>Fixed price shown before you give any details</li><li>Fitted by a Gas Safe registered engineer</li><li>Pick any install date from tomorrow</li></ul>
  <button class="sj-btn" data-act="begin">Get My Fixed Price</button>${S.a.current_type ? '<button class="sj-btn sj-ghost" data-act="resume">Carry on where I left off</button>' : ''}<p class="sj-note">Takes about 2 minutes. No payment until you confirm your order.</p></div>`;
}

function scrQuestion(k) {
  const q = Q.find((x) => x.k === k);
  if (!q) return scrStart();
  const cur = S.a[k];
  let body = '';
  const opts = q.dyn ? q.dyn() : q.opts;
  if (q.text) {
    body = `<form id="sj-pc" novalidate><label for="pc">Postcode</label><input id="pc" name="postcode" autocomplete="postal-code" autocapitalize="characters" inputmode="text" value="${esc(cur || '')}" placeholder="e.g. SE16 7SZ"><p class="sj-err" id="pc-e" role="alert"></p><button class="sj-btn" type="submit">Show my boilers</button></form>`;
  } else if (q.multi) {
    const sel = Array.isArray(cur) ? cur : [];
    body = `<div class="sj-list">${opts.map(([v, l]) => `<button type="button" class="sj-opt ${sel.includes(v) ? 'on' : ''}" aria-pressed="${sel.includes(v)}" data-multi="${esc(v)}"><span>${esc(l)}</span></button>`).join('')}</div><button class="sj-btn" data-act="multi-next">Continue</button>`;
  } else {
    body = `<div class="${q.grid ? 'sj-grid' : 'sj-list'}">${opts.map(([v, l, sub]) => `<button type="button" class="sj-opt ${String(cur) === String(v) ? 'on' : ''}" data-pick="${esc(v)}"><span>${esc(l)}</span>${sub ? `<em>${esc(sub)}</em>` : ''}</button>`).join('')}</div>`;
  }
  return `<div class="sj-card">${header(esc(q.title), q.help ? esc(q.help) : '', true)}${body}</div>`;
}

function pick(k, raw) {
  const q = Q.find((x) => x.k === k);
  let v = raw;
  if (q.num) v = Number(raw);
  S.a[k] = v;
  if (k === 'current_type' && !['standard', 'system'].includes(v)) delete S.a.convert;
  if (k === 'move' && v === 'no') delete S.a.move_to;
  if (k === 'flue_outlet' && v === 'roof') delete S.a.flue_distance;
  next(k);
}
function next(k) {
  const q = visibleQ();
  const i = q.findIndex((x) => x.k === k);
  if (i >= 0 && i < q.length - 1) return go('q:' + q[i + 1].k);
  finishQuestions();
}
function finishQuestions() {
  const r = C.recommend(CAT, S.a);
  S.product = null; S.extras = {}; S.date = null;
  go(r.route === 'ok' ? 'results' : 'quote');
}
function back() {
  const s = S.step;
  if (s.startsWith('q:')) { const q = visibleQ(), i = q.findIndex((x) => x.k === s.slice(2)); return go(i > 0 ? 'q:' + q[i - 1].k : 'start'); }
  const m = { results: 'q:postcode', quote: 'q:postcode', extras: 'results', date: 'extras', details: 'date', review: 'details' };
  go(m[s] || 'start');
}

// ---------- results ----------
function scrResults() {
  const r = C.recommend(CAT, S.a);
  if (r.route !== 'ok') return scrQuote();
  const incl = CAT.included.map((x) => `<li>${esc(x)}</li>`).join('');
  const SHOW = 6;
  const cards = r.options.map((o, idx) => {
    const p = o.product;
    const specs = [p.ch_kw ? ['Heating output', p.ch_kw + ' kW'] : null, ['Hot water flow', 'about ' + p.dhw_flow_lpm + ' litres/min'], p.warranty_years ? ['Warranty', p.warranty_years + ' years'] : null, p.efficiency_pct ? ['Efficiency', 'ErP class ' + (p.erp || '') + ', ' + p.efficiency_pct + '%'] : null, ['Type', 'Combi (no tank)']].filter(Boolean)
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('');
    return `<article class="sj-prod ${o.badges[0] === 'Best match' ? 'best' : ''}"${idx >= SHOW && !S.showAll ? ' hidden' : ''}>
      ${o.badges.length ? `<p class="sj-badges">${o.badges.map((b) => `<span class="sj-tag">${esc(b)}</span>`).join('')}</p>` : ''}
      <div class="sj-prod-top"><div class="sj-img">${boilerImg(p)}</div><div><p class="sj-mf">${esc(p.manufacturer)}</p><h3>${esc(p.model)}</h3><p class="sj-why">${esc(o.why)}</p></div></div>
      <ul class="sj-ben">${p.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <dl class="sj-specs">${specs}</dl>
      <details class="sj-more"><summary>See what is included</summary><ul>${incl}</ul><p class="sj-note">${esc(p.warranty_note)}.</p></details>
      <div class="sj-buy"><div><span class="sj-lbl">Your fixed price including installation</span><span class="sj-price">${money(o.price)}</span>${dealLive() ? `<span class="sj-deal">Or ${money(o.price - C.PROMOS[C.PROMO_DEFAULT].amount)} with code <b>SOUTHWARK100</b>*</span>` : ''}</div><button class="sj-btn" data-choose="${esc(p.id)}">Choose this boiler</button></div></article>`;
  }).join('');
  const notes = r.notes.length ? `<div class="sj-alert"><b>Good to know</b>${r.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : '';
  const deal = dealLive() ? `<div class="sj-dealbar"><span class="sj-dealbadge">SAVE<br>£100</span><p><b>Winter deal:</b> book and install by 31 December 2026 and save £100. Enter code <b>SOUTHWARK100</b> when you review your order.</p></div>` : '';
  return `<div class="sj-card">${header('Boilers that suit your home', 'These are sized for the answers you gave. Prices are fixed and include fitting.', true)}${deal}${notes}${cards || '<p>No boilers found.</p>'}${dealLive() ? '<p class="sj-note">*£100 off with code SOUTHWARK100. Code must be entered at checkout and the installation must take place on or before 31 December 2026. One code per order.</p>' : ''}${r.options.length > SHOW && !S.showAll ? `<button type="button" class="sj-btn sj-ghost" data-act="show-all">Show all ${r.options.length} boilers</button>` : ''}
  <div class="sj-save"><details><summary>Save this quote for later</summary><form id="sj-save" novalidate><label for="se">Your email</label><input id="se" type="email" autocomplete="email" inputmode="email"><p class="sj-err" id="se-e" role="alert"></p><button class="sj-btn sj-ghost" type="submit">Email me this quote</button></form></details></div>
  <p class="sj-note">Need to talk first? Call <a href="tel:+44${CAT.settings.phone.replace(/^0/, '').replace(/\s/g, '')}">${esc(CAT.settings.phone)}</a>.</p></div>`;
}

// ---------- personal quote path ----------
function scrQuote() {
  const as = C.assess(S.a);
  const reasons = as.why.map((w) => `<li>${esc(C.REASONS[w])}</li>`).join('');
  const q = S.cust;
  return `<div class="sj-card">${header('We will price this one for you', 'Your home needs a closer look before we can give a fixed price online.', true)}<ul class="sj-ticks">${reasons}</ul>
  <form id="sj-lead" novalidate><label for="ln">Your name</label><input id="ln" autocomplete="name" value="${esc(q.name || '')}"><label for="lp">Mobile or phone</label><input id="lp" type="tel" autocomplete="tel" inputmode="tel" value="${esc(q.phone || '')}"><label for="le">Email</label><input id="le" type="email" autocomplete="email" inputmode="email" value="${esc(q.email || '')}">
  <p class="sj-err" id="l-e" role="alert"></p><button class="sj-btn" type="submit">Ask for my personal price</button></form><p class="sj-note">Or call <a href="tel:+44${CAT.settings.phone.replace(/^0/, '').replace(/\s/g, '')}">${esc(CAT.settings.phone)}</a>. We will get back to you.</p></div>`;
}

// ---------- extras ----------
function scrExtras() {
  const o = safeOrder();
  if (!o.ok) return scrResults();
  const groups = Object.keys(CAT.groups).map((g) => {
    const items = CAT.extras.filter((x) => x.group === g);
    if (!items.length) return '';
    const rows = items.map((x) => {
      const q = Number(S.extras[x.id] || 0);
      let ctl;
      if ((x.max || 1) > 1) ctl = `<div class="sj-step" role="group" aria-label="Quantity of ${esc(x.label)}"><button type="button" data-dec="${x.id}" aria-label="Fewer" ${q ? '' : 'disabled'}>&minus;</button><output>${q}</output><button type="button" data-inc="${x.id}" aria-label="More" ${q >= x.max ? 'disabled' : ''}>+</button></div>`;
      else ctl = `<button type="button" class="sj-add ${q ? 'on' : ''}" aria-pressed="${!!q}" data-tog="${x.id}">${q ? 'Added' : 'Add'}</button>`;
      const tip = x.id === 'trv' && S.a.trvs !== 'yes' ? `<span class="sj-rec">Recommended for you</span> <button type="button" class="sj-link" data-allrad="1">Add for about ${C.radiatorGuess(S.a.radiators)} radiators</button>` : '';
      return `<div class="sj-ext"><div><h4>${esc(x.label)}</h4><p>${esc(x.description)}</p>${tip ? `<p>${tip}</p>` : ''}<b>+${money(x.price)}${x.unit ? ' each' : ''}</b></div>${ctl}</div>`;
    }).join('');
    const inc = g === 'controls' ? '<div class="sj-ext inc"><div><h4>Programmable room thermostat</h4><p>Standard with every installation.</p></div><span class="sj-incl">Included</span></div>' : '';
    return `<section><h3 class="sj-gh">${esc(CAT.groups[g])}</h3>${inc}${rows}</section>`;
  }).join('');
  return `<div class="sj-card">${header('Add any extras', 'All extras are fitted on the same day as your boiler. Skip this if you do not need any.', true)}
  <p class="sj-chosen">${esc(o.product.manufacturer + ' ' + o.product.model)} <button type="button" class="sj-link" data-act="change">Change boiler</button></p>${groups}${summaryBox(o)}
  <button class="sj-btn" data-act="to-date">Continue: choose your install date</button></div>`;
}

// ---------- date ----------
function scrDate() {
  const w = C.dateWindow(CAT);
  const o = safeOrder(); if (!o.ok) return scrResults();
  const months = []; let d = w.min;
  while (d <= w.max) { const m = d.slice(0, 7); if (!months.includes(m)) months.push(m); d = C.addDays(d, 1); }
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<span>${x}</span>`).join('');
  const cal = months.map((m) => {
    const [y, mo] = m.split('-').map(Number);
    const first = new Date(Date.UTC(y, mo - 1, 1)), lead = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    let cells = '<i></i>'.repeat(lead);
    for (let i = 1; i <= days; i++) {
      const iso = `${m}-${String(i).padStart(2, '0')}`, ok = iso >= w.min && iso <= w.max;
      cells += ok ? `<button type="button" class="sj-day ${S.date === iso ? 'on' : ''}" data-date="${iso}" aria-pressed="${S.date === iso}">${i}${C.isWeekend(iso) && CAT.settings.weekend_surcharge ? `<small>+${money(CAT.settings.weekend_surcharge)}</small>` : ''}</button>` : `<span class="sj-day off">${i}</span>`;
    }
    return `<div class="sj-month"><h3>${new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3><div class="sj-wd">${wd}</div><div class="sj-days">${cells}</div></div>`;
  }).join('');
  const sel = S.date ? new Date(S.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  return `<div class="sj-card">${header('When should we install?', esc(CAT.settings.arrival_note), true)}${cal}<p class="sj-picked" aria-live="polite">${sel ? 'Selected: <b>' + esc(sel) + '</b>' : 'Tap a date to choose it.'}</p>${summaryBox(o)}<button class="sj-btn" data-act="to-details" ${S.date ? '' : 'disabled'}>Continue: your details</button><p class="sj-note">Cannot see the date you want? Call ${esc(CAT.settings.phone)}.</p></div>`;
}

// ---------- details ----------
function scrDetails() {
  const c = S.cust, ad = S.cust.addr || {};
  const f = (id, label, val, attrs = '') => `<label for="${id}">${label}</label><input id="${id}" value="${esc(val || '')}" ${attrs}><p class="sj-err" id="${id}-e" role="alert"></p>`;
  return `<div class="sj-card">${header('Where are we visiting?', 'Tell us where to fit the boiler and how to reach you.', true)}<form id="sj-det" novalidate>
  <h3 class="sj-gh">Installation address</h3>${f('a1', 'Address line 1', ad.line1, 'autocomplete="address-line1"')}${f('a2', 'Address line 2 (optional)', ad.line2, 'autocomplete="address-line2"')}${f('at', 'Town or city', ad.town || 'London', 'autocomplete="address-level2"')}${f('ap', 'Postcode', ad.postcode || S.a.postcode, 'autocomplete="postal-code" autocapitalize="characters"')}
  <fieldset><legend>Is this a rental property?</legend><div class="sj-grid"><button type="button" class="sj-opt ${S.rental === 'no' ? 'on' : ''}" data-rent="no">No, I own it</button><button type="button" class="sj-opt ${S.rental === 'yes' ? 'on' : ''}" data-rent="yes">Yes, it is rented</button></div><p class="sj-err" id="rent-e" role="alert"></p></fieldset>
  <h3 class="sj-gh">Your details</h3>${f('cf', 'First name', c.first, 'autocomplete="given-name"')}${f('cl', 'Surname', c.last, 'autocomplete="family-name"')}${f('ce', 'Email', c.email, 'type="email" autocomplete="email" inputmode="email"')}${f('cp', 'Mobile number', c.phone, 'type="tel" autocomplete="tel" inputmode="tel"')}
  <label for="cn">Anything we should know? (optional)</label><textarea id="cn" rows="3" maxlength="500" placeholder="Parking, access, pets">${esc(S.notes)}</textarea>
  <button class="sj-btn" type="submit">Continue: review your order</button></form></div>`;
}

// ---------- review ----------
function scrReview() {
  const o = currentOrder();
  if (!o.ok) return `<div class="sj-card">${header('Please check your order', '', true)}<p class="sj-err">${esc(o.error)}</p><button class="sj-btn" data-act="to-date">Choose a date</button></div>`;
  const c = S.cust, ad = c.addr || {};
  const dt = new Date(S.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dep = CAT.settings.deposit, canDep = o.total > dep;
  const live = !!API;
  const payBlock = `<fieldset class="sj-pay"><legend>How would you like to pay?</legend>
   <label class="sj-radio"><input type="radio" name="pay" value="full" ${S.pay !== 'deposit' ? 'checked' : ''}><span><b>Pay in full: ${money(o.total)}</b></span></label>
   ${canDep ? `<label class="sj-radio"><input type="radio" name="pay" value="deposit" ${S.pay === 'deposit' ? 'checked' : ''}><span><b>Pay a ${money(dep)} deposit now</b><br><small>The remaining ${money(o.total - dep)} is confirmed in your order email.</small></span></label>` : ''}</fieldset>`;
  return `<div class="sj-card">${header('Review your order', '', true)}
  <div class="sj-rev"><h3>Your boiler</h3><p>${esc(o.product.manufacturer + ' ' + o.product.model)} <button type="button" class="sj-link" data-go="results">Change</button></p>
  <h3>Install date</h3><p>${esc(dt)} <button type="button" class="sj-link" data-go="date">Change</button><br><small>${esc(CAT.settings.arrival_note)}</small></p>
  <h3>Installed at</h3><p>${esc([ad.line1, ad.line2, ad.town, ad.postcode].filter(Boolean).join(', '))} <button type="button" class="sj-link" data-go="details">Change</button></p>
  <h3>Your details</h3><p>${esc(c.first + ' ' + c.last)}<br>${esc(c.email)}<br>${esc(c.phone)}</p></div>
  ${promoBox(o)}${summaryBox(o)}${o.notes.length ? `<div class="sj-alert"><b>We will check on site</b>${o.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
  <div class="sj-rev"><h3>What is included</h3><ul class="sj-ticks">${CAT.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  ${live ? payBlock : '<div class="sj-alert"><b>Book now, pay when we confirm</b><p>Online card payment is being switched on. Send your booking request and we will confirm your date and take payment with you directly.</p></div>'}
  <label class="sj-check"><input type="checkbox" id="terms" ${S.terms ? 'checked' : ''}> <span>I agree to the <a href="terms" target="_blank" rel="noopener">Terms &amp; Conditions</a> and <a href="privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
  <label class="sj-check"><input type="checkbox" id="mkt" ${S.marketing ? 'checked' : ''}> <span>I am happy to receive occasional helpful reminders from Southwark Heating (optional).</span></label>
  <p class="sj-err" id="rv-e" role="alert"></p>
  <button class="sj-btn" id="sj-go">${live ? 'Pay ' + (S.pay === 'deposit' && canDep ? money(dep) : money(o.total)) + ' securely' : 'Send my booking request'}</button>
  <p class="sj-note">${live ? 'Secure payment by Stripe. We never see your card details.' : 'No payment is taken on this page yet.'}</p></div>`;
}

// ---------- confirmation ----------
function scrDone() {
  const d = S.done || {};
  const paid = d.mode === 'paid';
  return `<div class="sj-card sj-done"><h2 class="sj-h" data-focus>${paid ? 'Thank you, your order is confirmed' : 'Thank you, your request is in'}</h2>
  ${d.ref ? `<p class="sj-ref">Reference <b>${esc(d.ref)}</b></p>` : ''}
  <p>${paid ? 'Your payment was received.' : 'We have your booking request.'} ${d.date ? `Your installation date is <b>${esc(d.dateText)}</b>.` : ''}</p>
  ${d.product ? `<div class="sj-sum"><div class="sj-sum-t">${esc(d.product)}</div>${d.promo ? `<div class="sj-row sj-disc"><span>Promo code ${esc(d.promo)}</span><b>included</b></div>` : ''}<div class="sj-row sj-tot"><span>Total fixed price</span><b>${money(d.total)}</b></div></div>` : ''}
  <h3>What happens next</h3><ol class="sj-steps"><li>We check your order and contact you to confirm your date and arrival time.</li><li>If anything on site needs extra work, we agree the price with you before we start.</li><li>Your Gas Safe registered engineer fits your new boiler.</li></ol>
  <p class="sj-note">Questions? Call <a href="tel:+44${CAT.settings.phone.replace(/^0/, '').replace(/\s/g, '')}">${esc(CAT.settings.phone)}</a>.</p><a class="sj-btn sj-ghost" href="./">Back to the home page</a></div>`;
}

// ---------- events ----------
function bind() {
  root.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => pick(S.step.slice(2), b.dataset.pick)));
  root.querySelectorAll('[data-multi]').forEach((b) => b.addEventListener('click', () => {
    const k = S.step.slice(2); let a = Array.isArray(S.a[k]) ? S.a[k].slice() : []; const v = b.dataset.multi;
    if (v === 'none') a = a.includes('none') ? [] : ['none']; else { a = a.filter((x) => x !== 'none'); a = a.includes(v) ? a.filter((x) => x !== v) : [...a, v]; }
    S.a[k] = a; save(); render();
  }));
  const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => fn(el, e)));
  on('[data-act="begin"]', () => { S = fresh(); go('q:' + visibleQ()[0].k); });
  on('[data-act="resume"]', () => { const q = visibleQ().find((x) => S.a[x.k] === undefined); go(q ? 'q:' + q.k : 'results'); });
  on('[data-act="back"]', back);
  on('[data-act="multi-next"]', () => { const k = S.step.slice(2); if (!Array.isArray(S.a[k]) || !S.a[k].length) S.a[k] = ['none']; next(k); });
  on('[data-act="change"]', () => go('results'));
  on('[data-act="show-all"]', () => { S.showAll = true; save(); keepScroll(render); });
  on('[data-act="to-date"]', () => go('date'));
  on('[data-act="to-details"]', () => { if (S.date) go('details'); });
  on('[data-go]', (el) => go(el.dataset.go));
  on('[data-choose]', (el) => { S.product = el.dataset.choose; S.extras = {}; save(); go('extras'); });
  on('[data-tog]', (el) => { const id = el.dataset.tog, x = CAT.extras.find((e) => e.id === id); if (S.extras[id]) delete S.extras[id]; else { if (x.exclusive) CAT.extras.filter((e) => e.group === x.group).forEach((e) => delete S.extras[e.id]); S.extras[id] = 1; } save(); keepScroll(render); });
  on('[data-inc]', (el) => { const id = el.dataset.inc, x = CAT.extras.find((e) => e.id === id); S.extras[id] = Math.min(x.max, (S.extras[id] || 0) + 1); save(); keepScroll(render); });
  on('[data-dec]', (el) => { const id = el.dataset.dec; const n = (S.extras[id] || 0) - 1; if (n <= 0) delete S.extras[id]; else S.extras[id] = n; save(); keepScroll(render); });
  on('[data-allrad]', () => { S.extras.trv = Math.min(20, C.radiatorGuess(S.a.radiators)); save(); keepScroll(render); });
  on('[data-date]', (el) => { S.date = el.dataset.date; save(); keepScroll(render); });
  on('[data-rent]', (el) => { S.rental = el.dataset.rent; save(); readDetails(); keepScroll(render); });
  const pc = root.querySelector('#sj-pc');
  if (pc) pc.addEventListener('submit', (e) => { e.preventDefault(); const v = pc.postcode.value.trim().toUpperCase(); if (!C.isPostcode(v)) { root.querySelector('#pc-e').textContent = 'Please enter a full UK postcode, for example SE16 7SZ.'; return; } S.a.postcode = v; finishQuestions(); });
  const sv = root.querySelector('#sj-save');
  if (sv) sv.addEventListener('submit', async (e) => { e.preventDefault(); const em = sv.querySelector('#se').value.trim(); if (!C.isEmail(em)) { sv.querySelector('#se-e').textContent = 'Please enter a valid email address.'; return; } sv.querySelector('button').disabled = true; const ok = await sendForm({ email: em, name: 'Saved boiler quote', message: quoteText('SAVED QUOTE (customer asked for a copy)') }); sv.innerHTML = ok ? '<p><b>Thanks.</b> We have your request and will email your quote.</p>' : '<p class="sj-err">Sorry, that did not send. Please call us instead.</p>'; });
  const ld = root.querySelector('#sj-lead');
  if (ld) ld.addEventListener('submit', async (e) => { e.preventDefault(); const name = ld.ln.value.trim(), phone = ld.lp.value.trim(), email = ld.le.value.trim(); S.cust = { ...S.cust, name, phone, email }; save(); const er = root.querySelector('#l-e'); if (!name || !C.isPhone(phone) || !C.isEmail(email)) { er.textContent = 'Please check your name, phone number and email.'; return; } ld.querySelector('button').disabled = true; const ok = await sendForm({ name, email, phone, postcode: S.a.postcode, message: quoteText('PERSONAL PRICE REQUEST') + '\nReasons: ' + C.assess(S.a).why.join(', ') }); if (ok) { S.done = { mode: 'lead' }; go('done'); } else { er.textContent = 'Sorry, that did not send. Please call ' + CAT.settings.phone + '.'; ld.querySelector('button').disabled = false; } });
  const dt = root.querySelector('#sj-det');
  if (dt) dt.addEventListener('submit', (e) => { e.preventDefault(); if (submitDetails()) { sendLead(); go('review'); } });
  root.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener('change', () => { S.pay = r.value; save(); keepScroll(render); }));
  const t = root.querySelector('#terms'); if (t) t.addEventListener('change', () => { S.terms = t.checked; save(); });
  const mk = root.querySelector('#mkt'); if (mk) mk.addEventListener('change', () => { S.marketing = mk.checked; save(); });
  const go1 = root.querySelector('#sj-go'); if (go1) go1.addEventListener('click', placeOrder);
  const pf = root.querySelector('#sj-pf');
  if (pf) pf.addEventListener('submit', (e) => {
    e.preventDefault(); const v = pf.querySelector('#pcode').value; S.promoTry = v; S.promoMsg = '';
    const r = C.checkPromo(v, S.date);
    if (!C.promoCode(v)) S.promoMsg = 'Please type your code.';
    else if (!r.ok) S.promoMsg = r.error; else { S.promo = r.code; S.promoTry = ''; }
    save(); keepScroll(render);
  });
  on('[data-act="promo-off"]', () => { S.promo = ''; S.promoMsg = ''; save(); keepScroll(render); });
}
function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }

function readDetails() {
  const g = (id) => { const e = root.querySelector('#' + id); return e ? e.value.trim() : ''; };
  if (!root.querySelector('#sj-det')) return;
  S.cust = { ...S.cust, first: g('cf'), last: g('cl'), email: g('ce'), phone: g('cp'), addr: { line1: g('a1'), line2: g('a2'), town: g('at'), postcode: g('ap').toUpperCase() } };
  S.notes = g('cn'); save();
}
function submitDetails() {
  readDetails();
  const c = S.cust, ad = c.addr; let bad = false;
  const err = (id, m) => { const e = root.querySelector('#' + id + '-e'); if (e) e.textContent = m || ''; if (m) bad = true; };
  err('a1', ad.line1 ? '' : 'Please enter the first line of the address');
  err('at', ad.town ? '' : 'Please enter your town or city');
  err('ap', C.isPostcode(ad.postcode) ? '' : 'Please enter a valid UK postcode');
  err('rent', S.rental ? '' : 'Please choose one');
  err('cf', c.first ? '' : 'Please enter your first name');
  err('cl', c.last ? '' : 'Please enter your surname');
  err('ce', C.isEmail(c.email) ? '' : 'Please enter a valid email address');
  err('cp', C.isPhone(c.phone) ? '' : 'Please enter a valid phone number');
  if (bad) { const first = root.querySelector('.sj-err:not(:empty)'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  return !bad;
}

// ---------- sending ----------
function quoteText(tag) {
  const o = safeOrder();
  const lines = C.describeAnswers(S.a).map(([k, v]) => k + ': ' + v).join('\n');
  const opts = C.recommend(CAT, S.a).options.map((x) => x.product.manufacturer + ' ' + x.product.model + ' ' + money(x.price)).join('; ');
  return tag + '\n' + lines + (opts ? '\nOptions shown: ' + opts : '') + (o && o.ok ? '\nChosen: ' + o.product.manufacturer + ' ' + o.product.model + ' total ' + money(o.total) : '');
}
async function sendForm(f) {
  try {
    const r = await fetch(FORM, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _subject: 'Boiler journey: ' + (f.name || ''), category: 'boiler-journey', service: 'Boiler installation', ...f }) });
    return r.ok;
  } catch (e) { return false; }
}


// ---------- V6: tell Southwark Heating as soon as the details are in (before any payment) ----------
function orderBody(action) {
  const c = S.cust, ad = c.addr || {};
  return { action, order_id: S.oid, answers: S.a, product_id: S.product, extras: S.extras, date: S.date, customer: { first: c.first, last: c.last, email: c.email, phone: c.phone }, address: ad, rental: S.rental, notes: S.notes, pay: S.pay, promo: currentOrder().promo || '', consent: { terms: !!S.terms, marketing: !!S.marketing } };
}
async function callApi(action) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderBody(action)) });
  let j = {}; try { j = await r.json(); } catch (e) { /* */ }
  return { ok: r.ok && j.ok, j };
}
function leadMsg(tag) {
  const c = S.cust, ad = c.addr || {}, o = safeOrder();
  return quoteText(tag) + '\nInstall date: ' + (S.date || '-') + '\nAddress: ' + [ad.line1, ad.line2, ad.town, ad.postcode].filter(Boolean).join(', ') + '\nRental: ' + S.rental + '\nNotes: ' + S.notes + (o && o.ok ? '\nTotal: ' + money(o.total) : '');
}
function sendLead() {
  const c = S.cust, key = S.oid + '|' + S.product + '|' + S.date + '|' + JSON.stringify(S.extras) + '|' + (S.promo || '');
  if (S.leadSent === key) return; S.leadSent = key; save();
  if (API) callApi('lead').catch(() => {});
  sendForm({ name: c.first + ' ' + c.last, email: c.email, phone: c.phone, postcode: (c.addr || {}).postcode, message: leadMsg('BOILER INSTALL LEAD - details entered, NOT paid yet (chase up)') });
}

async function placeOrder() {
  const er = root.querySelector('#rv-e'), btn = root.querySelector('#sj-go');
  const o = currentOrder();
  if (!o.ok) { er.textContent = o.error; return; }
  if (!S.terms) { er.textContent = 'Please tick the box to accept the Terms & Conditions.'; return; }
  er.textContent = ''; btn.disabled = true; btn.textContent = 'Please wait...';
  const c = S.cust, ad = c.addr;
  const dateText = new Date(S.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const summary = { product: o.product.manufacturer + ' ' + o.product.model, total: o.total, date: S.date, dateText, promo: o.promo || '' };
  try {
    if (API) {
      const { ok, j } = await callApi('order');
      if (!ok) { if (j && j.ref) { S.done = { ...summary, ref: j.ref, mode: 'request' }; save(); } throw new Error(j && j.error || 'failed'); }
      await sendForm({ name: c.first + ' ' + c.last, email: c.email, phone: c.phone, postcode: ad.postcode, message: leadMsg('BOILER INSTALL - customer went to pay ' + (S.pay === 'deposit' && o.total > CAT.settings.deposit ? 'the deposit' : 'in full') + ' (ref ' + j.ref + ')') });
      S.done = { ...summary, ref: j.ref, mode: j.mode === 'checkout' ? 'paid' : 'request' }; save();
      if (j.mode === 'checkout' && j.url) { window.location.href = j.url; return; }
    } else {
      const ref = 'REQ-' + Date.now().toString(36).toUpperCase().slice(-6);
      const msg = quoteText('BOOKING REQUEST (no payment taken)') + '\nInstall date: ' + S.date + '\nAddress: ' + [ad.line1, ad.line2, ad.town, ad.postcode].filter(Boolean).join(', ') + '\nRental: ' + S.rental + '\nNotes: ' + S.notes + '\nOrder lines: ' + o.lines.map((l) => l.label + ' ' + money(l.amount)).join('; ') + '\nTotal: ' + money(o.total) + '\nRef: ' + ref;
      const ok = await sendForm({ name: c.first + ' ' + c.last, email: c.email, phone: c.phone, postcode: ad.postcode, message: msg });
      if (!ok) throw new Error('send');
      S.done = { ...summary, ref, mode: 'request' }; save();
    }
    go('done');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Try again';
    er.textContent = (e && e.message && e.message !== 'failed' && e.message !== 'send' ? e.message + ' ' : 'Sorry, we could not complete that. Nothing has been charged. ') + 'Please try again or call ' + CAT.settings.phone + '.';
  }
}

// ---------- boot ----------
(function boot() {
  const p = new URLSearchParams(location.search);
  if (p.get('paid') === '1') {
    const d = S.done && S.done.product ? S.done : {}; S.done = { ...d, mode: 'paid', ref: p.get('ref') || d.ref }; S.step = 'done'; save();
    history.replaceState({ step: 'done' }, '', location.pathname + '#done'); render(); return;
  }
  if (p.get('cancelled') === '1') { S.step = S.product && S.date ? 'review' : 'start'; history.replaceState({ step: S.step }, '', location.pathname + '#' + S.step); render(); return; }
  const h = location.hash.slice(1);
  if (h === 'finder') S.step = 'start';
  const ok = ['start', 'results', 'quote', 'extras', 'date', 'details', 'review', 'done'];
  if (S.step !== 'start' && !S.step.startsWith('q:') && !ok.includes(S.step)) S.step = 'start';
  if (['extras', 'date', 'details', 'review'].includes(S.step) && !S.product) S.step = 'start';
  if (['review'].includes(S.step) && (!S.date || !S.cust.email)) S.step = 'start';
  history.replaceState({ step: S.step }, '', location.pathname + location.search + (S.step === 'start' ? '' : '#' + S.step));
  render();
  document.querySelectorAll('[data-start]').forEach((a) => a.addEventListener('click', () => { if (S.step === 'start') return; }));
})();
