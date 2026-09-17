/* =========================================================================
   Application « Commercial » — apporteur d’affaires indépendant.
   Spécification : business plan v1.7, §5 (attribution et CRM), §6.1
   (zone pilote, productivité) et §1.1 (taille réelle du marché).

   Quatre onglets : Secteur (carte du terrain), Prospects (liste de travail),
   Argumentaire (outil de porte), Gains (commission récurrente).

   Le CRM attribue des prospects et des commissions ; il n’impose ni horaires,
   ni itinéraire, ni sanction. Aucun suivi GPS continu.
   ========================================================================= */

import { topbar, navbar, esc, el, on, compte, reduit } from './ui.js';
import { ico } from './icons.js';

/* ------------------------------ constantes ------------------------------ */

/* Couleur de chaque statut du CRM — uniquement des variables du thème. */
const COUL = {
  jamais:'var(--ink-3)', reserve:'var(--accent)', sansrep:'var(--ink-2)',
  refus:'var(--bad)',    attente:'var(--warn)',   essai:'var(--info)',
  client:'var(--ok)',    stop:'var(--bad)'
};
/* Noms courts pour les pastilles et les compteurs. */
const COURT = {
  jamais:'Jamais', reserve:'Réservé', sansrep:'Sans rép.', refus:'Refus',
  attente:'Attente', essai:'Essai', client:'Client', stop:'Stop'
};
const ORDRE = ['jamais','reserve','sansrep','attente','essai','client','refus','stop'];

const JOUR_MS = 86400000;
const RESERVATION = 3 * JOUR_MS;      // §5 : verrou de 3 jours
const COOLDOWN    = 60 * JOUR_MS;     // §5 : 2 mois avant de pouvoir reprendre

/* Position du commercial sur la carte, en pourcentage comme les prospects. */
const MOI = { x:48, y:55 };
const METRE = 12;                      // 1 point de la grille ≈ 12 m de trottoir
const VITESSE = 75;                    // marche, m/min
const PAR_VISITE = 12;                 // min passées devant une porte

/* Îlots dessinés à la main : [x, y, largeur, hauteur] dans le repère 320×240. */
const ILOTS = [
  [48,8,62,52],[118,8,74,52],[200,8,54,52],[262,8,50,52],
  [42,68,68,62],[118,68,74,62],[200,68,54,62],[262,68,50,62],
  [36,138,74,56],[118,138,74,56],[200,138,54,56],[262,138,50,56],
  [30,202,80,30],[118,202,74,30],[200,202,54,30],[262,202,50,30]
];

/* Les trois preuves de visite admises — §5. L’audio n’en fait pas partie. */
const PREUVES = [
  { id:'appel',   ic:'phone',  nom:'Appel depuis le numéro professionnel Resto IA',
    det:'Restaurant, date, heure et durée horodatés dans le CRM.' },
  { id:'message', ic:'sms',    nom:'Message depuis le canal Resto IA',
    det:'Canal, date, contenu et statut de livraison.' },
  { id:'photo',   ic:'camera', nom:'Photo de devanture',
    det:'Sans visages ni plaques d’immatriculation. Rien d’autre n’est capté.' }
];

/* Pitch de porte : quatre segments de 5 secondes. */
const PITCH = [
  { t:0,  txt:"Bonjour, Nadia, Resto IA — une minute, hors coup de feu ?" },
  { t:5,  txt:"Aux heures de pointe, les appels que vous ne décrochez pas commandent chez le voisin." },
  { t:10, txt:"On met un assistant vocal sur votre ligne : il répond, prend la commande, et rien ne part en cuisine tant que le client n’a pas confirmé." },
  { t:15, txt:"Vous gardez votre numéro, on n’encaisse rien. Dix minutes d’installation, essai gratuit — je vous fais écouter ?" }
];

/* Extrait d’appel joué au gérant sur le pas de la porte. */
const DEMO = [
  { qui:'ia',  txt:"Bonsoir, assistant vocal automatisé du Comptoir, je prends votre commande ?" },
  { qui:'cli', txt:"Un tacos M poulet, sauce algérienne." },
  { qui:'ia',  txt:"C’est noté, frites et boisson comprises. Je vous envoie le récapitulatif par SMS — vous me confirmez ?" },
  { qui:'cli', txt:"Oui, je valide." },
  { qui:'sys', txt:"Commande #248 confirmée → écran cuisine" }
];

/* ------------------------------ utilitaires ------------------------------ */

const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const pad  = n => String(n).padStart(2,'0');

/** « 2 j 04:11:57 » — le temps restant d’une réservation. */
function resteTxt(ms){
  if (ms <= 0) return 'expiré';
  const s = Math.floor(ms/1000), j = Math.floor(s/86400);
  return (j ? j + ' j ' : '') + pad(Math.floor(s%86400/3600)) + ':' + pad(Math.floor(s%3600/60)) + ':' + pad(s%60);
}
const dateCourte = ts => new Date(ts).toLocaleDateString('fr-FR',{ day:'2-digit', month:'long' });

/* ============================== le module ============================== */

