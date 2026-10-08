// Shared by the website AND the Worker, so the price a customer sees is the price the server charges.
// No secrets in here. Do not edit prices here: edit source/catalogue.source.json and run node build.mjs.

export const BANDS = ['0-5', '6-9', '10-13', '14-16', '17+'];
export const BAND_LABEL = { '0-5': '0 to 5', '6-9': '6 to 9', '10-13': '10 to 13', '14-16': '14 to 16', '17+': '17 or more' };
const BAND_UPPER = { '0-5': 5, '6-9': 9, '10-13': 13, '14-16': 16, '17+': 17 };
export const radiatorGuess = (band) => BAND_UPPER[band] || 0;

export const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

// Turns the editable source file into the customer-facing data (final prices only, no BOXT figures).
export function prepareCatalogue(src) {
  const m = src.settings.price_multiplier;
  const conv = (x) => (x.price != null ? x.price : x.reference_price != null ? Math.round(x.reference_price * m + 1e-9) : null);
  const { price_multiplier, reference_note, ...settings } = src.settings;
  return {
    settings,
    products: src.products
      .map((p) => {
        const { reference_price, spec_source, ...rest } = p;
        return { ...rest, price: conv(p) };
      })
      .filter((p) => p.price != null)
      .sort((a, b) => a.priority - b.priority),
    conversion: { id: 'conversion', label: src.conversion.label, description: src.conversion.description, price: src.conversion.price },
    moves: src.moves.map((x) => ({ id: x.id, label: x.label, price: conv(x) })),
    extras: src.extras.map((x) => { const { reference_price, ...r } = x; return { ...r, price: conv(x) }; }).filter((x) => x.price != null),
    groups: src.groups,
    included: src.included,
  };
}

// ---------- Dates (every day is available from tomorrow, UK time) ----------
export function londonToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function dateWindow(cat, now = new Date()) {
  const t = londonToday(now);
  return { min: addDays(t, cat.settings.lead_days), max: addDays(t, cat.settings.horizon_days) };
}
export const isWeekend = (iso) => { const d = new Date(iso + 'T00:00:00Z').getUTCDay(); return d === 0 || d === 6; };
export function validDate(cat, iso, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false;
  if (new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso) return false;
  const w = dateWindow(cat, now);
  return iso >= w.min && iso <= w.max;
}

// ---------- Which route does this home take? ----------
export const REASONS = {
  fuel: 'Your boiler does not run on mains gas, so we need to look at your set-up before we can give a fixed price.',
  current_type: 'We would like to check your current boiler set-up before giving a fixed price.',
  keep_tank: 'Replacing a standard or system boiler with the same type needs a few more details, so we will price it for you personally.',
  move_other: 'Moving the boiler somewhere else needs a quick look first, so we will price it for you personally.',
  hot_water: 'With your hot-water needs a combi may not be the right choice. We will recommend and price the best option for you.',
  heat_size: 'With this many radiators we want to check the heating output before recommending a boiler.',
};
export function assess(a) {
  const why = [], notes = [];
  if (a.fuel && a.fuel !== 'gas') why.push('fuel');
  if (a.current_type === 'back' || a.current_type === 'unsure') why.push('current_type');
  if (['standard', 'system'].includes(a.current_type) && a.convert === 'no') why.push('keep_tank');
  if (a.move === 'yes' && a.move_to === 'other') why.push('move_other');
  if (a.bathrooms >= 3 || a.baths >= 2 || a.bedrooms >= 5) why.push('hot_water');
  if (['14-16', '17+'].includes(a.radiators)) why.push('heat_size');
  if (a.flue_outlet === 'roof') notes.push('Your flue comes out through the roof. We will check the route and confirm any extra flue with you before work starts.');
  else if (a.flue_outlet === 'unknown' || a.flue_distance === 'unknown') notes.push('We will check where your flue can go before the day and tell you if anything extra is needed.');
  if (a.flue_distance === '3+') notes.push('A longer flue run may need an extension. We will confirm the cost with you before any work starts.');
  if (Array.isArray(a.flue_issues) && a.flue_issues.some((x) => x !== 'none')) notes.push('Your flue position has clearance points we need to check on site. If anything extra is needed we will agree it with you first.');
  return { route: why.length ? 'quote' : 'ok', why, notes };
}

// ---------- Price for the home (boiler + work that depends on the answers) ----------
export function basePrice(cat, a, p) {
  let t = p.price;
  const parts = [];
  if (p.boiler_price != null && p.installation_price != null) parts.push({ id: 'boiler', label: 'Boiler', amount: p.boiler_price }, { id: 'install', label: 'Installation', amount: p.installation_price });
  else parts.push({ id: 'boiler', label: 'Boiler and standard installation', amount: p.price });
  if (['standard', 'system'].includes(a.current_type) && a.convert === 'yes') { t += cat.conversion.price; parts.push({ id: 'conversion', label: cat.conversion.label, amount: cat.conversion.price }); }
  if (a.move === 'yes') {
    const mv = cat.moves.find((x) => x.id === a.move_to);
    if (mv && mv.price != null) { t += mv.price; parts.push({ id: 'move', label: 'Move boiler: ' + mv.label.toLowerCase(), amount: mv.price }); }
  }
  return { total: t, parts };
}

