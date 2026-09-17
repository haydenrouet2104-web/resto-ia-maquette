/* Glyphes SVG — trait uniquement, hérite de currentColor.
   Utilisation : ico('phone')  →  chaîne <svg>…</svg>
   Les icônes « décor » du springboard sont dans deco().           */

export const PATHS = {
  phone:'<path d="M6.6 3.5 4 6.1c-.7.7-.9 1.8-.5 2.7a20 20 0 0 0 11.7 11.7c.9.4 2 .2 2.7-.5l2.6-2.6-4.2-2.8-2 1.6a15 15 0 0 1-6.5-6.5l1.6-2z"/>',
  phoneIn:'<path d="M6.6 3.5 4 6.1c-.7.7-.9 1.8-.5 2.7a20 20 0 0 0 11.7 11.7c.9.4 2 .2 2.7-.5l2.6-2.6-4.2-2.8-2 1.6a15 15 0 0 1-6.5-6.5l1.6-2z"/><path d="M15 9h5V4"/><path d="M14 10 21 3"/>',
  mic:'<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
  wave:'<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2M21 12h0"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  book:'<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v16H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M8 8h7M8 12h5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.8"/>',
  card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M6.5 14.5h3"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a6 6 0 0 0-1.6-4"/>',
  pin:'<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  printer:'<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  bell:'<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z"/><path d="M10.5 20a1.8 1.8 0 0 0 3 0"/>',
  check:'<path d="m4.5 12.5 5 5 10-11"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  back:'<path d="m14 6-6 6 6 6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  edit:'<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  euro:'<path d="M17 6.5A6 6 0 0 0 7.4 9M7.4 15A6 6 0 0 0 17 17.5M4 10.5h8M4 13.5h8"/>',
  truck:'<path d="M3 7h10v9H3zM13 10h4l3 3v3h-7z"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/>',
  bag:'<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  flame:'<path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.7.7-3 1.6-4 .3 1.4 1 2 1.9 2 1.2 0 1.9-1 1.9-2.6 0-1.6-.4-3-1.4-4.4z"/>',
  bike:'<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="m9 17 3-7h4M11 7h3"/>',
  ticket:'<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M12 7v10"/>',
  layers:'<path d="m12 3 8 4.5-8 4.5-8-4.5z"/><path d="m4 12 8 4.5 8-4.5M4 16.5 12 21l8-4.5"/>',
  shield:'<path d="M12 3 20 6v6c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  sparkle:'<path d="M12 3.5 13.8 9 19 10.8 13.8 12.6 12 18l-1.8-5.4L5 10.8 10.2 9z"/><path d="M18.5 4.5 19 6l1.5.5L19 7l-.5 1.5L18 7l-1.5-.5L18 6z"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"/>',
  sms:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  play:'<path d="M8 5.5 18 12 8 18.5z"/>',
  pause:'<path d="M9 5v14M15 5v14"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  refresh:'<path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5"/><path d="M4 4.5v4h4"/><path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5"/><path d="M20 19.5v-4h-4"/>',
  camera:'<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8.5 7 10 4h4l1.5 3"/>',
  ghost:'<path d="M5 20V10a7 7 0 0 1 14 0v10l-2.3-2-2.3 2-2.4-2-2.4 2L7.3 18z"/><path d="M9.5 10h.01M14.5 10h.01"/>',
  music:'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  cloud:'<path d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.6 1.4A3.6 3.6 0 0 1 17.5 18z"/>',
  map:'<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
  photo:'<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m4 17 5-4.5 4.5 4 3-2.5L20 18"/>',
  video:'<rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 11 6-3.5v9L15 13z"/>',
  cart:'<path d="M3 5h2.2l2.3 10h9l2-7H6"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
  star:'<path d="m12 4 2.5 5.3 5.5.7-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.7z"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  route:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h.5"/>',
  hand:'<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-4a1.5 1.5 0 0 1 3 0"/>',
  lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3"/>',
  power:'<path d="M12 4v8"/><path d="M6.5 7.5a8 8 0 1 0 11 0"/>'
};

export function ico(name, cls){
  const d = PATHS[name] || PATHS.sparkle;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
         'stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' + d + '</svg>';
}

/* Icônes décoratives du springboard : formes génériques, aucun logo de marque.
   fond = dégradé de la tuile, glyphe = trait clair.                          */
export const DECO = [
  { label:'Photos',   bg:'linear-gradient(150deg,#f0a35e,#d24f7c 55%,#8a3fb0)', g:'camera' },
  { label:'Éclair',   bg:'linear-gradient(150deg,#ffe066,#f5c518)',              g:'ghost', ink:'#2a2003' },
  { label:'Messages', bg:'linear-gradient(150deg,#63d47f,#1fa84e)',              g:'sms',   ink:'#04210f' },
  { label:'Musique',  bg:'linear-gradient(150deg,#f57d7d,#c62f47)',              g:'music' },
  { label:'Maps',     bg:'linear-gradient(150deg,#7fd6a8,#3f8fd4 70%)',          g:'map' },
  { label:'Météo',    bg:'linear-gradient(150deg,#7db8ec,#2f6fb5)',              g:'cloud' },
  { label:'Mail',     bg:'linear-gradient(150deg,#8fc3f0,#2d6fc4)',              g:'mail' },
  { label:'Vidéo',    bg:'linear-gradient(150deg,#2c2c34,#111116)',              g:'video' },
  { label:'Galerie',  bg:'linear-gradient(150deg,#c8a2e8,#6a4fb5)',              g:'photo' },
  { label:'Courses',  bg:'linear-gradient(150deg,#ffb36b,#e2622a)',              g:'cart' },
  { label:'Agenda',   bg:'linear-gradient(150deg,#f3f0e6,#cfc7b4)',              g:'calendar', ink:'#1a1712' },
  { label:'Réglages', bg:'linear-gradient(150deg,#6e6a62,#3a3833)',              g:'settings' }
];

export const DOCK = [
  { label:'Téléphone', bg:'linear-gradient(150deg,#63d47f,#1c9c48)', g:'phone', ink:'#04210f' },
  { label:'Messages',  bg:'linear-gradient(150deg,#7db8ec,#2f6fb5)', g:'sms' },
  { label:'Notes',     bg:'linear-gradient(150deg,#f3e6b0,#d9b84a)', g:'doc', ink:'#241c05' },
  { label:'Photos',    bg:'linear-gradient(150deg,#f0a35e,#d24f7c 55%,#8a3fb0)', g:'photo' }
];