export default {
  id:'commercial',
  nom:'Commercial',
  sousTitre:'Nadia B. · Lyon 7e',
  accent:'#7fa8d8',
  fond:'linear-gradient(150deg,#8fb8e8,#3a6fb0)',
  encre:'#07101c',
  icone:'pin',
  badge:3,

  css:`
  .cm-map{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--rule);
    background:linear-gradient(160deg,#12100c,#0c0b08)}
  .cm-map svg{display:block;width:100%;height:auto}
  .cm-map .cm-legende{position:absolute;left:9px;bottom:8px;display:flex;gap:6px;align-items:center;
    font-family:var(--f-mono);font-size:9px;letter-spacing:.06em;color:var(--ink-3);
    background:rgba(11,10,8,.66);border:1px solid var(--rule);border-radius:999px;padding:3px 8px}
  .cm-pt{cursor:pointer;transform-box:fill-box;transform-origin:center;
    animation:cm-pop .42s var(--ease) both;transition:opacity .42s var(--ease)}
  .cm-pt.is-off{opacity:.11}
  .cm-pt:active{transform:scale(.86)}
  @keyframes cm-pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
  .cm-halo{transform-box:fill-box;transform-origin:center;animation:cm-ping 2.4s ease-out infinite}
  @keyframes cm-ping{0%{transform:scale(.5);opacity:.55}100%{transform:scale(2.6);opacity:0}}
  .cm-route{stroke-dasharray:5 6;animation:cm-dash 1.1s linear infinite}
  @keyframes cm-dash{to{stroke-dashoffset:-22}}
  .cm-cnt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .cm-cnt button{border:1px solid var(--rule);border-radius:11px;background:var(--surface);
    padding:7px 4px 6px;display:grid;justify-items:center;gap:2px;transition:border-color .2s,background .2s}
  .cm-cnt button b{font-family:var(--f-mono);font-size:15px;color:var(--c,var(--ink))}
  .cm-cnt button span{font-size:9px;color:var(--ink-3);letter-spacing:.02em}
  .cm-cnt button[aria-pressed="true"]{border-color:var(--rule-strong);background:var(--accent-soft)}
  .cm-cnt button[aria-pressed="true"] span{color:var(--ink-2)}
  .cm-etape{display:flex;gap:10px;align-items:flex-start;padding:7px 0}
  .cm-etape+.cm-etape{border-top:1px dashed var(--rule)}
  .cm-no{width:21px;height:21px;border-radius:50%;flex:none;display:grid;place-items:center;
    background:var(--info-soft);color:var(--info);font-family:var(--f-mono);font-size:10.5px;
    border:1px solid rgba(127,168,216,.4)}
  .cm-etape .tx{flex:1;min-width:0}
  .cm-etape .tx b{display:block;font-size:12.5px}
  .cm-etape .tx span{display:block;font-size:10.5px;color:var(--ink-3)}
  .cm-search{display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:11px;
    border:1px solid var(--rule);background:var(--surface)}
  .cm-search svg{width:15px;height:15px;color:var(--ink-3);flex:none}
  .cm-search input{flex:1;border:0;background:none;padding:10px 0;font-size:13.5px;outline:none}
  .cm-pastille{width:9px;height:9px;border-radius:50%;flex:none;background:var(--c);
    box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 22%,transparent)}
  .cm-cd{font-size:10.5px;color:var(--accent);letter-spacing:.02em;flex:none}
  .cm-vide{text-align:center;color:var(--ink-3);font-size:12px;padding:22px 0}
  .cm-fiche-h{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
  .cm-meta{display:grid;gap:7px}
  .cm-meta div{display:flex;gap:10px;justify-content:space-between;font-size:12px;border-bottom:1px dashed var(--rule);padding-bottom:6px}
  .cm-meta div:last-child{border-bottom:0;padding-bottom:0}
  .cm-meta b{color:var(--ink);font-weight:600;text-align:right}
  .cm-meta span{color:var(--ink-3)}
  .cm-acts{display:grid;gap:7px}
  .cm-acts .cta[disabled]{opacity:.42;pointer-events:none}
  .cm-preuves{display:grid;gap:7px;max-height:0;overflow:hidden;opacity:0;
    transition:max-height .38s var(--ease),opacity .28s ease}
  .cm-preuves.is-on{max-height:420px;opacity:1}
  .cm-shot{position:relative;border-radius:12px;overflow:hidden}
  .cm-flash{position:absolute;inset:0;background:var(--ink);opacity:0;pointer-events:none;z-index:2}
  .cm-flash.is-on{animation:cm-obtu .55s ease-out}
  @keyframes cm-obtu{0%{opacity:0}10%{opacity:.9}30%{opacity:.1}100%{opacity:0}}
  .cm-vue{position:relative;height:74px;border-radius:12px;border:1px solid var(--rule);
    background:linear-gradient(170deg,var(--surface-3),var(--surface));overflow:hidden}
  .cm-vue svg{position:absolute;inset:0;width:100%;height:100%;color:var(--ink-3);opacity:.55}
  .cm-acc{border:1px solid var(--rule);border-radius:12px;background:var(--surface);overflow:hidden}
  .cm-acc+.cm-acc{margin-top:7px}
  .cm-acc>button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:11px 13px;font-size:12.5px}
  .cm-acc>button .chev{transition:transform .3s var(--ease)}
  .cm-acc.is-on>button .chev{transform:rotate(90deg)}
  .cm-acc.is-on{border-color:var(--rule-strong)}
  .cm-acc-b{max-height:0;overflow:hidden;opacity:0;transition:max-height .36s var(--ease),opacity .26s ease}
  .cm-acc.is-on .cm-acc-b{max-height:200px;opacity:1}
  .cm-acc-b p{padding:0 13px 12px;font-size:12px;color:var(--ink-2);line-height:1.55}
  .cm-chrono{height:4px;border-radius:2px;background:var(--surface-3);overflow:hidden}
  .cm-chrono i{display:block;height:100%;width:0;border-radius:2px;background:var(--info)}
  .cm-seg-p{font-size:12.5px;line-height:1.55;color:var(--ink-3);transition:color .3s ease}
  .cm-seg-p.is-on{color:var(--ink)}
  .cm-wv{display:flex;align-items:flex-end;justify-content:center;gap:2px;height:30px}
  .cm-wv i{width:3px;height:3px;border-radius:2px;background:var(--info);transition:height .1s linear}
  .cm-bulle{border-radius:12px;padding:8px 11px;font-size:12px;line-height:1.5;max-width:88%}
  .cm-bulle.ia{background:var(--info-soft);border:1px solid rgba(127,168,216,.28);align-self:flex-start}
  .cm-bulle.cli{background:var(--surface-2);border:1px solid var(--rule);align-self:flex-end}
  .cm-bulle.sys{background:var(--ok-soft);border:1px solid rgba(95,191,139,.3);color:var(--ok);
    align-self:center;font-family:var(--f-mono);font-size:10.5px;letter-spacing:.04em;max-width:100%}
  .cm-fil{display:flex;flex-direction:column;gap:7px;min-height:118px}
  .cm-mb{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;align-items:end;height:104px}
  .cm-mb .c{display:grid;justify-items:center;gap:5px;height:100%;align-content:end}
  .cm-mb i{display:block;width:100%;height:0;border-radius:5px 5px 2px 2px;
    background:linear-gradient(180deg,var(--info),rgba(127,168,216,.35));
    transition:height .9s var(--ease)}
  .cm-mb .c.on i{background:linear-gradient(180deg,var(--accent-bright),var(--accent-soft))}
  .cm-mb small{font-size:9.5px;color:var(--ink-3);font-family:var(--f-mono)}
  .cm-fn{display:grid;gap:7px}
  .cm-fn .l{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px}
  .cm-fn .l span{color:var(--ink-2)}
  .cm-fn .l b{font-family:var(--f-mono)}
  .cm-fn .bar i{width:0;background:var(--c,var(--accent));transition:width .9s var(--ease)}
  .cm-range{width:100%;-webkit-appearance:none;appearance:none;height:22px;background:none}
  .cm-range::-webkit-slider-runnable-track{height:5px;border-radius:3px;background:var(--surface-3)}
  .cm-range::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;
    margin-top:-7px;background:var(--info);border:2px solid var(--bg);cursor:grab}
  .cm-range::-moz-range-track{height:5px;border-radius:3px;background:var(--surface-3)}
  .cm-range::-moz-range-thumb{width:17px;height:17px;border:2px solid var(--bg);border-radius:50%;background:var(--info)}
  .cm-proj{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  .cm-proj div{border:1px solid var(--rule);border-radius:11px;background:var(--surface);padding:9px 11px;display:grid;gap:2px}
  .cm-proj b{font-family:var(--f-display);font-size:19px;font-variant-numeric:tabular-nums}
  .cm-proj span{font-size:10px;color:var(--ink-3)}
  `,

  /* ====================================================================== */
  monter(win, api){
    const D = api.data, F = api.fmt;

    /* --------------------------- minuteurs --------------------------- */
    const intervalles = new Set(), delais = new Set(), trames = new Set();
    const chaque = (fn, ms) => { const id = setInterval(fn, ms); intervalles.add(id); return id; };
    const apres  = (fn, ms) => { const id = setTimeout(() => { delais.delete(id); fn(); }, ms); delais.add(id); return id; };
    function boucle(fn){                       // rAF annulable
      let id = 0, vivant = true;
      const pas = t => {
        trames.delete(id);
        if (!vivant) return;
        if (fn(t) === false){ vivant = false; return; }
        id = requestAnimationFrame(pas); trames.add(id);
      };
      id = requestAnimationFrame(pas); trames.add(id);
      return () => { vivant = false; cancelAnimationFrame(id); trames.delete(id); };
    }
    let nettoyerOnglet = null;                 // animations propres à l’onglet courant

    /* ------------------------------ état ------------------------------ */
    const S = {
      onglet:'secteur',
      filtre:null,                             // statut filtré sur la carte
      q:'', fstat:'tous',
      tournee:false,
      prospects:D.PROSPECTS.map(p => Object.assign({}, p)),
      clientsBase:D.COMMERCIAL.clientsActifs   // portefeuille hors zone comprise
    };
    /* La réservation en cours dans les données devient une vraie échéance. */
    S.prospects.forEach(p => { if (p.statut === 'reserve') p.expire = Date.now() + (2*24 + 4) * 3600000; });
    const clientsInit = S.prospects.filter(p => p.statut === 'client').length;

    const trouver = id => S.prospects.find(p => p.id === +id);
    const nb = st => S.prospects.filter(p => p.statut === st).length;
    /* Portefeuille facturé : la base du BP, corrigée des mouvements de la zone. */
    const clientsActifs = () => S.clientsBase + (nb('client') - clientsInit);
    /* Ce qui demande une action : réservé, en attente, sans réponse. */
    const aTraiter = () => nb('reserve') + nb('attente') + nb('sansrep');

    function majBadge(){
      const n = aTraiter();
      api.badge(n);
      const c = win.querySelector('[data-att]');
      if (c) c.textContent = n + ' à traiter';
    }

    /* ---------------------------- la carte ---------------------------- */
    const CX = p => 8 + p.x/100 * 304;
    const CY = p => 6 + p.y/100 * 228;

    function routeOrdonnee(){                  // plus proche voisin depuis « vous êtes ici »
      const reste = S.prospects.filter(p => p.statut === 'jamais');
      const ordre = []; let cur = MOI;
      while (reste.length){
        let k = 0, best = Infinity;
        reste.forEach((p,i) => { const d = dist(cur,p); if (d < best){ best = d; k = i; } });
        cur = reste[k]; ordre.push(cur); reste.splice(k,1);
      }
      return ordre;
    }
    function metresTournee(ordre){
      let cur = MOI, m = 0;
      ordre.forEach(p => { m += dist(cur,p) * METRE; cur = p; });
      return Math.round(m);
    }

    function svgRoute(){
      if (!S.tournee) return '';
      const ordre = routeOrdonnee();
      if (!ordre.length) return '';
      const pts = [MOI].concat(ordre).map(p => CX(p).toFixed(1) + ',' + CY(p).toFixed(1)).join(' ');
      return '<polyline class="cm-route" points="' + pts + '" fill="none" stroke="var(--info)" stroke-width="1.6" stroke-linejoin="round"/>' +
        ordre.map((p,i) =>
          '<g><circle cx="' + CX(p).toFixed(1) + '" cy="' + (CY(p)-13).toFixed(1) + '" r="7" fill="var(--bg)" stroke="var(--info)" stroke-width="1"/>' +
          '<text x="' + CX(p).toFixed(1) + '" y="' + (CY(p)-10).toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8" fill="var(--info)">' + (i+1) + '</text></g>'
        ).join('');
    }

    function svgPoints(){
      return S.prospects.map((p,i) => {
        const off = S.filtre && S.filtre !== p.statut;
        const c = COUL[p.statut];
        const creux = p.statut === 'stop' || p.statut === 'jamais';
        return '<g class="cm-pt' + (off ? ' is-off' : '') + '" data-p="' + p.id + '" ' +
          'style="animation-delay:' + (reduit() ? 0 : (i*45)) + 'ms" role="button" tabindex="0" ' +
          'aria-label="' + esc(p.nom + ' — ' + D.STATUTS[p.statut].nom) + '">' +
          '<circle cx="' + CX(p).toFixed(1) + '" cy="' + CY(p).toFixed(1) + '" r="13" fill="transparent"/>' +
          '<circle cx="' + CX(p).toFixed(1) + '" cy="' + CY(p).toFixed(1) + '" r="9" fill="' + c + '" opacity=".16"/>' +
          '<circle cx="' + CX(p).toFixed(1) + '" cy="' + CY(p).toFixed(1) + '" r="5" ' +
            (creux ? 'fill="var(--bg)" stroke="' + c + '" stroke-width="1.6"' : 'fill="' + c + '"') + '/>' +
        '</g>';
      }).join('');
    }

    function carte(){
      const ilots = ILOTS.map(b =>
        '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="4" ' +
        'fill="var(--surface-2)" stroke="var(--rule)" stroke-width=".7"/>').join('');
      return '<div class="cm-map">' +
        '<svg viewBox="0 0 320 240" role="img" aria-label="Carte du secteur Guillotière">' +
          /* le Rhône, à l’ouest du secteur */
          '<path d="M0 0 L44 0 C36 70 30 140 26 240 L0 240 Z" fill="var(--info)" opacity=".13"/>' +
          '<path d="M44 0 C36 70 30 140 26 240" fill="none" stroke="var(--info)" stroke-width="1" opacity=".45"/>' +
          '<path d="M34 24 C28 90 22 160 18 236" fill="none" stroke="var(--info)" stroke-width=".6" opacity=".25"/>' +
          ilots +
          '<text x="7" y="120" font-family="IBM Plex Mono, monospace" font-size="6.5" fill="var(--info)" opacity=".7" transform="rotate(-84 7 120)">LE RHÔNE</text>' +
          '<text x="114" y="132" font-family="IBM Plex Mono, monospace" font-size="6" fill="var(--ink-3)" transform="rotate(-90 114 132)">AV. JEAN-JAURÈS</text>' +
          '<text x="122" y="199" font-family="IBM Plex Mono, monospace" font-size="6" fill="var(--ink-3)">COURS GAMBETTA</text>' +
          '<g id="cm-route">' + svgRoute() + '</g>' +
          '<g id="cm-pts">' + svgPoints() + '</g>' +
          /* vous êtes ici */
          '<g class="cm-moi">' +
            '<circle class="cm-halo" cx="' + CX(MOI).toFixed(1) + '" cy="' + CY(MOI).toFixed(1) + '" r="6" fill="var(--accent)"/>' +
            '<circle cx="' + CX(MOI).toFixed(1) + '" cy="' + CY(MOI).toFixed(1) + '" r="3.4" fill="var(--accent-bright)" stroke="var(--bg)" stroke-width="1.4"/>' +
          '</g>' +
        '</svg>' +
        '<span class="cm-legende">Vous êtes ici · position ponctuelle, aucun suivi continu</span>' +
      '</div>';
    }

    /* ========================= vue 1 — Secteur ========================= */
    function vueSecteur(){
      const ordre = routeOrdonnee();
      const m = metresTournee(ordre);
      const minutes = Math.round(m / VITESSE + ordre.length * PAR_VISITE);
      const compteurs = ORDRE.map(st =>
        '<button data-st="' + st + '" aria-pressed="' + (S.filtre === st) + '" style="--c:' + COUL[st] + '">' +
          '<b>' + nb(st) + '</b><span>' + esc(COURT[st]) + '</span></button>').join('');

      return '<div class="sec">' +
          '<div class="sec-head"><h3>' + esc(D.COMMERCIAL.zone) + '</h3>' +
            '<span class="chip info">' + D.COMMERCIAL.ciblesZone + ' cibles</span></div>' +
          carte() +
          '<div class="cm-cnt">' + compteurs + '</div>' +
          '<p class="muted" style="font-size:11px">' +
            (S.filtre ? 'Filtre : <b style="color:' + COUL[S.filtre] + '">' + esc(D.STATUTS[S.filtre].nom) + '</b> — ' + esc(D.STATUTS[S.filtre].def) + ' Touchez à nouveau pour tout réafficher.'
                      : 'Touchez un compteur pour ne garder que ce statut sur la carte, un point pour ouvrir la fiche.') +
          '</p>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Tournée suggérée</h3>' +
            '<button class="cta sm ghost" data-tournee>' + ico(S.tournee ? 'x' : 'route') +
              (S.tournee ? 'Masquer' : 'Sur la carte') + '</button></div>' +
          '<div class="card">' +
            (ordre.length
              ? ordre.map((p,i) =>
                  '<div class="cm-etape"><span class="cm-no">' + (i+1) + '</span>' +
                    '<span class="tx"><b>' + esc(p.nom) + '</b><span>' + esc(p.adresse) + ' · ' + p.distance + ' m</span></span>' +
                    '<button class="cta sm ghost" data-p="' + p.id + '">Fiche</button></div>').join('')
              : '<div class="cm-vide">Aucun prospect jamais démarché sur le secteur — tout est travaillé.</div>') +
            (ordre.length ? '<div class="row between" style="margin-top:10px;border-top:1px solid var(--rule);padding-top:9px">' +
              '<span class="eyebrow">Itinéraire piéton</span>' +
              '<span class="mono" style="font-size:11.5px">≈ ' + F.nb(m) + ' m · ' + minutes + ' min</span></div>' : '') +
          '</div>' +
          '<div class="note info"><b>La zone est une priorité commerciale, pas un planning.</b> ' +
            'Vous gardez vos horaires, votre parcours et votre organisation. Cet ordre n’est qu’un regroupement par proximité : ' +
            'suivez-le, inversez-le ou ignorez-le.</div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Volume du terrain</h3></div>' +
          '<div class="grid3">' +
            '<div class="card tight stat"><b>' + D.COMMERCIAL.ciblesZone + '</b><span>cibles sur le secteur</span></div>' +
            '<div class="card tight stat"><b>29 700</b><span>cibles en France</span></div>' +
            '<div class="card tight stat"><b>1/2 300</b><span>habitants</span></div>' +
          '</div>' +
          '<div class="note"><b>Repère corrigé en v1.7.</b> Le ratio « 1 pour 400 habitants » des versions précédentes comptait ' +
            '<i>tous</i> les restaurants. La cible réelle — indépendant <i>et</i> prenant des commandes par téléphone — ' +
            'est d’environ 29 700 établissements en France, soit 1 pour 2 300 habitants. ' +
            'La zone pilote Lyon 7e–8e, Villeurbanne, Vénissieux en représente 230 à 280.</div>' +
        '</div>';
    }

    function brancherSecteur(c){
      /* filtre : on ne repeint pas, on estompe. */
      on(c, '[data-st]', 'click', (ev, b) => {
        const st = b.dataset.st;
        S.filtre = (S.filtre === st) ? null : st;
        api.vibrer();
        c.querySelectorAll('[data-st]').forEach(x => x.setAttribute('aria-pressed', String(S.filtre === x.dataset.st)));
        c.querySelectorAll('.cm-pt').forEach(g => {
          const p = trouver(g.dataset.p);
          g.classList.toggle('is-off', !!S.filtre && S.filtre !== p.statut);
        });
        const txt = c.querySelector('.sec p.muted');
        if (txt) txt.innerHTML = S.filtre
          ? 'Filtre : <b style="color:' + COUL[S.filtre] + '">' + esc(D.STATUTS[S.filtre].nom) + '</b> — ' + esc(D.STATUTS[S.filtre].def) + ' Touchez à nouveau pour tout réafficher.'
          : 'Touchez un compteur pour ne garder que ce statut sur la carte, un point pour ouvrir la fiche.';
      });
      on(c, '[data-tournee]', 'click', (ev, b) => {
        S.tournee = !S.tournee;
        api.vibrer();
        const g = c.querySelector('#cm-route');
        if (g) g.innerHTML = svgRoute();
        b.innerHTML = ico(S.tournee ? 'x' : 'route') + (S.tournee ? 'Masquer' : 'Sur la carte');
        api.toast(S.tournee ? 'Itinéraire affiché — libre à vous de le suivre ou non.' : 'Itinéraire masqué.');
      });
    }

    /* ======================== vue 2 — Prospects ======================== */
    function lignes(){
      const q = S.q.trim().toLowerCase();
      const l = S.prospects.filter(p =>
        (S.fstat === 'tous' || p.statut === S.fstat) &&
        (!q || (p.nom + ' ' + p.adresse + ' ' + p.type).toLowerCase().includes(q)));
      if (!l.length) return '<div class="cm-vide">Aucun prospect ne correspond.</div>';
      return l.sort((a,b) => a.distance - b.distance).map(p =>
        '<button class="listrow cm-prow" data-p="' + p.id + '">' +
          '<span class="cm-pastille" style="--c:' + COUL[p.statut] + '"></span>' +
          '<span class="tx"><b>' + esc(p.nom) + '</b><span>' + esc(p.adresse) + ' · ' + p.distance + ' m</span></span>' +
          (p.statut === 'reserve' && p.expire
            ? '<span class="cm-cd mono" data-cd="' + p.id + '">' + resteTxt(p.expire - Date.now()) + '</span>'
            : '<span class="chip ' + D.STATUTS[p.statut].ton + '">' + esc(COURT[p.statut]) + '</span>') +
          ico('chev','chev') +
        '</button>').join('');
    }

    function vueProspects(){
      const segs = ['tous'].concat(ORDRE).map(st =>
        '<button data-f="' + st + '" aria-pressed="' + (S.fstat === st) + '">' +
          (st === 'tous' ? 'Tous ' + S.prospects.length : esc(COURT[st]) + ' ' + nb(st)) + '</button>').join('');
      return '<div class="sec">' +
          '<label class="cm-search">' + ico('search') +
            '<input id="cm-q" type="search" placeholder="Rechercher un prospect…" value="' + esc(S.q) + '" autocomplete="off">' +
          '</label>' +
          '<div class="seg">' + segs + '</div>' +
          '<div class="list stagger" id="cm-liste">' + lignes() + '</div>' +
        '</div>' +
        '<div class="note info">Vous ne voyez que vos zones et vos prospects autorisés. Le fondateur voit la France entière ; ' +
          'personne ne voit votre position en dehors d’une preuve de visite ponctuelle.</div>';
    }

    function brancherProspects(c){
      on(c, '#cm-q', 'input', (ev, i) => {
        S.q = i.value;
        c.querySelector('#cm-liste').innerHTML = lignes();
      });
      on(c, '[data-f]', 'click', (ev, b) => {
        S.fstat = b.dataset.f;
        api.vibrer();
        c.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(S.fstat === x.dataset.f)));
        c.querySelector('#cm-liste').innerHTML = lignes();
      });
    }

    /* ---------------------- fiche prospect (feuille) ---------------------- */
    function fiche(p){
      const st = D.STATUTS[p.statut];
      const froid = p.cooldown && Date.now() < p.cooldown;
      const meta = [];
      if (p.statut === 'reserve' && p.expire) meta.push(['Réservation', '<span data-cd="' + p.id + '">' + resteTxt(p.expire - Date.now()) + '</span>']);
      meta.push(['Dernière action', esc(p.derniere || 'aucune action enregistrée')]);
      meta.push(['Preuve de visite', esc(p.preuve || '—')]);
      meta.push(['Objection notée', p.objection ? esc(p.objection) : '—']);
      if (p.rappel)   meta.push(['Rappel programmé', esc(p.rappel)]);
      if (p.relance)  meta.push(['Relance prévue', esc(p.relance)]);
      if (p.retour)   meta.push(['Date de retour', esc(p.retour)]);
      if (p.reste)    meta.push(['Essai', esc(p.reste)]);
      if (p.depuis)   meta.push(['Client depuis', esc(p.depuis)]);
      if (p.ca)       meta.push(['Abonnement', F.euro(p.ca) + ' / mois']);

      const dispoPrendre = ['jamais','sansrep','refus'].includes(p.statut) && !froid;

      return '<div class="cm-fiche-h">' +
          '<span class="chip ' + st.ton + '"><i class="dot"></i>' + esc(st.nom) + '</span>' +
          '<span class="chip">' + esc(p.type) + '</span>' +
          '<span class="chip">' + p.distance + ' m</span>' +
        '</div>' +
        '<p class="muted" style="font-size:12px">' + esc(p.adresse) + ' · ' + esc(st.def) + '</p>' +
        (froid ? '<div class="note warn">Vous avez laissé cette réservation expirer. Vous pourrez la reprendre à partir du ' +
          esc(dateCourte(p.cooldown)) + ' ; un autre commercial peut la prendre dès maintenant.</div>' : '') +
        '<div class="card cm-meta">' + meta.map(m => '<div><span>' + m[0] + '</span><b>' + m[1] + '</b></div>').join('') + '</div>' +

        '<div class="cm-acts">' +
          '<button class="cta" data-act="prendre"' + (dispoPrendre ? '' : ' disabled') + '>' + ico('hand') + 'Je prends ce prospect</button>' +
          '<button class="cta ghost" data-act="visite">' + ico('camera') + 'Marquer une visite</button>' +
          '<div class="grid2">' +
            '<button class="cta ghost sm" style="width:100%" data-act="rappel">' + ico('clock') + 'Rappel</button>' +
            '<button class="cta ok sm" style="width:100%" data-act="essai"' + (['client','stop'].includes(p.statut) ? ' disabled' : '') + '>' + ico('sparkle') + 'Essai gratuit</button>' +
          '</div>' +
          '<button class="cta danger" data-act="stop"' + (p.statut === 'stop' ? ' disabled' : '') + '>' + ico('x') + 'Ne plus contacter</button>' +
        '</div>' +

        '<div class="cm-preuves" id="cm-preuves">' +
          '<div class="eyebrow">Preuve de visite — trois formes admises</div>' +
          PREUVES.map(pr =>
            '<button class="listrow" data-preuve="' + pr.id + '">' +
              '<span class="ic">' + ico(pr.ic) + '</span>' +
              '<span class="tx"><b>' + esc(pr.nom) + '</b><span>' + esc(pr.det) + '</span></span>' +
              ico('chev','chev') + '</button>').join('') +
          '<div class="cm-shot"><div class="cm-vue" id="cm-vue">' +
            '<svg viewBox="0 0 260 74" fill="none" stroke="currentColor" stroke-width="1.4">' +
              '<path d="M18 62h224M30 62V26h64v36M110 62V20h56v42M182 62V32h50v30"/>' +
              '<path d="M42 40h18M126 34h24M196 44h22"/><path d="M24 26h76l-6-10H30z"/>' +
            '</svg></div><div class="cm-flash" id="cm-flash"></div></div>' +
          '<div class="note warn">L’audio ne sert jamais de preuve de prospection. La géolocalisation est ponctuelle, ' +
            'au moment de la preuve uniquement — aucun suivi continu.</div>' +
        '</div>';
    }

    function ouvrirFiche(id){
      const p = trouver(id);
      if (!p) return;
      api.vibrer();
      api.sheet(p.nom, fiche(p), body => brancherFiche(body, p));
    }

    function brancherFiche(body, p){
      const rafraichir = () => { majBadge(); peindre(); api.sheet(p.nom, fiche(p), b => brancherFiche(b, p)); };

      on(body, '[data-act]', 'click', (ev, b) => {
        const a = b.dataset.act;
        api.vibrer();

        if (a === 'prendre'){
          p.statut = 'reserve';
          p.expire = Date.now() + RESERVATION;
          p.cooldown = null;
          api.toast('Réservé 3 jours. Sans action il retourne au commun : vous ne pourrez plus le reprendre pendant 2 mois, un autre commercial le pourra immédiatement.', 4600);
          rafraichir();

        } else if (a === 'visite'){
          const zone = body.querySelector('#cm-preuves');
          zone.classList.toggle('is-on');
          if (zone.classList.contains('is-on')) apres(() => zone.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block:'nearest' }), 90);

        } else if (a === 'rappel'){
          const d = new Date(Date.now() + JOUR_MS);
          p.statut = 'attente';
          p.rappel = d.toLocaleDateString('fr-FR',{ weekday:'long' }) + ' 10h';
          p.derniere = "aujourd’hui · rappel programmé";
          api.toast('Rappel programmé ' + p.rappel + '. Le prospect passe en attente et reste protégé 30 jours depuis la dernière action.', 4200);
          rafraichir();

        } else if (a === 'essai'){
          p.statut = 'essai';
          p.reste = 'essai j1/14';
          p.derniere = "aujourd’hui · essai gratuit lancé";
          api.toast("Essai gratuit lancé. La commission de 7,50 € par mois ne court qu’à partir du premier mois payant.", 4200);
          api.notif({ titre:'Essai gratuit — ' + p.nom, texte:'14 jours, sans engagement. Le gérant garde son numéro.',
                      couleur:'#7fa8d8', glyph:'sparkle' });
          rafraichir();

        } else if (a === 'stop'){
          if (b.dataset.sur !== '1'){
            b.dataset.sur = '1';
            b.innerHTML = ico('x') + 'Confirmer l’opposition définitive';
            apres(() => { if (b.isConnected && b.dataset.sur === '1'){ b.dataset.sur = ''; b.innerHTML = ico('x') + 'Ne plus contacter'; } }, 4000);
            return;
          }
          p.statut = 'stop';
          p.expire = null;
          p.derniere = "aujourd’hui · opposition enregistrée";
          api.toast('Opposition enregistrée. Ce restaurant ne sera plus contacté par personne, jamais.', 4200);
          rafraichir();
        }
      });

      /* Les trois preuves de visite. */
      on(body, '[data-preuve]', 'click', (ev, b) => {
        const pr = PREUVES.find(x => x.id === b.dataset.preuve);
        api.vibrer();
        const enregistrer = () => {
          p.preuve = pr.id === 'photo' ? 'photo devanture' : (pr.id === 'appel' ? 'appel professionnel' : 'message Resto IA');
          p.derniere = "aujourd’hui · " + (pr.id === 'photo' ? 'porte-à-porte' : pr.id === 'appel' ? 'appel sortant' : 'message');
          if (p.statut === 'jamais') p.statut = 'sansrep';
          api.toast('Visite tracée par ' + (pr.id === 'photo' ? 'photo de devanture' : pr.id === 'appel' ? 'appel professionnel' : 'message Resto IA') +
            '. Protection de 30 jours depuis cette action.', 4200);
          rafraichir();
        };
        if (pr.id === 'photo'){
          const flash = body.querySelector('#cm-flash');
          const vue = body.querySelector('#cm-vue');
          if (flash && !reduit()){
            flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
            if (vue) vue.style.transition = 'transform .5s var(--ease)', vue.style.transform = 'scale(1.06)';
            apres(() => { if (vue) vue.style.transform = 'none'; }, 520);
            apres(enregistrer, 620);
          } else enregistrer();
        } else enregistrer();
      });
    }

    /* ======================= vue 3 — Argumentaire ======================= */
    function vueArgu(){
      return '<div class="sec">' +
          '<div class="sec-head"><h3>Pitch de porte — 20 secondes</h3>' +
            '<span class="chip acc mono" id="cm-tmr">0:20</span></div>' +
          '<div class="card" style="display:grid;gap:10px">' +
            '<div class="cm-chrono"><i id="cm-chrono"></i></div>' +
            PITCH.map((s,i) => '<p class="cm-seg-p" data-seg="' + i + '">' + esc(s.txt) + '</p>').join('') +
            '<button class="cta" data-pitch>' + ico('play') + 'Lancer le minuteur' + '</button>' +
          '</div>' +
          '<p class="muted" style="font-size:11px">Un gérant en service écoute vingt secondes. Le minuteur défile pendant que vous lisez : ' +
            'si vous n’avez pas fini, c’est trop long.</p>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Objections</h3><span class="eyebrow">' + D.COMMERCIAL.argumentaire.length + ' réponses</span></div>' +
          '<div>' + D.COMMERCIAL.argumentaire.map((o,i) =>
            '<div class="cm-acc" data-acc="' + i + '">' +
              '<button>' + ico('chev','chev') + '<span style="flex:1">' + esc(o.q) + '</span></button>' +
              '<div class="cm-acc-b"><p>' + esc(o.r) + '</p></div>' +
            '</div>').join('') + '</div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Faire écouter la démo</h3>' +
            '<button class="cta sm ghost" data-demo>' + ico('play') + 'Jouer' + '</button></div>' +
          '<div class="card" style="display:grid;gap:10px">' +
            '<div class="cm-wv" id="cm-wv">' + Array.from({length:23}, () => '<i></i>').join('') + '</div>' +
            '<div class="cm-fil" id="cm-fil"><p class="muted" style="font-size:11.5px;text-align:center">' +
              'Extrait d’un vrai appel : 4 répliques, 20 secondes. Tendez le téléphone au gérant.</p></div>' +
          '</div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Les trois arguments qui tiennent</h3></div>' +
          '<div class="list stagger">' +
            '<div class="listrow"><span class="ic" style="color:var(--info)">' + ico('phone') + '</span>' +
              '<span class="tx"><b>Le restaurant garde son numéro</b><span>Renvoi conditionnel sur non-réponse chez l’opérateur, réversible en deux minutes.</span></span></div>' +
            '<div class="listrow"><span class="ic" style="color:var(--ok)">' + ico('check') + '</span>' +
              '<span class="tx"><b>Rien ne part en cuisine sans confirmation</b><span>Le client valide par SMS ou à l’oral ; sinon la commande expire.</span></span></div>' +
            '<div class="listrow"><span class="ic" style="color:var(--accent)">' + ico('euro') + '</span>' +
              '<span class="tx"><b>Resto IA n’encaisse jamais les commandes</b><span>Aucune carte stockée, aucun litige géré : on facture seulement l’abonnement.</span></span></div>' +
          '</div>' +
        '</div>';
    }

    function brancherArgu(c){
      let stopPitch = null, stopDemo = null;
      nettoyerOnglet = () => { if (stopPitch) stopPitch(); if (stopDemo) stopDemo(); };

      /* --- minuteur du pitch --- */
      on(c, '[data-pitch]', 'click', (ev, b) => {
        const barre = c.querySelector('#cm-chrono'), tmr = c.querySelector('#cm-tmr');
        const segs = Array.from(c.querySelectorAll('[data-seg]'));
        const fini = () => {
          if (stopPitch){ stopPitch(); stopPitch = null; }
          b.innerHTML = ico('play') + 'Relancer le minuteur';
          segs.forEach(s => s.classList.remove('is-on'));
        };
        if (stopPitch){ fini(); barre.style.width = '0'; tmr.textContent = '0:20'; return; }
        api.vibrer();
        b.innerHTML = ico('stop') + 'Arrêter';
        const t0 = performance.now();
        stopPitch = boucle(t => {
          const s = Math.min(20, (t - t0) / 1000);
          barre.style.width = (s/20*100).toFixed(1) + '%';
          tmr.textContent = '0:' + pad(Math.max(0, Math.ceil(20 - s)));
          const k = Math.min(PITCH.length - 1, Math.floor(s / 5));
          segs.forEach((n,i) => n.classList.toggle('is-on', i === k));
          if (s >= 20){
            api.toast('Vingt secondes. Au-delà, le gérant retourne à sa friteuse.');
            fini();
            return false;
          }
        });
      });

      /* --- accordéon des objections --- */
      on(c, '[data-acc] > button', 'click', (ev, b) => {
        const box = b.parentElement;
        const ouvert = box.classList.contains('is-on');
        c.querySelectorAll('[data-acc]').forEach(x => x.classList.remove('is-on'));
        if (!ouvert) box.classList.add('is-on');
        api.vibrer(6);
      });

      /* --- démo sonore : transcription qui s’écrit + forme d’onde --- */
      on(c, '[data-demo]', 'click', (ev, b) => {
        const fil = c.querySelector('#cm-fil'), barres = Array.from(c.querySelectorAll('#cm-wv i'));
        const calme = () => barres.forEach(i => i.style.height = '3px');
        if (stopDemo){ stopDemo(); stopDemo = null; b.innerHTML = ico('play') + 'Jouer'; calme(); return; }
        api.vibrer();
        b.innerHTML = ico('stop') + 'Arrêter';
        fil.innerHTML = '';
        let k = 0, n = 0, t0 = performance.now(), bulle = null, parle = true;

        const stopOnde = boucle(t => {
          barres.forEach((i,x) => {
            const h = parle ? 4 + Math.abs(Math.sin(t/190 + x*0.55)) * (7 + (x % 5) * 4) * (0.6 + Math.random()*0.5) : 3;
            i.style.height = h.toFixed(0) + 'px';
          });
        });
        const ecrire = boucle(t => {
          if (k >= DEMO.length){
            b.innerHTML = ico('play') + 'Rejouer';
            api.toast('C’est exactement ce que le client entend. Aucun enregistrement n’est gardé au-delà de 30 jours.');
            parle = false; calme(); stopOnde();
            stopDemo = null;
            return false;
          }
          const rep = DEMO[k];
          if (!bulle){
            bulle = el('<p class="cm-bulle ' + rep.qui + '"></p>');
            fil.appendChild(bulle);
            t0 = t; n = 0;
          }
          const cible = reduit() ? rep.txt.length : Math.floor((t - t0) / 24);
          if (cible > n){ n = Math.min(rep.txt.length, cible); bulle.textContent = rep.txt.slice(0, n); }
          if (n >= rep.txt.length && t - t0 > rep.txt.length * 24 + 420){ k++; bulle = null; }
        });
        stopDemo = () => { ecrire(); stopOnde(); parle = false; calme(); };
      });
    }

    /* ========================== vue 4 — Gains ========================== */
    function vueGains(){
      const actifs = clientsActifs();
      const total = actifs * D.COMMISSION;
      const maxMois = Math.max.apply(null, D.COMMERCIAL.moisGains.map(m => m.montant).concat([total]));
      const maxEnt = Math.max.apply(null, D.COMMERCIAL.entonnoir.map(e => e.n));
      const tonVar = { '':'var(--ink-2)', info:'var(--info)', warn:'var(--warn)', acc:'var(--accent)', ok:'var(--ok)', bad:'var(--bad)' };

      const mois = D.COMMERCIAL.moisGains.map((m,i) => {
        const v = (i === D.COMMERCIAL.moisGains.length - 1) ? total : m.montant;
        return '<div class="c' + (i === D.COMMERCIAL.moisGains.length - 1 ? ' on' : '') + '">' +
          '<i data-h="' + Math.max(4, v / maxMois * 76).toFixed(0) + 'px"></i>' +
          '<small>' + esc(m.mois.slice(0,4)) + '</small>' +
          '<small style="color:var(--ink-2)">' + F.euro(v) + '</small></div>';
      }).join('');

      const entonnoir = D.COMMERCIAL.entonnoir.map(e =>
        '<div><div class="l"><span>' + esc(e.etape) + '</span><b>' + e.n + '</b></div>' +
          '<div class="bar"><i data-w="' + (e.n / maxEnt * 100).toFixed(1) + '%" style="--c:' + tonVar[e.ton] + '"></i></div></div>').join('');

      return '<div class="sec">' +
          '<div class="card" style="display:grid;gap:9px">' +
            '<div class="row between"><span class="eyebrow">Commission</span><span class="chip ok">récurrente</span></div>' +
            '<div class="row" style="align-items:baseline;gap:7px">' +
              '<b class="serif" style="font-size:30px">' + F.euro(D.COMMISSION) + '</b>' +
              '<span class="muted" style="font-size:12px">par mois et par client actif</span></div>' +
            '<p class="muted" style="font-size:11.5px">Versée tant que le client reste abonné. Aucun quota, aucun plafond, ' +
              'aucune éviction, aucune confiscation de portefeuille. Les frais de déplacement restent à votre charge.</p>' +
          '</div>' +
          '<div class="grid2">' +
            '<div class="card tight stat"><b id="cm-total">0 €</b><span>ce mois-ci</span></div>' +
            '<div class="card tight stat"><b id="cm-actifs">0</b><span>clients actifs facturés</span></div>' +
          '</div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Quatre derniers mois</h3><span class="eyebrow">cumul non plafonné</span></div>' +
          '<div class="card"><div class="cm-mb">' + mois + '</div></div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Entonnoir de la zone</h3><span class="eyebrow">' + esc(D.COMMERCIAL.zone) + '</span></div>' +
          '<div class="card cm-fn">' + entonnoir + '</div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Projecteur</h3><span class="chip info mono" id="cm-pn">' + actifs + ' clients</span></div>' +
          '<div class="card" style="display:grid;gap:11px">' +
            '<input class="cm-range" id="cm-slider" type="range" min="0" max="300" step="1" value="' + actifs + '" aria-label="Nombre de clients actifs">' +
            '<div class="cm-proj">' +
              '<div><b id="cm-pm">—</b><span>par mois</span></div>' +
              '<div><b id="cm-pa">—</b><span>par an</span></div>' +
            '</div>' +
            '<div class="note warn"><b>Hypothèse à valider, pas une promesse.</b> Le business plan retient 1 500 à 1 800 visites ' +
              'terrain par an (220 jours × 6 à 10 visites) et suppose une conversion de 10 à 15 %, soit 150 à 270 clients par an ' +
              'après montée en compétence. Ce chiffre n’a encore été mesuré nulle part.</div>' +
          '</div>' +
        '</div>' +

        '<div class="sec">' +
          '<div class="sec-head"><h3>Règles du mandat</h3></div>' +
          '<div class="list stagger">' + D.COMMERCIAL.regles.map(r =>
            '<div class="card tight"><b style="font-size:12.5px">' + esc(r.titre) + '</b>' +
              '<p class="muted" style="font-size:11.5px;margin-top:4px">' + esc(r.txt) + '</p></div>').join('') + '</div>' +
          '<div class="note bad"><b>Fin de mandat.</b> Résiliable avec préavis dans les deux sens. La commission est maintenue ' +
            'jusqu’à la fin du cycle d’engagement de 6 mois en cours, puis s’arrête définitivement pour ces clients. ' +
            'Cette distinction entre mission de prospection et commissions acquises doit être validée juridiquement ' +
            'avant tout recrutement.</div>' +
        '</div>';
    }

    function brancherGains(c){
      const actifs = clientsActifs();
      const total = actifs * D.COMMISSION;
      compte(c.querySelector('#cm-total'), total, { duree:900, format:v => F.euro(v) });
      compte(c.querySelector('#cm-actifs'), actifs, { duree:900 });

      const remplir = () => {
        c.querySelectorAll('.cm-mb i').forEach(i => i.style.height = i.dataset.h);
        c.querySelectorAll('.cm-fn .bar i').forEach(i => i.style.width = i.dataset.w);
      };
      if (reduit()) remplir(); else requestAnimationFrame(() => apres(remplir, 60));

      const maj = n => {
        c.querySelector('#cm-pn').textContent = n + ' client' + (n > 1 ? 's' : '');
        c.querySelector('#cm-pm').textContent = F.euro(n * D.COMMISSION);
        c.querySelector('#cm-pa').textContent = F.euroCourt(n * D.COMMISSION * 12);
      };
      maj(actifs);
      on(c, '#cm-slider', 'input', (ev, i) => maj(+i.value));
      on(c, '#cm-slider', 'change', () => api.vibrer(6));
    }

    /* ========================== rendu général ========================== */
    const VUES = { secteur:vueSecteur, prospects:vueProspects, argumentaire:vueArgu, gains:vueGains };
    const BRANCHER = { secteur:brancherSecteur, prospects:brancherProspects, argumentaire:brancherArgu, gains:brancherGains };

    const tabs = () => ([
      { id:'secteur',      label:'Secteur',  icone:'map' },
      { id:'prospects',    label:'Prospects',icone:'users', badge:aTraiter() },
      { id:'argumentaire', label:'Argument', icone:'book' },
      { id:'gains',        label:'Gains',    icone:'euro' }
    ]);

    win.innerHTML =
      topbar({
        titre:'Commercial', sous:D.COMMERCIAL.nom + ' · ' + D.COMMERCIAL.zone,
        actions:'<span class="chip acc mono" data-att>' + aTraiter() + ' à traiter</span>'
      }) +
      '<main class="content"></main>' +
      navbar(tabs(), S.onglet);

    function peindre(){
      if (nettoyerOnglet){ nettoyerOnglet(); nettoyerOnglet = null; }
      const neuf = el('<main class="content"></main>');
      neuf.innerHTML = VUES[S.onglet]();
      win.querySelector('.content').replaceWith(neuf);
      win.querySelector('.navbar').replaceWith(el(navbar(tabs(), S.onglet)));
      BRANCHER[S.onglet](neuf);
      majBadge();
    }

    /* délégation posée une fois sur la fenêtre : elle survit aux repeints */
    on(win, '[data-tab]', 'click', (ev, b) => {
      if (b.dataset.tab === S.onglet) return;
      S.onglet = b.dataset.tab;
      api.vibrer();
      peindre();
    });
    on(win, '[data-p]', 'click', (ev, b) => ouvrirFiche(b.dataset.p));
    on(win, '[data-p]', 'keydown', (ev, b) => {
      if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); ouvrirFiche(b.dataset.p); }
    });

    /* ------------------- horloge des réservations ------------------- */
    chaque(() => {
      const now = Date.now();
      let expire = null;
      S.prospects.forEach(p => {
        if (p.statut === 'reserve' && p.expire && now >= p.expire){
          p.statut = 'jamais'; p.expire = null; p.cooldown = now + COOLDOWN;
          expire = p;
        }
      });
      if (expire){
        api.notif({ titre:'Réservation expirée — ' + expire.nom,
          texte:'Retour au commun. Vous pourrez le reprendre dans 2 mois ; un autre commercial, tout de suite.',
          couleur:'#e9a33d', glyph:'clock', onClic:() => ouvrirFiche(expire.id) });
        peindre();
        return;
      }
      document.querySelectorAll('[data-cd]').forEach(n => {
        const p = trouver(n.dataset.cd);
        n.textContent = (p && p.expire) ? resteTxt(p.expire - now) : '—';
      });
    }, 1000);

    peindre();

    /* ---------------------------- nettoyage ---------------------------- */
    return function demonter(){
      if (nettoyerOnglet){ try { nettoyerOnglet(); } catch(e){} nettoyerOnglet = null; }
      intervalles.forEach(clearInterval); intervalles.clear();
      delais.forEach(clearTimeout);       delais.clear();
      trames.forEach(cancelAnimationFrame); trames.clear();
      api.fermerSheet();
    };
  }
};