const homeWords = { detached: 'detached home', semi: 'semi-detached home', terraced: 'terraced home', flat: 'flat', bungalow: 'bungalow' };

export function recommend(cat, a) {
  const as = assess(a);
  if (as.route !== 'ok') return { ...as, options: [] };
  const need30 = a.bathrooms >= 2 || a.bedrooms >= 4 || a.radiators === '10-13';
  const needFlow = need30 ? 12 : 9.5;   // a 24 kW combi gives about 9.8 litres/min - right for a 1-bathroom home
  const list = cat.products.filter((p) => p.type === 'combi' && p.fuel === 'gas' && p.dhw_flow_lpm >= needFlow && p.availability !== 'unavailable');
  const priced = list.map((p) => ({ p, price: basePrice(cat, a, p).total }));
  const cheapest = priced.length ? Math.min(...priced.map((x) => x.price)) : 0;
  const home = homeWords[a.property] || 'home';
  const out = priced.map((x, i) => {
    const badges = [];
    if (i === 0) badges.push('Best match');
    if (x.price === cheapest && i !== 0) badges.push('Lowest price');
    const bath = a.bathrooms === 1 ? '1 bathroom' : a.bathrooms + ' bathrooms';
    let why = `Sized for a ${a.bedrooms}-bedroom ${home} with ${bath} and ${BAND_LABEL[a.radiators] || ''} radiators.`;
    if (!need30 && x.p.dhw_flow_lpm >= 12) why = `More hot-water flow than your home needs, so a good pick if you like a stronger shower. Suits a ${a.bedrooms}-bedroom ${home}.`;
    if (need30) why = `Higher hot-water flow (${x.p.dhw_flow_lpm} litres a minute) for a busier ${a.bedrooms}-bedroom ${home} with ${bath}.`;
    return { product: x.p, price: x.price, badges, why };
  });
  return { route: 'ok', why: [], notes: as.notes, options: out, need30 };
}

// ---------- The full order (used by the page AND re-checked by the Worker) ----------
export function priceOrder(cat, a, productId, extras = {}, date = null, now = new Date()) {
  const as = assess(a || {});
  if (as.route !== 'ok') return { ok: false, error: 'This home needs a personal quote' };
  const options = recommend(cat, a).options;
  const opt = options.find((o) => o.product.id === productId);
  if (!opt) return { ok: false, error: 'That boiler is not available for these answers' };
  const bp = basePrice(cat, a, opt.product);
  const lines = [...bp.parts];
  let total = bp.total;
  const used = {};
  for (const [id, raw] of Object.entries(extras || {})) {
    const qty = Number(raw);
    if (!qty) continue;
    const x = cat.extras.find((e) => e.id === id);
    if (!x || !Number.isInteger(qty) || qty < 1 || qty > (x.max || 1)) return { ok: false, error: 'Invalid extra' };
    if (x.exclusive) { if (used[x.group]) return { ok: false, error: 'Choose only one thermostat' }; used[x.group] = 1; }
    const amt = x.price * qty;
    total += amt;
    lines.push({ id: 'x:' + id, label: x.label + (qty > 1 ? ' x ' + qty : ''), amount: amt });
  }
  if (date != null) {
    if (!validDate(cat, date, now)) return { ok: false, error: 'Choose an available date' };
    const s = isWeekend(date) ? cat.settings.weekend_surcharge : 0;
    if (s > 0) { total += s; lines.push({ id: 'weekend', label: 'Weekend installation', amount: s }); }
  }
  return { ok: true, total, lines, product: opt.product, notes: as.notes };
}

export function describeAnswers(a) {
  const t = { combi: 'Combi', standard: 'Standard (regular)', system: 'System', back: 'Back boiler', unsure: 'Not sure' };
  return [
    ['Current boiler', t[a.current_type] || ''], ['Fuel', (a.fuel || '').toUpperCase()],
    ['Switch to combi', a.convert ? (a.convert === 'yes' ? 'Yes' : 'No') : ''], ['Move boiler', a.move === 'yes' ? 'Yes' : 'No'],
    ['Home', a.property], ['Bedrooms', a.bedrooms], ['Bathrooms', a.bathrooms], ['Baths', a.baths], ['Radiators', BAND_LABEL[a.radiators]],
    ['TRVs on all radiators', a.trvs], ['Flue outlet', a.flue_outlet], ['Flue distance from outside wall', a.flue_distance],
    ['Flue clearance points', Array.isArray(a.flue_issues) ? a.flue_issues.join(', ') : ''], ['Postcode', a.postcode],
  ].filter(([, v]) => v !== '' && v != null && v !== undefined);
}

export const isPostcode = (s) => /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i.test(String(s || '').trim());
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
export const isPhone = (s) => String(s || '').replace(/[^\d]/g, '').length >= 10;
