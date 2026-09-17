/* =========================================================================
   Boîte à outils partagée par les trois applications.
   Vanilla, aucune dépendance. Les apps écrivent du HTML en chaînes (comme
   devis60) et branchent leurs écouteurs par délégation sur .content.
   ========================================================================= */

import { ico } from './icons.js';

export const qs  = (sel, root) => (root || document).querySelector(sel);
export const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/** Échappe le texte destiné au HTML. */
export function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Construit un élément depuis une chaîne HTML. */
export function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Délégation d'événement : on(racine, '.classe', 'click', (ev, cible) => …) */
export function on(root, sel, type, fn){
  root.addEventListener(type, ev => {
    const cible = ev.target.closest(sel);
    if (cible && root.contains(cible)) fn(ev, cible);
  });
}

/* ------------------------------ fragments ------------------------------ */

/** Barre haute d'application. */
export function topbar({ titre, sous, retour = true, actions = '' }){
  return '<header class="topbar">' +
    (retour ? '<button class="backbtn" data-retour aria-label="Retour à l\'écran d\'accueil">' + ico('back') + '</button>' : '') +
    '<div class="tt"><h2>' + esc(titre) + '</h2>' +
      (sous ? '<div class="sub">' + esc(sous) + '</div>' : '') +
    '</div>' +
    (actions ? '<div class="act">' + actions + '</div>' : '') +
  '</header>';
}

/** Barre d'onglets basse. tabs = [{id, label, icone, badge}] */
export function navbar(tabs, actif){
  return '<nav class="navbar">' + tabs.map(t =>
    '<button data-tab="' + t.id + '" aria-current="' + (t.id === actif) + '">' +
      ico(t.icone) +
      (t.badge ? '<span class="nbadge">' + t.badge + '</span>' : '') +
      '<span>' + esc(t.label) + '</span>' +
    '</button>').join('') + '</nav>';
}

/** Petite courbe pleine — valeurs brutes, largeur/hauteur en px. */
export function sparkline(vals, { w = 300, h = 54, couleur = 'var(--accent)' } = {}){
  if (!vals.length) return '';
  const max = Math.max(...vals) || 1;
  const pas = w / (vals.length - 1 || 1);
  const pts = vals.map((v,i) => [i*pas, h - 4 - (v/max)*(h-10)]);
  const ligne = pts.map((p,i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const aire  = ligne + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
  const uid = 'sp' + Math.random().toString(36).slice(2,8);
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:' + h + 'px;display:block">' +
    '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + couleur + '" stop-opacity=".34"/>' +
      '<stop offset="100%" stop-color="' + couleur + '" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<path d="' + aire + '" fill="url(#' + uid + ')"/>' +
    '<path d="' + ligne + '" fill="none" stroke="' + couleur + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + pts[pts.length-1][0].toFixed(1) + '" cy="' + pts[pts.length-1][1].toFixed(1) + '" r="3" fill="' + couleur + '"/>' +
  '</svg>';
}

/** Jauge en anneau (0 → 1). */
export function anneau(ratio, { taille = 66, couleur = 'var(--accent)', texte = '' } = {}){
  const r = (taille/2) - 5, c = 2*Math.PI*r;
  const off = c * (1 - Math.max(0, Math.min(1, ratio)));
  return '<svg viewBox="0 0 ' + taille + ' ' + taille + '" style="width:' + taille + 'px;height:' + taille + 'px;flex:none">' +
    '<circle cx="' + taille/2 + '" cy="' + taille/2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="5"/>' +
    '<circle cx="' + taille/2 + '" cy="' + taille/2 + '" r="' + r + '" fill="none" stroke="' + couleur + '" stroke-width="5" ' +
      'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" ' +
      'transform="rotate(-90 ' + taille/2 + ' ' + taille/2 + ')"/>' +
    (texte ? '<text x="50%" y="50%" text-anchor="middle" dy="4" fill="var(--ink)" ' +
      'font-family="IBM Plex Mono, monospace" font-size="' + (taille/4.6).toFixed(0) + '">' + esc(texte) + '</text>' : '') +
  '</svg>';
}

/** Compteur animé de 0 à la valeur finale. */
export function compte(node, fin, { duree = 700, format = v => Math.round(v).toString() } = {}){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){ node.textContent = format(fin); return; }
  const t0 = performance.now();
  (function pas(t){
    const p = Math.min(1, (t - t0) / duree);
    const e = 1 - Math.pow(1 - p, 3);
    node.textContent = format(fin * e);
    if (p < 1) requestAnimationFrame(pas);
  })(t0);
}

/** Retour tactile discret, si le support le permet. */
export function vibrer(ms = 8){
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e){}
}

export const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Minuteur annulable, rangé par l'app à sa fermeture. */
export function horloge(fn, ms){
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}
