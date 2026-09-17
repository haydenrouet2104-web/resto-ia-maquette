/* =========================================================================
   Runtime du téléphone : barre d'état, écran d'accueil, ouverture et
   fermeture des applications, notifications, toasts et feuilles modales.
   Chaque application est un module qui exporte :
     { id, nom, sousTitre, accent, icone, fond, badge, css, monter(win, api) }
   ========================================================================= */

import { ico, DECO, DOCK } from './icons.js';
import { el, esc, reduit, vibrer } from './ui.js';
import * as data from './data.js';

import gerant     from './app-gerant.js';
import cuisine    from './app-cuisine.js';
import commercial from './app-commercial.js';

const APPS = [gerant, cuisine, commercial];

/* ------------------------------- montage ------------------------------- */
const screen   = document.getElementById('screen');
const horloge  = document.getElementById('sb-heure');
const springboard = document.getElementById('springboard');
const appgrid  = document.getElementById('appgrid');
const dockEl   = document.getElementById('dock');
const homebar  = document.getElementById('homebar');
const toastEl  = document.getElementById('toast');
const notifEl  = document.getElementById('notif');
const sheetBack= document.getElementById('sheet-back');
const sheetEl  = document.getElementById('sheet');

let appOuverte = null;        // { def, win, demonter }
let toastTimer = null, notifTimer = null;

/* ------------------------------ barre d'état ------------------------------ */
function majHeure(){
  const d = new Date();
  horloge.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
majHeure(); setInterval(majHeure, 10000);

/* ------------------------------ écran d'accueil ------------------------------ */
function tuile({ label, bg, glyph, ink, badge, demo, dataAttr }){
  return '<div class="appwrap ' + (demo ? 'is-demo' : 'is-deco') + '">' +
    '<button ' + (dataAttr || 'data-deco="1"') + ' aria-label="' + esc(label) + '">' +
      '<span class="appicon" style="background:' + bg + ';color:' + (ink || '#fffaf0') + '">' +
        ico(glyph) +
        (badge ? '<span class="badge">' + badge + '</span>' : '') +
      '</span>' +
    '</button>' +
    '<span class="label">' + esc(label) + '</span>' +
  '</div>';
}

function peindreAccueil(){
  const demos = APPS.map(a => tuile({
    label:a.nom, bg:a.fond, glyph:a.icone, ink:a.encre, badge:a.badge, demo:true,
    dataAttr:'data-app="' + a.id + '"'
  }));
  const deco = DECO.map(d => tuile({ label:d.label, bg:d.bg, glyph:d.g, ink:d.ink }));
  appgrid.innerHTML = demos.concat(deco).join('');
  dockEl.innerHTML  = DOCK.map(d => tuile({ label:d.label, bg:d.bg, glyph:d.g, ink:d.ink })).join('');
}
peindreAccueil();

appgrid.addEventListener('click', ev => {
  const b = ev.target.closest('button');
  if (!b) return;
  if (b.dataset.app) ouvrir(b.dataset.app, b);
  else decor(b);
});
dockEl.addEventListener('click', ev => {
  const b = ev.target.closest('button');
  if (b) decor(b);
});

function decor(btn){
  vibrer(6);
  const nom = btn.getAttribute('aria-label');
  toast('« ' + nom + ' » est une icône de décor — seules les trois applications Resto IA sont maquettées.');
}

/* --------------------------- ouverture d'application --------------------------- */
function ouvrir(id, depuis){
  const def = APPS.find(a => a.id === id);
  if (!def || appOuverte) return;
  vibrer(10);

  injecterCss(def);

  const win = el('<section class="appwin" style="--app-accent:' + def.accent + '"></section>');
  // l'app grandit depuis son icône
  if (depuis && !reduit()){
    const r = depuis.getBoundingClientRect(), s = screen.getBoundingClientRect();
    win.style.transformOrigin =
      (((r.left + r.width/2 - s.left) / s.width) * 100).toFixed(1) + '% ' +
      (((r.top + r.height/2 - s.top) / s.height) * 100).toFixed(1) + '%';
  }
  screen.insertBefore(win, homebar);
  springboard.classList.add('is-back');

  const api = construireApi(def);
  let demonter = null;
  requestAnimationFrame(() => {
    win.classList.add('is-open');
    try { demonter = def.monter(win, api) || null; }
    catch(e){
      console.error('[' + def.id + ']', e);
      win.innerHTML = '<div class="content"><div class="note bad"><b>Cette application n\'a pas pu se charger.</b><br>' + esc(e.message) + '</div></div>';
    }
    appOuverte = { def, win, demonter };
  });

  win.addEventListener('click', ev => {
    if (ev.target.closest('[data-retour]')) fermer();
  });
  document.documentElement.dataset.app = id;
}

function fermer(){
  if (!appOuverte) return;
  const { win, demonter } = appOuverte;
  try { if (typeof demonter === 'function') demonter(); } catch(e){ console.error(e); }
  appOuverte = null;
  fermerSheet();
  win.classList.remove('is-open');
  springboard.classList.remove('is-back');
  delete document.documentElement.dataset.app;
  setTimeout(() => win.remove(), reduit() ? 0 : 420);
  vibrer(6);
}

homebar.addEventListener('click', fermer);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape'){ if (sheetEl.classList.contains('is-on')) fermerSheet(); else fermer(); } });

/* styles propres à chaque app, injectés une seule fois */
const cssInjecte = new Set();
function injecterCss(def){
  if (!def.css || cssInjecte.has(def.id)) return;
  const s = document.createElement('style');
  s.dataset.app = def.id;
  s.textContent = def.css;
  document.head.appendChild(s);
  cssInjecte.add(def.id);
}

/* ------------------------------ overlays ------------------------------ */
export function toast(msg, ms = 2600){
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), ms);
}

