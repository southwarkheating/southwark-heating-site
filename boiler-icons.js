// Simple black-and-white line icons for the boiler finder questions (one consistent style: 64x64, 2.4 stroke, round caps).
const S = (d) => `<svg class="sj-ic" viewBox="0 0 64 64" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const house = (x, w, h = 22, roof = 8) => `<path d="M${x} ${54 - h}l${w / 2} -${roof}l${w / 2} ${roof}v${h}h-${w}z"/>`;
const win = (x, y, s = 5) => `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`;
const boiler = (x = 8, y = 14, w = 22, h = 30) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><circle cx="${x + w / 2}" cy="${y + h - 8}" r="3"/><path d="M${x + 5} ${y + 7}h${w - 10}"/>`;
const cyl = (x, y, w = 14, h = 34) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><path d="M${x + 3} ${y + 12}h${w - 6}"/>`;

const I = {
  'property:detached': S(`${house(14, 36, 26, 10)}<path d="M14 54h36M30 54V44h6v10"/>${win(20, 34)}${win(40, 34)}<path d="M42 22v-6h4v10"/>`),
  'property:semi': S(`${house(4, 30, 24, 9)}${house(30, 30, 24, 9)}<path d="M2 54h60M13 54V44h5v10M44 54V44h5v10"/>${win(8, 36, 4)}${win(24, 36, 4)}${win(38, 36, 4)}${win(54, 36, 4)}`),
  'property:terraced': S(`<path d="M3 54V30l9 -8l9 8l9 -8l9 8l9 -8l9 8v24z"/><path d="M2 54h60M9 54V44h6v10M27 54V44h6v10M45 54V44h6v10"/>${win(8, 33, 4)}${win(26, 33, 4)}${win(44, 33, 4)}`),
  'property:flat': S(`<rect x="16" y="8" width="32" height="46"/><path d="M10 54h44M28 54V44h8v10"/>${win(21, 14)}${win(38, 14)}${win(21, 24)}${win(38, 24)}${win(21, 34)}${win(38, 34)}`),
  'property:bungalow': S(`<path d="M6 54V34l26 -14l26 14v20z"/><path d="M4 54h56M28 54V42h8v12"/>${win(11, 38)}${win(48, 38)}`),

  'fuel:gas': S(`<rect x="12" y="14" width="40" height="34" rx="4"/><circle cx="32" cy="30" r="9"/><path d="M32 30l5 -4M27 40h10M20 48v6M44 48v6M12 54h40"/>`),
  'fuel:lpg': S(`<rect x="20" y="16" width="24" height="38" rx="9"/><path d="M26 16v-5h12v5M20 28h24M20 42h24"/>`),
  'fuel:oil': S(`<path d="M32 8c8 12 14 19 14 28a14 14 0 0 1 -28 0c0 -9 6 -16 14 -28z"/><path d="M26 38a6 6 0 0 0 6 6"/>`),

  'current_type:combi': S(`${boiler(8, 12, 26, 36)}<path d="M40 22h10a4 4 0 0 1 4 4v2"/><path d="M54 34c-2 3 -3 4 -3 6a3 3 0 0 0 6 0c0 -2 -1 -3 -3 -6z"/><path d="M8 56h26"/>`),
  'current_type:system': S(`${boiler(4, 14, 24, 32)}${cyl(38, 10, 18, 40)}<path d="M28 24h10M28 38h10M4 56h52"/>`),
  'current_type:standard': S(`${boiler(3, 22, 22, 30)}${cyl(32, 18, 16, 36)}<rect x="30" y="4" width="20" height="9" rx="2"/><path d="M40 13v5M25 30h7M25 44h7M3 56h52"/>`),
  'current_type:back': S(`<rect x="8" y="10" width="48" height="46" rx="2"/><path d="M16 56V30a16 16 0 0 1 32 0v26"/>${boiler(23, 32, 18, 20)}<path d="M26 4v6M38 4v6"/>`),
  'current_type:unsure': S(`<circle cx="32" cy="32" r="22"/><path d="M25 25a7 7 0 1 1 10 6c-2 1.5 -3 3 -3 6M32 44v2"/>`),

  'bedrooms:*': S(`<rect x="6" y="8" width="52" height="48"/><path d="M6 30h30M36 8v48M36 36h22M20 30v12M20 42h4"/><rect x="11" y="13" width="14" height="12"/><rect x="42" y="13" width="12" height="16"/><path d="M42 18h12"/>`),
  'bathrooms:*': S(`<path d="M8 32h48v6a10 10 0 0 1 -10 10H18A10 10 0 0 1 8 38z"/><path d="M14 48l-3 6M50 48l3 6M16 32V16a6 6 0 0 1 12 0"/><path d="M40 12l4 5M46 10l1 6M50 14l-2 5"/>`),
  'baths:*': S(`<path d="M6 34h52v5a9 9 0 0 1 -9 9H15a9 9 0 0 1 -9 -9z"/><path d="M12 48l-3 6M52 48l3 6"/><circle cx="22" cy="22" r="5"/><path d="M22 27v7"/><circle cx="42" cy="22" r="5"/><path d="M42 27v7M28 14l4 -4M36 14l-4 -4"/>`),
  'radiators:*': S(`<rect x="8" y="14" width="48" height="32" rx="3"/><path d="M16 14v32M24 14v32M32 14v32M40 14v32M48 14v32M8 22h48M8 38h48"/><path d="M16 46v8M48 46v8M4 54h56"/>`),
  'trvs:*': S(`<path d="M6 40h14M44 40h14"/><rect x="20" y="30" width="24" height="20" rx="3"/><path d="M32 30V20"/><circle cx="32" cy="14" r="8"/><path d="M32 8v6l4 3"/>`),

  'flue_outlet:wall': S(`<path d="M34 6v52M44 6v52M34 18h10M34 30h10M34 42h10M34 54h10"/>${boiler(4, 14, 22, 34)}<circle cx="34" cy="26" r="0"/><path d="M26 26h22"/><circle cx="52" cy="26" r="6"/><circle cx="52" cy="26" r="2.5"/>`),
  'flue_outlet:roof': S(`<path d="M4 30l28 -16l28 16"/><path d="M10 30v26h44V30"/><rect x="38" y="6" width="8" height="26"/><path d="M36 6h12"/><path d="M30 56V44h-8"/><path d="M42 32v8"/>${boiler(14, 36, 14, 18)}`),
  'flue_outlet:unknown': S(`<circle cx="32" cy="32" r="22"/><path d="M25 25a7 7 0 1 1 10 6c-2 1.5 -3 3 -3 6M32 44v2"/>`),

  'flue_distance:<1': S(`<path d="M52 6v52M42 6v52"/>${boiler(4, 16, 14, 28)}<path d="M18 26h24"/><circle cx="46" cy="26" r="0"/><path d="M4 56h38"/><path d="M8 62h34M8 59v6M42 59v6" stroke-width="1.6"/>`),
  'flue_distance:1-2': S(`<path d="M54 6v52M46 6v52"/>${boiler(4, 16, 14, 28)}<path d="M18 26h28"/><path d="M4 56h42M4 61h42M4 58v6M46 58v6" stroke-width="1.6"/><path d="M26 61v-2" stroke-width="1.6"/>`),
  'flue_distance:2-3': S(`<path d="M58 6v52M52 6v52"/>${boiler(3, 16, 12, 28)}<path d="M15 26h37M4 56h48" /><path d="M4 61h48M4 58v6M52 58v6M20 61v-3M36 61v-3" stroke-width="1.6"/>`),
  'flue_distance:3+': S(`<path d="M60 6v52M55 6v52"/>${boiler(2, 16, 10, 28)}<path d="M12 26h43" stroke-dasharray="4 3"/><path d="M2 61h53M2 58v6M55 58v6M18 61v-3M32 61v-3M46 61v-3" stroke-width="1.6"/><path d="M26 22l4 4l-4 4" stroke-width="1.8"/>`),
  'flue_distance:unknown': S(`<circle cx="32" cy="32" r="22"/><path d="M25 25a7 7 0 1 1 10 6c-2 1.5 -3 3 -3 6M32 44v2"/>`),

  'flue_issues:ground': S(`<path d="M2 54h60M34 4v50"/><path d="M34 14h26"/><circle cx="46" cy="30" r="6"/><circle cx="46" cy="30" r="2.5"/><path d="M26 30v24M22 34l4 -4l4 4M22 50l4 4l4 -4" stroke-width="1.8"/>`),
  'flue_issues:boundary': S(`<path d="M2 54h60M4 22v32M14 22v32M24 22v32M2 28h24M2 46h24M4 22l5 -5l5 5M14 22l5 -5l5 5"/><path d="M30 54V8h4v46"/><circle cx="48" cy="30" r="6"/><circle cx="48" cy="30" r="2.5"/><path d="M38 30h4"/>`),
  'flue_issues:cover': S(`<path d="M2 18h60M6 18v6M18 18v6M30 18v6M44 18v6M56 18v6"/><path d="M8 24v32M56 24v32M2 56h60"/><circle cx="32" cy="38" r="6"/><circle cx="32" cy="38" r="2.5"/><path d="M32 24v8" stroke-dasharray="3 3"/>`),
  'flue_issues:opening': S(`<rect x="8" y="8" width="30" height="30"/><path d="M23 8v30M8 23h30"/><circle cx="50" cy="48" r="6"/><circle cx="50" cy="48" r="2.5"/><path d="M40 52h-12v-4M28 56v-8" stroke-width="1.8"/><path d="M38 38l8 6" stroke-dasharray="3 3"/>`),
  'flue_issues:none': S(`<circle cx="32" cy="32" r="22"/><path d="M21 33l8 8l15 -17"/>`),

  'convert:yes': S(`${boiler(8, 12, 26, 36)}<path d="M40 22h10a4 4 0 0 1 4 4v2"/><path d="M54 34c-2 3 -3 4 -3 6a3 3 0 0 0 6 0c0 -2 -1 -3 -3 -6z"/><path d="M8 56h26"/>`),
  'convert:no': S(`${boiler(4, 14, 24, 32)}${cyl(38, 10, 18, 40)}<path d="M28 24h10M28 38h10M4 56h52"/>`),
  'move:no': S(`<rect x="12" y="10" width="40" height="44" rx="2"/>${boiler(20, 18, 24, 30)}`),
  'move:yes': S(`<rect x="4" y="10" width="26" height="44" rx="2" stroke-dasharray="4 3"/><rect x="38" y="10" width="22" height="44" rx="2"/><path d="M20 30h24M38 24l6 6l-6 6"/>`),
  'trvs:yes': null,
};
const KEYLESS = ['bedrooms', 'bathrooms', 'baths', 'radiators', 'trvs'];
export function icon(k, v) {
  const x = I[k + ':' + v];
  if (x) return x;
  if (KEYLESS.includes(k)) return I[k + ':*'] || '';
  return '';
}