function notifier({ titre, texte, couleur = 'var(--accent)', glyph = 'bell', tm = 'maintenant', onClic }){
  notifEl.innerHTML =
    '<span class="ic" style="background:' + couleur + '22;color:' + couleur + '">' + ico(glyph) + '</span>' +
    '<span class="tx"><b>' + esc(titre) + '</b><span>' + esc(texte) + '</span></span>' +
    '<span class="tm">' + esc(tm) + '</span>';
  notifEl.classList.add('is-on');
  notifEl.onclick = () => { notifEl.classList.remove('is-on'); if (onClic) onClic(); };
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => notifEl.classList.remove('is-on'), 5200);
}

function ouvrirSheet(titre, html, monter){
  sheetEl.innerHTML =
    '<div class="sheet-grab"><i></i></div>' +
    '<div class="sheet-head"><h3>' + esc(titre) + '</h3>' +
      '<button class="backbtn" data-fermer-sheet aria-label="Fermer">' + ico('x') + '</button></div>' +
    '<div class="sheet-body">' + html + '</div>';
  sheetBack.classList.add('is-on');
  sheetEl.classList.add('is-on');
  if (monter) monter(sheetEl.querySelector('.sheet-body'));
}
function fermerSheet(){
  sheetEl.classList.remove('is-on');
  sheetBack.classList.remove('is-on');
}
sheetBack.addEventListener('click', fermerSheet);
sheetEl.addEventListener('click', ev => { if (ev.target.closest('[data-fermer-sheet]')) fermerSheet(); });

/* --------------------------- API offerte aux apps --------------------------- */
function construireApi(def){
  return {
    app:def.id,
    data, fmt:data.fmt, ico,
    fermer, toast, vibrer,
    notif:notifier,
    sheet:ouvrirSheet,
    fermerSheet,
    /** Ouvre une autre application (ex. : le gérant qui bascule sur la cuisine). */
    basculer(id){ fermer(); setTimeout(() => ouvrir(id, document.querySelector('[data-app="' + id + '"]')), 300); },
    /** Met à jour la pastille de l'icône sur l'écran d'accueil. */
    badge(n){
      def.badge = n;
      const b = document.querySelector('[data-app="' + def.id + '"] .badge');
      if (n && b) b.textContent = n;
      else if (n && !b){
        const ic = document.querySelector('[data-app="' + def.id + '"] .appicon');
        if (ic) ic.insertAdjacentHTML('beforeend', '<span class="badge">' + n + '</span>');
      } else if (!n && b) b.remove();
    }
  };
}

/* --------------------------- raccourcis de la page --------------------------- */
document.querySelectorAll('[data-lancer]').forEach(b => {
  b.addEventListener('click', () => {
    const id = b.dataset.lancer;
    if (appOuverte) fermer();
    setTimeout(() => ouvrir(id, document.querySelector('[data-app="' + id + '"]')), appOuverte ? 320 : 0);
  });
});

/* Une vie de service : une commande tombe pendant qu'on regarde autre chose. */
setTimeout(() => {
  if (!appOuverte) notifier({
    titre:'Resto IA — Snack Le Comptoir',
    texte:'Commande #252 confirmée · 2 tacos M, 1 kebab XL — retrait 20:12',
    couleur:'#5fbf8b', glyph:'check', tm:'maintenant',
    onClic:() => ouvrir('cuisine', document.querySelector('[data-app="cuisine"]'))
  });
}, 6000);
