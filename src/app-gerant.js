/* =========================================================================
   Application GÉRANT — « Snack Le Comptoir »
   Cinq onglets : Service, Appels, Menu, Voix, Compte.
   Reprend §2, §3, §4 et §7 du business plan v1.7.
   Vanilla : aucune dépendance, aucun build. Toutes les classes locales
   sont préfixées .gr- ; le reste vient de theme.css.
   ========================================================================= */

import {
  topbar, navbar, sparkline, anneau, compte,
  el, esc, on, horloge, vibrer, reduit
} from './ui.js';
import { ico } from './icons.js';
import {
  RESTO, CHARGES, FORFAITS, VOIX, MENU, COMMANDES, APPEL_DEMO, SMS_RECAP,
  APPELS, JOUR, REGLES, COUT_IA_MIN, fmt, forfaitDe
} from './data.js';

/* ------------------------------------------------------------------ état
   Copies locales : la maquette modifie son état sans toucher data.js.   */
const copie = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const S = {
  onglet:'service',
  charge:RESTO.charge,          // normal | rush | charge | stop
  repriseA:0,                   // horodatage de reprise après un arrêt 30 min
  menu:copie(MENU),
  voix:copie(VOIX),
  consentVoix:false,
  voixPrete:false,
  testValide:false,
  forfait:RESTO.forfait,
  minutes:RESTO.minutesUtilisees,
  vuAppels:false
};

const ONGLETS = [
  { id:'service', label:'Service', icone:'flame' },
  { id:'appels',  label:'Appels',  icone:'phone', badge:2 },
  { id:'menu',    label:'Menu',    icone:'book' },
  { id:'voix',    label:'Voix',    icone:'mic' },
  { id:'compte',  label:'Compte',  icone:'card' }
];

/* ------------------------------------------------- minuteurs de la vue
   Tout ce qui tourne est enregistré ici et annulé au changement d'onglet
   comme à la fermeture de l'application.                                */
let minuteurs = [];
const apres  = (fn, ms) => { const id = setTimeout(fn, ms); minuteurs.push(() => clearTimeout(id)); return id; };
const chaque = (fn, ms) => { const stop = horloge(fn, ms); minuteurs.push(stop); return stop; };
function trame(fn){
  let id = requestAnimationFrame(function boucle(t){
    if (fn(t) !== false) id = requestAnimationFrame(boucle);
  });
  minuteurs.push(() => cancelAnimationFrame(id));
}
function nettoyerVue(){ minuteurs.forEach(f => { try { f(); } catch(e){} }); minuteurs = []; }

/* ------------------------------------------------------------ utilitaires */
const chargeCourante = () => CHARGES[S.charge];
const delaiTexte = () => (S.charge === 'stop' ? 'commandes stoppées' : chargeCourante().delai + ' min');
const tonChip = t => (t === 'ok' ? 'ok' : t === 'warn' ? 'warn' : t === 'bad' ? 'bad' : '');
const mm = sec => String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(Math.floor(sec)%60).padStart(2,'0');
const produits = () => S.menu.flatMap(c => c.items);
const trouver = id => produits().find(p => p.id === id);

/* Phrase d'accueil réellement prononcée, prénom injecté. */
function phraseAccueil(){
  const v = S.voix, cle = 'assistant vocal automatisé';
  return v.accueil.includes(cle)
    ? v.accueil.replace(cle, 'je suis ' + v.prenom + ', ' + cle)
    : v.accueil;
}

/* ========================================================================
   ONGLET 1 — SERVICE
   ===================================================================== */
function vueService(){
  const c = chargeCourante();
  const stop = S.charge === 'stop';
  const dernieres = COMMANDES.filter(o => o.etat !== 'appel').slice(0, 3);

  return `
  <section class="sec stagger">
    <div class="card gr-hero">
      <div class="row between">
        <span class="chip ${stop ? 'bad' : 'ok'}"><i class="dot blink"></i>${stop ? 'Commandes stoppées' : 'En ligne'}</span>
        <span class="eyebrow">${esc(RESTO.tel)}</span>
      </div>
      <div class="gr-delai">
        <b class="num" data-delai>${stop ? '—' : c.delai}</b>
        <span>${stop ? 'l’IA répond encore aux questions' : 'minutes annoncées au client'}</span>
      </div>
      <div class="seg" data-charges>
        ${Object.keys(CHARGES).map(k => `<button data-charge="${k}" aria-pressed="${k === S.charge}">${esc(CHARGES[k].nom)}</button>`).join('')}
      </div>
      <div class="note ${c.ton === 'ok' ? '' : c.ton === 'warn' ? 'warn' : 'bad'} gr-dit">
        <b>Ce que l’IA dit au client.</b> ${esc(c.dit)}
      </div>
      ${stop && S.repriseA ? `<div class="note bad"><b>Reprise dans <span class="mono" data-reprise>30:00</span></b> — l’IA annonce l’heure estimée de reprise.</div>` : ''}
      <button class="cta ${stop ? 'ok' : 'ghost'}" data-stop30>
        ${ico(stop ? 'play' : 'pause')}${stop ? 'Reprendre les commandes' : 'Arrêter les commandes 30 minutes'}
      </button>
      <p class="gr-mini">L’assistant ${esc(S.voix.prenom)} continue de répondre aux horaires, à l’adresse et aux questions même commandes arrêtées.</p>
    </div>

    <div class="card">
      <div class="sec-head"><h3>Chiffres du jour</h3><span class="eyebrow">depuis 11h30</span></div>
      <div class="grid3 gr-stats">
        <div class="stat"><b data-cpt="${JOUR.appelsPris}">0</b><span>appels pris</span></div>
        <div class="stat"><b data-cpt="${JOUR.commandes}">0</b><span>commandes confirmées</span></div>
        <div class="stat"><b data-cpt="${JOUR.expirees}" data-ton="bad">0</b><span>expirées</span></div>
      </div>
      <div class="grid2 gr-stats" style="margin-top:10px">
        <div class="stat"><b data-cpt="${JOUR.ca}" data-euro>0</b><span>CA récupéré par l’IA</span></div>
        <div class="stat"><b data-cpt="${JOUR.panierMoyen}" data-euro>0</b><span>panier moyen</span></div>
      </div>
      <div class="gr-spark">${sparkline(JOUR.courbe, { h:58 })}</div>
      <div class="row between gr-mini"><span>11h30</span><span>pic : 14 appels vers 21h00</span><span>23h00</span></div>
    </div>

    <div class="sec">
      <div class="sec-head"><h3>Dernières commandes</h3>
        <button class="cta sm ghost" data-cuisine>${ico('ticket')}Voir l’écran cuisine</button></div>
      <div class="list">
        ${dernieres.map(o => `
        <div class="listrow">
          <span class="ic" style="color:${o.etat === 'expiree' ? 'var(--bad)' : 'var(--ok)'}">${ico(o.mode === 'livraison' ? 'bike' : 'bag')}</span>
          <span class="tx"><b>#${o.id} · ${esc(o.client || 'client non identifié')}</b>
            <span>${o.heure} · ${o.mode} · ${esc(o.lignes.map(l => l.q + '× ' + l.nom).join(', '))}</span></span>
          <span class="num">${fmt.euro(o.total)}</span>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function monterService(root, api){
  /* compteurs animés */
  root.querySelectorAll('[data-cpt]').forEach(n => {
    const fin = Number(n.dataset.cpt);
    const euro = n.hasAttribute('data-euro');
    if (n.dataset.ton === 'bad') n.style.color = 'var(--bad)';
    compte(n, fin, { duree:900, format:v => euro ? fmt.euroCourt(v) : Math.round(v).toString() });
  });

  /* sélecteur de charge — change réellement le délai annoncé partout */
  on(root, '[data-charge]', 'click', (ev, b) => {
    S.charge = b.dataset.charge;
    if (S.charge !== 'stop') S.repriseA = 0;
    vibrer(8);
    api.toast('Charge « ' + CHARGES[S.charge].nom + ' » — délai annoncé : ' + delaiTexte() + '.');
    rendre(api);
  });

  /* arrêt 30 minutes : l'IA continue de répondre aux questions */
  on(root, '[data-stop30]', 'click', () => {
    if (S.charge === 'stop'){
      S.charge = 'normal'; S.repriseA = 0;
      api.toast('Prise de commande rouverte — délai annoncé : 15 min.');
    } else {
      S.charge = 'stop'; S.repriseA = Date.now() + 30*60*1000;
      api.notif({ titre:'Commandes arrêtées 30 minutes', texte:'L’IA répond encore aux questions et annonce l’heure de reprise.',
                  couleur:'#e0776e', glyph:'pause' });
    }
    vibrer(12);
    rendre(api);
  });

  /* décompte de reprise */
  const rep = root.querySelector('[data-reprise]');
  if (rep) chaque(() => {
    const reste = Math.max(0, Math.round((S.repriseA - Date.now())/1000));
    rep.textContent = mm(reste);
    if (reste === 0){ S.charge = 'normal'; S.repriseA = 0; rendre(api); }
  }, 1000);

  on(root, '[data-cuisine]', 'click', () => { api.toast('Passage sur l’écran cuisine…'); api.basculer('cuisine'); });
}

/* ========================================================================
   ONGLET 2 — APPELS : journal + rejeu d'un appel en direct
   ===================================================================== */
const ISSUES = {
  commande: { nom:'Commande',  chip:'ok',   ic:'check' },
  question: { nom:'Question',  chip:'info', ic:'sms' },
  transfert:{ nom:'Transfert', chip:'warn', ic:'hand' },
  expiree:  { nom:'Expirée',   chip:'bad',  ic:'x' }
};

function vueAppels(){
  return `
  <section class="sec stagger">
    <div class="card gr-live">
      <div class="row between">
        <span class="chip acc">${ico('wave')}Appel en direct</span>
        <span class="mono gr-chrono" data-chrono>00:00</span>
      </div>
      <div class="row between gr-live-head">
        <span class="gr-mini">06 •• •• •• 47 · renvoi sur non-réponse</span>
        <span class="chip warn" data-etat><i class="dot blink"></i>En cours</span>
      </div>

      <div class="gr-wave" data-onde>${Array.from({ length:26 }, (_, i) => `<i style="animation-delay:${(i*47)%620}ms"></i>`).join('')}</div>

      <div class="gr-live-body">
        <div class="gr-flux" data-flux></div>
        <aside class="gr-panier">
          <span class="eyebrow">Panier</span>
          <div data-panier><p class="gr-mini">vide</p></div>
          <div class="gr-total"><span>Total</span><b class="num" data-total>0,00 €</b></div>
        </aside>
      </div>

      <div data-sms></div>

      <div class="row between gr-cout">
        <span class="gr-mini">Coût IA · 0,12 €/min</span>
        <span class="num" data-cout>0,00 €</span>
      </div>
      <div class="grid2">
        <button class="cta sm ghost" style="width:100%" data-rejouer>${ico('refresh')}Rejouer</button>
        <button class="cta sm ghost" style="width:100%" data-transfert>${ico('hand')}Transférer</button>
      </div>
      <p class="gr-mini">${esc(REGLES.confirmation)}</p>
    </div>

    <div class="sec">
      <div class="sec-head"><h3>Journal des appels</h3><span class="eyebrow">${APPELS.length} aujourd’hui</span></div>
      <div class="list">
        ${APPELS.map(a => { const i = ISSUES[a.issue]; return `
        <button class="listrow" data-appel="${a.id}">
          <span class="ic" style="color:var(--${i.chip === 'ok' ? 'ok' : i.chip === 'bad' ? 'bad' : i.chip === 'warn' ? 'warn' : 'info'})">${ico(i.ic)}</span>
          <span class="tx"><b>${a.heure} · ${esc(i.nom)}</b>
            <span>${esc(a.numero)} · ${fmt.duree(a.duree)}${a.cmd ? ' · #' + a.cmd : ''}${a.motif ? ' · ' + esc(a.motif) : ''}${a.q ? ' · ' + esc(a.q) : ''}</span></span>
          ${a.montant ? `<span class="num">${fmt.euro(a.montant)}</span>` : '<span class="gr-mini">—</span>'}
          ${ico('chev', 'chev')}
        </button>`; }).join('')}
      </div>
    </div>
  </section>`;
}

function monterAppels(root, api){
  if (!S.vuAppels){ S.vuAppels = true; api.badge(0); ONGLETS[1].badge = 0; }

  const flux  = root.querySelector('[data-flux]');
  const onde  = root.querySelector('[data-onde]');
  const chron = root.querySelector('[data-chrono]');
  const cout  = root.querySelector('[data-cout]');
  const etat  = root.querySelector('[data-etat]');
  const bacP  = root.querySelector('[data-panier]');
  const totP  = root.querySelector('[data-total]');
  const bacS  = root.querySelector('[data-sms]');
  let jeton = null;                 // identifie la lecture en cours
  let panier = [];

  /* --- rendu du panier qui se construit pendant l'appel --- */
  function majPanier(neuf){
    if (!panier.length){ bacP.innerHTML = '<p class="gr-mini">vide</p>'; totP.textContent = fmt.euro(0); return; }
    bacP.innerHTML = panier.map((l, i) => `
      <div class="gr-pline${neuf && i === panier.length-1 ? ' is-neuf' : ''}">
        <b>${l.q}× ${esc(l.nom)}</b>
        ${(l.options || []).map(o => `<span>${esc(o)}</span>`).join('')}
        ${(l.supplements || []).map(o => `<span class="acc">+ ${esc(o)}</span>`).join('')}
        <em class="num">${fmt.euro(l.prix)}</em>
      </div>`).join('');
    const t = panier.reduce((s, l) => s + l.prix, 0);
    compte(totP, t, { duree:420, format:v => fmt.euro(v) });
  }

  function bulle(e){
    const b = el(`<div class="gr-bulle is-${e.qui}">${e.qui === 'sys' ? ico('sparkle') : ''}<span>${esc(e.txt)}</span></div>`);
    flux.appendChild(b);
    flux.scrollTop = flux.scrollHeight;
  }

  /* --- lecture accélérée : ~150 ms par seconde d'appel simulée --- */
  function jouer(){
    const mien = {}; jeton = mien;
    panier = []; majPanier(false);
    flux.innerHTML = ''; bacS.innerHTML = '';
    etat.className = 'chip warn'; etat.innerHTML = '<i class="dot blink"></i>En cours';
    chron.textContent = '00:00'; cout.textContent = fmt.euro(0);

    const PAS = reduit() ? 45 : 150;          // ms réelles par seconde simulée
    const t0 = performance.now();
    let i = 0, parleJusqu = 0;

    trame(now => {
      if (jeton !== mien) return false;
      const ts = (now - t0)/PAS;
      chron.textContent = fmt.horloge(Math.min(ts, 82));
      cout.textContent = fmt.euro(Math.round(ts/60*COUT_IA_MIN));

      while (i < APPEL_DEMO.length && APPEL_DEMO[i].t <= ts){
        const e = APPEL_DEMO[i];
        bulle(e);
        if (e.qui === 'ia'){
          const suiv = APPEL_DEMO[i+1] ? APPEL_DEMO[i+1].t : e.t + 6;
          parleJusqu = e.t + Math.min(8, Math.max(3, suiv - e.t - 1));
        }
        if (e.panier){ panier.push(Object.assign({}, e.panier)); majPanier(true); }
        if (e.maj){ Object.assign(panier[panier.length-1], e.maj); majPanier(true); }
        if (e.sms){
          bacS.innerHTML = `<div class="gr-sms">${ico('sms')}<pre>${esc(SMS_RECAP)}</pre></div>`;
        }
        if (e.confirme){
          etat.className = 'chip ok'; etat.innerHTML = ico('check') + 'Confirmée';
          vibrer(10);
        }
        if (e.fin){
          etat.className = 'chip ok'; etat.innerHTML = ico('ticket') + '→ envoyée en cuisine';
          api.notif({ titre:'Commande #248 confirmée', texte:'1 tacos M poulet · 10,50 € · retrait 19h48 — envoyée en cuisine.',
                      couleur:'#5fbf8b', glyph:'check', onClic:() => api.basculer('cuisine') });
        }
        i++;
      }

      onde.classList.toggle('is-on', ts < parleJusqu && !reduit());
      if (i >= APPEL_DEMO.length && ts > 82){ onde.classList.remove('is-on'); return false; }
      return true;
    });
  }

  on(root, '[data-rejouer]', 'click', () => { vibrer(8); jouer(); });

  /* cas « allergie évoquée » : transfert, aucune commande enregistrée */
  on(root, '[data-transfert]', 'click', () => {
    jeton = null; onde.classList.remove('is-on'); vibrer(14);
    bulle({ qui:'cli', txt:'Attendez, ma fille est allergique aux fruits à coque, il y a quoi dedans ?' });
    apres(() => bulle({ qui:'ia', txt:'Je préfère vous passer le restaurant pour une allergie. Je vous transfère tout de suite, ne quittez pas.' }), 420);
    apres(() => {
      bulle({ qui:'sys', txt:'Transfert vers le restaurant · aucune commande enregistrée' });
      etat.className = 'chip warn'; etat.innerHTML = ico('hand') + 'Transférée';
      panier = []; majPanier(false);
      bacS.innerHTML = '<div class="note warn">' + esc(REGLES.allergenes) + '</div>';
      api.toast('Transfert humain — rien n’est parti en cuisine.');
    }, 900);
  });

  /* détail d'un appel du journal */
  on(root, '[data-appel]', 'click', (ev, b) => {
    const a = APPELS.find(x => x.id === Number(b.dataset.appel));
    const i = ISSUES[a.issue];
    const cmd = a.cmd ? COMMANDES.find(o => o.id === a.cmd) : null;
    api.sheet('Appel de ' + a.heure, `
      <div class="row between">
        <span class="chip ${i.chip}">${esc(i.nom)}</span>
        <span class="mono">${esc(a.numero)} · ${fmt.duree(a.duree)}</span>
      </div>
      <div class="grid3">
        <div class="stat"><b class="num">${fmt.horloge(a.duree)}</b><span>durée</span></div>
        <div class="stat"><b class="num">${fmt.euro(Math.round(a.duree/60*COUT_IA_MIN))}</b><span>coût IA</span></div>
        <div class="stat"><b class="num">${a.montant ? fmt.euro(a.montant) : '—'}</b><span>panier</span></div>
      </div>
      ${cmd ? `<div class="card flat"><span class="eyebrow">Commande #${cmd.id} · ${esc(cmd.mode)}</span>
        <div class="list" style="margin-top:8px">${cmd.lignes.map(l => `
          <div class="row between"><span>${l.q}× ${esc(l.nom)}<br><span class="gr-mini">${esc(l.options.join(' · ') || '—')}</span></span>
          <span class="num">${fmt.euro(l.prix)}</span></div>`).join('')}</div></div>` : ''}
      ${a.motif ? `<div class="note warn"><b>Motif du transfert : ${esc(a.motif)}.</b> ${esc(REGLES.transfert)}</div>` : ''}
      ${a.q ? `<div class="note info"><b>Question traitée sans commande.</b> ${esc(a.q)} — l’IA répond sur les horaires et l’adresse sans consommer de prise de commande.</div>` : ''}
      ${a.issue === 'expiree' ? `<div class="note bad"><b>Expirée.</b> ${esc(REGLES.confirmation)}</div>` : ''}
      <div class="note">${esc(REGLES.rgpd)}</div>`);
  });

  jouer();
}

/* ========================================================================
   ONGLET 3 — MENU
   ===================================================================== */
function vueMenu(){
  const nDispo = produits().filter(p => p.dispo).length;
  return `
  <section class="sec stagger">
    <div class="card">
      <div class="row between">
        <div><b>Carte publiée</b><div class="gr-mini">${nDispo} produits disponibles sur ${produits().length}</div></div>
        <button class="cta sm" data-import>${ico('sparkle')}Importer une carte</button>
      </div>
      <p class="gr-mini" style="margin-top:8px">Une rupture est immédiate pour les nouveaux appels, sans repasser par Publier.</p>
    </div>

    ${S.menu.map(cat => `
    <div class="sec">
      <div class="sec-head"><h3>${esc(cat.nom)}</h3><span class="eyebrow">${cat.items.length} produits</span></div>
      <div class="list">
        ${cat.items.map(p => `
        <div class="listrow gr-prod${p.dispo ? '' : ' is-rupture'}">
          <button class="tx" data-fiche="${p.id}">
            <b>${esc(p.nom)} ${p.populaire ? '<span class="chip acc" style="margin-left:4px">populaire</span>' : ''}</b>
            <span>${fmt.euro(p.prix)}${p.inclus.length ? ' · ' + esc(p.inclus.join(', ')) : ''}${p.dispo ? '' : ' · en rupture'}</span>
          </button>
          <button class="switch" role="switch" data-dispo="${p.id}" aria-checked="${p.dispo}" aria-label="Disponibilité de ${esc(p.nom)}"></button>
        </div>`).join('')}
      </div>
    </div>`).join('')}

    <div class="note">${esc(REGLES.allergenes)}</div>
  </section>`;
}

function monterMenu(root, api){
  /* interrupteur Disponible / En rupture — effet immédiat */
  on(root, '[data-dispo]', 'click', (ev, b) => {
    const p = trouver(b.dataset.dispo);
    p.dispo = !p.dispo;
    b.setAttribute('aria-checked', String(p.dispo));
    b.closest('.gr-prod').classList.toggle('is-rupture', !p.dispo);
    const sous = b.closest('.gr-prod').querySelector('.tx span');
    sous.textContent = fmt.euro(p.prix) + (p.inclus.length ? ' · ' + p.inclus.join(', ') : '') + (p.dispo ? '' : ' · en rupture');
    vibrer(8);
    api.toast(p.dispo
      ? esc(p.nom) + ' est de nouveau proposé par l’IA.'
      : p.nom + ' : rupture immédiate pour les nouveaux appels, les commandes confirmées ne sont pas touchées.');
  });

  /* fiche produit complète */
  on(root, '[data-fiche]', 'click', (ev, b) => {
    const p = trouver(b.dataset.fiche);
    api.sheet(p.nom, `
      <div class="row between">
        <span class="num" style="font-size:20px">${fmt.euro(p.prix)}</span>
        <span class="chip ${p.dispo ? 'ok' : 'bad'}">${p.dispo ? 'Disponible' : 'En rupture'}</span>
      </div>
      ${p.inclus.length ? `<div class="card flat"><span class="eyebrow">Inclus</span><div>${esc(p.inclus.join(' · '))}</div>
        <p class="gr-mini">La boisson ou les frites peuvent être retirées ou remplacées.</p></div>` : ''}

      <div class="sec"><div class="sec-head"><h3>Choix obligatoires</h3><span class="eyebrow">ordre de l’IA</span></div>
        <div class="list">${p.obligatoires.map((o, i) => `
          <div class="listrow"><span class="ic num">${i+1}</span>
            <span class="tx"><b>${esc(o.nom)} · ${o.min === o.max ? o.min + ' choix' : o.min + ' à ' + o.max + ' choix'}</b>
            <span>${esc(o.choix.join(' · '))}</span></span></div>`).join('') || '<p class="gr-mini">Aucun.</p>'}</div>
        <p class="gr-mini">L’IA pose les questions dans cet ordre.</p></div>

      <div class="sec"><div class="sec-head"><h3>Suppléments</h3></div>
        <div class="list">${p.supplements.map(s => `
          <div class="row between"><span>${esc(s.nom)}</span>
            <span class="row" style="gap:7px"><span class="num">${s.prix ? '+' + fmt.euro(s.prix) : 'offert'}</span>
            <span class="chip ${s.dispo ? 'ok' : 'bad'}">${s.dispo ? 'dispo' : 'rupture'}</span></span></div>`).join('') || '<p class="gr-mini">Aucun.</p>'}</div></div>

      ${p.precisions.length ? `<div class="sec"><div class="sec-head"><h3>Précisions</h3></div>
        <div class="seg">${p.precisions.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
        <div class="note warn">${esc(REGLES.allergenes)}</div></div>` : ''}

      ${p.demandes.length ? `<div class="sec"><div class="sec-head"><h3>Demandes admises</h3></div>
        <div class="seg">${p.demandes.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>` : ''}

      <button class="cta ${p.dispo ? 'danger' : 'ok'}" data-bascule="${p.id}">
        ${p.dispo ? 'Marquer en rupture maintenant' : 'Remettre en vente'}
      </button>`, corps => {
      on(corps, '[data-bascule]', 'click', () => {
        p.dispo = !p.dispo;
        api.fermerSheet();
        api.toast(p.dispo ? p.nom + ' est remis en vente.' : p.nom + ' : rupture immédiate pour les nouveaux appels, les commandes confirmées ne sont pas touchées.');
        rendre(api);
      });
    });
  });

  /* import de carte : photo / PDF / site / saisie, puis brouillon IA */
  on(root, '[data-import]', 'click', () => {
    const sources = [
      { id:'photo', nom:'Photo de la carte', ic:'camera', d:'L’IA lit l’image et reconstruit les catégories.' },
      { id:'pdf',   nom:'PDF',               ic:'doc',    d:'Découpage automatique par page et par rubrique.' },
      { id:'site',  nom:'Site du restaurant',ic:'cloud',  d:'Lecture de la page menu et des prix affichés.' },
      { id:'main',  nom:'Saisie à la main',  ic:'edit',   d:'Vous dictez, l’IA met en forme.' }
    ];
    api.sheet('Importer une carte', `
      <div class="list" data-sources>
        ${sources.map(s => `<button class="listrow" data-src="${s.id}"><span class="ic">${ico(s.ic)}</span>
          <span class="tx"><b>${esc(s.nom)}</b><span>${esc(s.d)}</span></span>${ico('chev','chev')}</button>`).join('')}
      </div>
      <div class="gr-import" data-import-zone hidden>
        <span class="eyebrow" data-etape>Lecture…</span>
        <div class="bar"><i data-prog style="width:0%"></i></div>
        <div class="gr-brouillon" data-brouillon></div>
      </div>
      <p class="gr-mini">L’IA crée un brouillon de catégories, produits, formules, tailles, boissons, suppléments et prix. Rien n’est publié sans votre validation.</p>`,
    corps => {
      on(corps, '[data-src]', 'click', (ev2, b2) => {
        const src = sources.find(s => s.id === b2.dataset.src);
        corps.querySelector('[data-sources]').hidden = true;
        const zone = corps.querySelector('[data-import-zone]');
        zone.hidden = false;
        const prog = zone.querySelector('[data-prog]');
        const etape = zone.querySelector('[data-etape]');
        const brouillon = zone.querySelector('[data-brouillon]');
        const etapes = [
          [18, src.nom + ' — lecture en cours'],
          [42, 'Détection des catégories'],
          [64, 'Extraction des prix et des tailles'],
          [86, 'Reconstruction des formules et suppléments'],
          [100, 'Brouillon prêt']
        ];
        const pas = reduit() ? 160 : 620;
        etapes.forEach((e, i) => apres(() => {
          prog.style.width = e[0] + '%';
          etape.textContent = e[1];
          if (e[0] === 100){
            brouillon.innerHTML = `
              <div class="note"><b>Brouillon IA — à valider.</b> 4 catégories, 9 produits, 12 suppléments détectés. Deux prix restent à confirmer.</div>
              <div class="list">
                ${S.menu.map(c => `<div class="row between"><span>${esc(c.nom)}</span><span class="chip acc">${c.items.length} produits</span></div>`).join('')}
                <div class="row between"><span>Pizza merguez</span><span class="chip warn">prix illisible</span></div>
              </div>
              <div class="grid2" style="margin-top:10px">
                <button class="cta sm ghost" style="width:100%" data-corriger>Corriger 2 prix</button>
                <button class="cta sm" style="width:100%" data-publier>Publier</button>
              </div>`;
          }
        }, pas*(i+1)));
      });
      on(corps, '[data-corriger]', 'click', () => api.toast('Les deux prix douteux sont signalés en rouge dans la carte, l’IA ne les propose pas tant qu’ils ne sont pas confirmés.'));
      on(corps, '[data-publier]', 'click', () => { api.fermerSheet(); api.toast('Carte publiée — l’IA travaille sur la nouvelle version dès le prochain appel.'); vibrer(10); });
    });
  });
}

/* ========================================================================
   ONGLET 4 — VOIX
   ===================================================================== */
const TONS = { chaleureux:'Chaleureux', dynamique:'Dynamique', professionnel:'Professionnel', quartier:'De quartier' };
const VITESSES = { lente:'Lente', normale:'Normale', rapide:'Rapide' };
const LANGUES = ['Français','Arabe','Anglais','Espagnol','Turc'];

function vueVoix(){
  const v = S.voix;
  return `
  <section class="sec stagger">
    <div class="card gr-apercu" data-apercu>
      <span class="eyebrow">Aperçu de la phrase d’accueil</span>
      <p class="serif gr-phrase" data-phrase>« ${esc(phraseAccueil())} »</p>
      <div class="seg">
        <span class="chip acc">${esc(v.prenom)}</span>
        <span class="chip">${esc(TONS[v.ton])}</span>
        <span class="chip">${esc(VITESSES[v.vitesse])}</span>
        ${v.langues.map(l => `<span class="chip info">${esc(l)}</span>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="field"><span class="lbl">Prénom de l’assistant</span>
        <input type="text" value="${esc(v.prenom)}" data-prenom maxlength="14"></div>
      <div class="field" style="margin-top:11px"><span class="lbl">Ton</span>
        <div class="seg">${Object.keys(TONS).map(k => `<button data-ton="${k}" aria-pressed="${k === v.ton}">${esc(TONS[k])}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:11px"><span class="lbl">Vitesse</span>
        <div class="seg">${Object.keys(VITESSES).map(k => `<button data-vitesse="${k}" aria-pressed="${k === v.vitesse}">${esc(VITESSES[k])}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:11px"><span class="lbl">Langues actives</span>
        <div class="seg">${LANGUES.map(l => `<button data-langue="${esc(l)}" aria-pressed="${v.langues.includes(l)}">${esc(l)}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:11px"><span class="lbl">Phrase d’accueil</span>
        <textarea rows="3" data-accueil>${esc(v.accueil)}</textarea></div>
      <p class="gr-mini">${esc(REGLES.rgpd)}</p>
    </div>

    <div class="sec">
      <div class="sec-head"><h3>Prononciations</h3>
        <button class="cta sm ghost" data-prono>${ico('plus')}Ajouter</button></div>
      <div class="list">
        ${v.prononciations.map(p => `<div class="row between"><span>${esc(p.mot)}</span>
          <span class="mono">« ${esc(p.dit)} »</span></div>`).join('')}
      </div>
    </div>

    <div class="card gr-signature">
      <div class="row between">
        <div><b>Voix signature</b><div class="gr-mini">L’IA génère une voix proche de votre timbre.</div></div>
        <span class="chip acc">${ico('lock')}premium</span>
      </div>
      <div class="gr-lecture" data-lecture hidden>
        <div class="bar"><i data-lect style="width:0%"></i></div>
        <p class="gr-mini" data-lecttxt>Lecture du texte guidé…</p>
      </div>
      <button class="row between gr-consent" data-consent aria-pressed="${S.consentVoix}" style="width:100%;text-align:left">
        <span class="gr-mini" style="flex:1">Je confirme posséder cette voix et en autoriser l’usage.</span>
        <span class="switch" role="switch" aria-checked="${S.consentVoix}"></span>
      </button>
      <button class="cta ghost" data-lire ${S.consentVoix ? '' : 'disabled'}>${ico('mic')}Lire le texte guidé (1 min)</button>
      ${S.voixPrete ? '<div class="note ok"><b>Voix signature prête.</b> Elle attend un appel test avant d’être activée.</div>' : ''}
      <p class="gr-mini">Même avec une voix signature, l’assistant annonce au client qu’il est automatisé.</p>
    </div>

    <div class="card">
      <div class="gr-wave gr-wave-sm" data-onde2>${Array.from({ length:22 }, (_, i) => `<i style="animation-delay:${(i*53)%560}ms"></i>`).join('')}</div>
      <p class="serif gr-defile" data-defile>&nbsp;</p>
      <button class="cta" data-test>${ico('phoneIn')}Appel test sur mon vrai menu</button>
      <p class="gr-mini">Un appel test sur le vrai menu est obligatoire avant activation. Un changement de voix ne s’applique jamais au milieu d’un appel : il prend effet au prochain appel entrant.</p>
      ${S.testValide ? '<div class="note ok"><b>Appel test validé.</b> La voix peut être activée.</div>' : ''}
      <button class="cta ok" data-activer ${S.testValide ? '' : 'disabled'}>${ico('check')}Activer cette voix</button>
    </div>
  </section>`;
}

function monterVoix(root, api){
  const phrase = root.querySelector('[data-phrase]');
  const apercu = root.querySelector('[data-apercu]');

  function rafraichir(){
    phrase.textContent = '« ' + phraseAccueil() + ' »';
    apercu.classList.remove('is-flash');
    void apercu.offsetWidth;                    // relance l'animation
    apercu.classList.add('is-flash');
  }

  root.querySelector('[data-prenom]').addEventListener('input', ev => {
    S.voix.prenom = ev.target.value.trim() || 'Sofiane';
    rafraichir();
  });
  root.querySelector('[data-accueil]').addEventListener('input', ev => {
    S.voix.accueil = ev.target.value;
    rafraichir();
  });

  on(root, '[data-ton]', 'click', (ev, b) => {
    S.voix.ton = b.dataset.ton;
    root.querySelectorAll('[data-ton]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    rafraichir(); api.toast('Ton « ' + TONS[S.voix.ton] +' » — appliqué au prochain appel entrant.');
  });
  on(root, '[data-vitesse]', 'click', (ev, b) => {
    S.voix.vitesse = b.dataset.vitesse;
    root.querySelectorAll('[data-vitesse]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    rafraichir();
  });
  on(root, '[data-langue]', 'click', (ev, b) => {
    const l = b.dataset.langue, i = S.voix.langues.indexOf(l);
    if (i >= 0 && S.voix.langues.length > 1) S.voix.langues.splice(i, 1);
    else if (i < 0) S.voix.langues.push(l);
    else return api.toast('Au moins une langue doit rester active.');
    rendre(api);
  });

  /* ajout d'une prononciation */
  on(root, '[data-prono]', 'click', () => {
    api.sheet('Nouvelle prononciation', `
      <div class="field"><span class="lbl">Mot écrit</span><input type="text" data-mot placeholder="Bicky"></div>
      <div class="field"><span class="lbl">Ce que l’IA doit dire</span><input type="text" data-dit placeholder="bi-ki"></div>
      <button class="cta" data-ok>Enregistrer</button>`, corps => {
      on(corps, '[data-ok]', 'click', () => {
        const mot = corps.querySelector('[data-mot]').value.trim();
        const dit = corps.querySelector('[data-dit]').value.trim();
        if (!mot || !dit) return api.toast('Renseignez le mot et sa prononciation.');
        S.voix.prononciations.push({ mot, dit });
        api.fermerSheet(); api.toast('« ' + mot + ' » sera prononcé « ' + dit + ' ».');
        rendre(api);
      });
    });
  });

  /* consentement obligatoire de la voix signature */
  on(root, '[data-consent]', 'click', () => {
    S.consentVoix = !S.consentVoix;
    if (!S.consentVoix) S.voixPrete = false;
    vibrer(6); rendre(api);
  });

  on(root, '[data-lire]', 'click', (ev, b) => {
    if (!S.consentVoix) return api.toast('Le consentement est obligatoire avant l’enregistrement.');
    const zone = root.querySelector('[data-lecture]');
    const barre = zone.querySelector('[data-lect]');
    const txt = zone.querySelector('[data-lecttxt]');
    zone.hidden = false; b.disabled = true;
    const lignes = [
      'Bonsoir, vous êtes bien au Comptoir, je vous écoute.',
      'Nous sommes ouverts du lundi au dimanche, midi et soir.',
      'Le tacos M vient avec des frites et une boisson.',
      'Je vous envoie le récapitulatif par SMS tout de suite.'
    ];
    const pas = reduit() ? 220 : 1500;
    lignes.forEach((l, i) => apres(() => {
      barre.style.width = Math.round((i+1)/lignes.length*100) + '%';
      txt.textContent = '« ' + l + ' »';
    }, pas*(i+1)));
    apres(() => { S.voixPrete = true; api.toast('Voix signature générée — un appel test reste obligatoire.'); rendre(api); }, pas*(lignes.length+1));
  });

  /* appel test : onde + phrase d'accueil qui défile */
  on(root, '[data-test]', 'click', (ev, b) => {
    const onde = root.querySelector('[data-onde2]');
    const cible = root.querySelector('[data-defile]');
    const texte = phraseAccueil();
    const rythme = S.voix.vitesse === 'lente' ? 52 : S.voix.vitesse === 'rapide' ? 20 : 34;
    b.disabled = true; onde.classList.add('is-on');
    cible.textContent = '';
    if (reduit()){
      cible.textContent = '« ' + texte + ' »';
      apres(() => { onde.classList.remove('is-on'); S.testValide = true; rendre(api); }, 700);
      return;
    }
    let i = 0;
    const stop = chaque(() => {
      i++;
      cible.textContent = '« ' + texte.slice(0, i) + (i < texte.length ? ' ▍' : ' »');
      if (i >= texte.length){
        stop(); onde.classList.remove('is-on');
        S.testValide = true; vibrer(10);
        api.toast('Appel test réussi sur le vrai menu — la voix peut être activée.');
        apres(() => rendre(api), 900);
      }
    }, rythme);
  });

  on(root, '[data-activer]', 'click', () => {
    if (!S.testValide) return;
    api.notif({ titre:'Voix activée', texte:S.voix.prenom + ' · ' + TONS[S.voix.ton] + ' · ' + VITESSES[S.voix.vitesse] + ' — effective au prochain appel.',
                couleur:'#ddb84a', glyph:'mic' });
    api.toast('Le changement ne s’applique jamais au milieu d’un appel.');
  });
}

/* ========================================================================
   ONGLET 5 — COMPTE : horaires, livraison, abonnement, règles
   ===================================================================== */
function vueCompte(){
  const f = forfaitDe(S.forfait);
  const ratio = f.minutes ? S.minutes / f.minutes : 0;
  const liv = RESTO.livraison;

  return `
  <section class="sec stagger">
    <div class="card">
      <div class="sec-head"><h3>Horaires</h3><span class="eyebrow">3 calendriers distincts</span></div>
      <div class="list">
        ${RESTO.horaires.map(h => `<div class="row between"><span>${esc(h.jours)}</span>
          <span class="mono">${esc(h.creneaux)}</span></div>`).join('')}
      </div>
      <div class="grid3 gr-cal">
        <div class="stat"><b class="num">11h30</b><span>ouverture physique</span></div>
        <div class="stat"><b class="num">−${RESTO.derniereCommande} min</b><span>dernière commande par téléphone</span></div>
        <div class="stat"><b class="num">−45 min</b><span>dernière livraison</span></div>
      </div>
      <p class="gr-mini">L’ouverture physique, la prise de commande par téléphone et la livraison sont réglées séparément. Passé la dernière commande, l’IA annonce la fermeture et propose le service suivant.</p>
      <div class="list" style="margin-top:9px">
        ${RESTO.exceptions.map(x => `<div class="row between"><span class="chip warn">${esc(x.date)}</span>
          <span class="gr-mini">${esc(x.regle)}</span></div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="sec-head"><h3>Zone de livraison</h3><span class="chip info">${liv.delai} min annoncées</span></div>
      <div class="grid2">
        <div class="stat"><b class="num">${liv.rayonKm} km</b><span>rayon par la route</span></div>
        <div class="stat"><b class="num">${fmt.euro(liv.minimum)}</b><span>minimum de commande</span></div>
        <div class="stat"><b class="num">${fmt.euro(liv.frais)}</b><span>frais de livraison</span></div>
        <div class="stat"><b style="font-size:14px">${esc(liv.paiement)}</b><span>paiement</span></div>
      </div>
      <div class="note info"><b>Hors zone, l’IA propose le retrait</b> — elle calcule la distance par la route, vérifie le minimum, les frais et le délai avant d’enregistrer.</div>
      <div class="note">${esc(REGLES.paiement)}</div>
    </div>

    <div class="card gr-abo">
      <div class="row between">
        <div class="gr-jauge">${anneau(ratio, { taille:78, couleur:ratio > .8 ? 'var(--warn)' : 'var(--accent)' })}
          <span class="num" data-jauge-txt>${Math.round(ratio*100)}%</span></div>
        <div style="flex:1">
          <b>Forfait ${esc(f.nom)} — ${fmt.euroCourt(f.prix)}/mois</b>
          <div class="gr-mini"><span class="num" data-min>${S.minutes}</span> / ${f.minutes} minutes ce mois-ci</div>
          <div class="gr-mini">Dépassement ${(f.depassement/100).toFixed(2).replace('.', ',')} €/min · coût IA 0,12 €/min</div>
        </div>
      </div>
      <div class="gr-seuil"><div class="bar"><i data-barre style="width:${Math.min(100, ratio*100)}%"></i></div><span class="gr-tick"></span></div>
      <div class="row between gr-mini"><span>0</span><span>alerte 80 %</span><span>${f.minutes} min</span></div>
      <div class="note warn"><b>Alerte automatique à 80 %.</b> Le service n’est jamais coupé : les minutes en plus sont facturées au tarif de dépassement.</div>
      <button class="cta sm ghost" data-sim80 style="width:100%">${ico('bell')}Simuler le passage à 80 %</button>
    </div>

    <div class="sec">
      <div class="sec-head"><h3>Changer de forfait</h3><span class="eyebrow">§7</span></div>
      <div class="list">
        ${FORFAITS.map(x => `
        <button class="listrow" data-forfait="${x.id}">
          <span class="ic">${ico(x.id === S.forfait ? 'check' : 'card')}</span>
          <span class="tx"><b>${esc(x.nom)} · ${x.prix ? fmt.euroCourt(x.prix) + '/mois' : 'sans abonnement'}</b>
            <span>${x.minutes ? x.minutes + ' min incluses' : 'à la minute'} · dépassement ${(x.depassement/100).toFixed(2).replace('.', ',')} € · ${esc(x.note)}</span></span>
          ${x.id === S.forfait ? '<span class="chip acc">actuel</span>' : ico('chev','chev')}
        </button>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="sec-head"><h3>Comment le forfait est choisi</h3></div>
      <div class="gr-frise">
        <div><span class="num">1</span><b>Essai gratuit</b><em>aucun engagement, l’IA décroche déjà</em></div>
        <div><span class="num">2</span><b>Le vrai volume décide</b><em>les minutes réellement consommées donnent le forfait</em></div>
        <div><span class="num">3</span><b>Engagement 6 mois</b><em>prélèvement SEPA, facturation à la seconde</em></div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-head"><h3>Règles du service</h3></div>
      <div class="note info">${esc(REGLES.rgpd)}</div>
      <div class="note">${esc(REGLES.confirmation)}</div>
      <div class="note warn">${esc(REGLES.modification)}</div>
      <div class="note bad">${esc(REGLES.paiement)}</div>
      <div class="card flat"><span class="eyebrow">Renvoi d’appel</span>
        <p class="gr-mini">${esc(REGLES.renvoi)}</p></div>
    </div>
  </section>`;
}

function monterCompte(root, api){
  const f = forfaitDe(S.forfait);

  /* animation d'entrée de l'anneau et du compteur de minutes */
  const cercle = root.querySelector('.gr-jauge svg circle:last-of-type');
  const txt = root.querySelector('[data-jauge-txt]');
  const minNode = root.querySelector('[data-min]');
  if (cercle && !reduit()){
    const dash = Number(cercle.getAttribute('stroke-dasharray'));
    const fin = cercle.getAttribute('stroke-dashoffset');
    cercle.setAttribute('stroke-dashoffset', dash);
    apres(() => { cercle.style.transition = 'stroke-dashoffset .9s var(--ease)'; cercle.setAttribute('stroke-dashoffset', fin); }, 40);
  }
  compte(minNode, S.minutes, { duree:800 });

  /* alerte à 80 % — jamais de coupure de service */
  on(root, '[data-sim80]', 'click', () => {
    const cible = Math.round(f.minutes * .8);
    const barre = root.querySelector('[data-barre]');
    barre.style.width = '80%';
    if (cercle){
      const dash = Number(cercle.getAttribute('stroke-dasharray'));
      cercle.style.transition = 'stroke-dashoffset .9s var(--ease), stroke .4s ease';
      cercle.setAttribute('stroke-dashoffset', (dash*0.2).toFixed(1));
      cercle.setAttribute('stroke', 'var(--warn)');
    }
    compte(txt, 80, { duree:900, format:v => Math.round(v) + '%' });
    compte(minNode, cible, { duree:900 });
    S.minutes = cible;
    vibrer(12);
    api.notif({ titre:'80 % de vos minutes consommées', texte:cible + ' min sur ' + f.minutes + ' — le service continue, le dépassement est facturé ' + (f.depassement/100).toFixed(2).replace('.', ',') + ' €/min.',
                couleur:'#e9a33d', glyph:'bell' });
  });

  /* changement de forfait */
  on(root, '[data-forfait]', 'click', (ev, b) => {
    const x = FORFAITS.find(y => y.id === b.dataset.forfait);
    if (x.id === S.forfait) return api.toast('C’est déjà votre forfait.');
    api.sheet('Passer au forfait ' + x.nom, `
      <div class="grid2">
        <div class="stat"><b class="num">${x.prix ? fmt.euroCourt(x.prix) : '0 €'}</b><span>par mois</span></div>
        <div class="stat"><b class="num">${x.minutes || '—'}</b><span>minutes incluses</span></div>
        <div class="stat"><b class="num">${(x.depassement/100).toFixed(2).replace('.', ',')} €</b><span>par minute au-delà</span></div>
        <div class="stat"><b style="font-size:14px">${esc(x.note)}</b><span>coût et commission</span></div>
      </div>
      <div class="note"><b>L’essai gratuit mesure d’abord le vrai volume.</b> Le forfait est recommandé à partir des minutes réellement consommées, puis l’engagement court sur 6 mois.</div>
      <div class="note info">Changement effectif au prochain cycle. Le service n’est jamais interrompu pendant la bascule.</div>
      <button class="cta" data-confirmer>Confirmer le passage au forfait ${esc(x.nom)}</button>`, corps => {
      on(corps, '[data-confirmer]', 'click', () => {
        S.forfait = x.id;
        S.minutes = Math.min(S.minutes, x.minutes || S.minutes);
        api.fermerSheet(); vibrer(10);
        api.toast('Forfait ' + x.nom + ' enregistré — effectif au prochain cycle.');
        rendre(api);
      });
    });
  });
}

/* ========================================================================
   ROUTAGE
   ===================================================================== */
const VUES = {
  service:{ html:vueService, monter:monterService },
  appels: { html:vueAppels,  monter:monterAppels },
  menu:   { html:vueMenu,    monter:monterMenu },
  voix:   { html:vueVoix,    monter:monterVoix },
  compte: { html:vueCompte,  monter:monterCompte }
};

const SOUS = {
  service:'Service en cours',
  appels:'Appels et transcription',
  menu:'Carte et disponibilités',
  voix:'Identité de l’assistant',
  compte:'Horaires et abonnement'
};

let fenetre = null;

/** Re-rend le contenu de l'onglet actif (élément recréé pour rejouer contentFade). */
function rendre(api){
  if (!fenetre) return;
  nettoyerVue();
  api.fermerSheet();

  const vue = VUES[S.onglet];
  const neuf = el('<main class="content"></main>');
  neuf.innerHTML = vue.html();
  fenetre.querySelector('.content').replaceWith(neuf);

  const barre = el(navbar(ONGLETS, S.onglet));
  fenetre.querySelector('.navbar').replaceWith(barre);

  const sous = fenetre.querySelector('.topbar .sub');
  if (sous) sous.textContent = SOUS[S.onglet];

  vue.monter(neuf, api);
}

/* ========================================================================
   MODULE
   ===================================================================== */
export default {
  id:'gerant',
  nom:'Gérant',
  sousTitre:'Snack Le Comptoir',
  accent:'#ddb84a',
  fond:'linear-gradient(150deg,#f0ce72,#c79a2a)',
  encre:'#241c05',
  icone:'mic',
  badge:2,

  css:`
  .gr-mini{font-size:11px;color:var(--ink-3);line-height:1.45}
  .gr-hero{display:grid;gap:11px}
  .gr-delai{display:flex;align-items:baseline;gap:9px}
  .gr-delai b{font-family:var(--f-display);font-size:42px;line-height:1;color:var(--accent-bright)}
  .gr-delai span{font-size:11.5px;color:var(--ink-3);max-width:15ch;line-height:1.3}
  .gr-dit{transition:border-color .3s ease,background .3s ease}
  .gr-stats .stat b{transition:color .3s ease}
  .gr-spark{margin-top:11px;border-top:1px solid var(--rule);padding-top:9px}

  /* ---------------------------- appel en direct ---------------------------- */
  .gr-live{display:grid;gap:10px}
  .gr-live-head{margin-top:-4px}
  .gr-chrono{font-size:16px;color:var(--accent-bright);letter-spacing:.04em}
  .gr-wave{display:flex;align-items:center;justify-content:space-between;gap:2px;height:34px;
    border-radius:10px;background:var(--surface);border:1px solid var(--rule);padding:0 9px}
  .gr-wave i{flex:1;height:3px;border-radius:2px;background:var(--ink-3);opacity:.5;
    transform-origin:center;transition:opacity .3s ease}
  .gr-wave.is-on i{opacity:1;background:var(--accent);animation:grOnde .62s var(--ease) infinite alternate}
  .gr-wave-sm{height:26px}
  @keyframes grOnde{from{transform:scaleY(1)}to{transform:scaleY(7)}}

  .gr-live-body{display:grid;grid-template-columns:minmax(0,1fr) 116px;gap:9px;align-items:start}
  .gr-flux{max-height:214px;overflow-y:auto;display:grid;gap:7px;padding-right:3px;
    scrollbar-width:thin;scrollbar-color:var(--rule-strong) transparent}
  .gr-flux::-webkit-scrollbar{width:4px}
  .gr-flux::-webkit-scrollbar-thumb{background:var(--rule-strong);border-radius:2px}
  .gr-bulle{font-size:11.5px;line-height:1.42;padding:7px 10px;border-radius:12px;
    animation:grBulle .3s var(--ease) both;max-width:96%}
  .gr-bulle.is-ia{background:var(--accent-soft);border:1px solid var(--rule-strong);color:var(--ink);
    border-bottom-left-radius:4px;justify-self:start}
  .gr-bulle.is-cli{background:var(--surface-3);border:1px solid var(--rule);color:var(--ink-2);
    border-bottom-right-radius:4px;justify-self:end;text-align:right}
  .gr-bulle.is-sys{display:flex;align-items:center;gap:6px;justify-self:center;max-width:100%;
    background:transparent;border:1px dashed var(--rule);color:var(--ink-3);font-family:var(--f-mono);
    font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;padding:5px 9px}
  .gr-bulle.is-sys svg{width:12px;height:12px;color:var(--accent);flex:none}
  @keyframes grBulle{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}

  .gr-panier{border:1px solid var(--rule);border-radius:12px;background:var(--surface);
    padding:8px 9px;display:grid;gap:6px;position:sticky;top:0}
  .gr-pline{display:grid;gap:1px;padding-bottom:5px;border-bottom:1px solid var(--rule)}
  .gr-pline b{font-size:10.5px;line-height:1.25}
  .gr-pline span{font-size:9.5px;color:var(--ink-3);line-height:1.3}
  .gr-pline span.acc{color:var(--accent)}
  .gr-pline em{font-family:var(--f-mono);font-style:normal;font-size:10px;color:var(--ink-2)}
  .gr-pline.is-neuf{animation:grPop .42s var(--ease) both}
  @keyframes grPop{from{opacity:0;transform:translateX(9px)}to{opacity:1;transform:none}}
  .gr-total{display:flex;justify-content:space-between;align-items:baseline;font-size:10px;color:var(--ink-3)}
  .gr-total b{font-size:12.5px;color:var(--accent-bright)}

  .gr-sms{display:flex;gap:9px;padding:9px 11px;border-radius:12px;border:1px solid var(--rule);
    background:var(--surface-2);animation:grBulle .36s var(--ease) both}
  .gr-sms svg{width:16px;height:16px;color:var(--info);flex:none;margin-top:2px}
  .gr-sms pre{margin:0;font-family:var(--f-mono);font-size:10px;line-height:1.5;color:var(--ink-2);
    white-space:pre-wrap;word-break:break-word}
  .gr-cout{border-top:1px solid var(--rule);padding-top:8px}
  .gr-cout .num{color:var(--accent)}

  /* --------------------------------- menu --------------------------------- */
  .gr-prod{transition:opacity .25s ease,border-color .25s ease}
  .gr-prod.is-rupture{opacity:.5;border-style:dashed}
  .gr-prod .tx{text-align:left}
  .gr-prod .tx b .chip{vertical-align:middle}
  .gr-import{display:grid;gap:10px}
  .gr-brouillon{display:grid;gap:9px}

  /* --------------------------------- voix --------------------------------- */
  .gr-apercu{border-color:var(--rule-strong)}
  .gr-apercu.is-flash{animation:grFlash .6s var(--ease)}
  @keyframes grFlash{0%{background:var(--accent-soft)}100%{background:none}}
  .gr-phrase{font-size:15px;line-height:1.45;margin:7px 0 10px;color:var(--ink)}
  .gr-signature{display:grid;gap:10px}
  .gr-consent{gap:11px}
  .gr-lecture{display:grid;gap:7px}
  .gr-defile{min-height:44px;font-size:14px;line-height:1.4;color:var(--accent-bright);margin:9px 0 11px}
  .gr-signature .cta[disabled],.card .cta[disabled]{opacity:.42;pointer-events:none}

  /* -------------------------------- compte -------------------------------- */
  .gr-cal{margin-top:11px;border-top:1px solid var(--rule);padding-top:10px}
  .gr-cal .stat b{font-size:15px}
  .gr-abo{display:grid;gap:10px}
  .gr-jauge{position:relative;display:grid;place-items:center;flex:none}
  .gr-jauge span{position:absolute;font-size:13px;color:var(--ink)}
  .gr-seuil{position:relative}
  .gr-tick{position:absolute;left:80%;top:-3px;width:1px;height:12px;background:var(--warn)}
  .gr-frise{display:grid;gap:10px;margin-top:8px}
  .gr-frise > div{display:grid;grid-template-columns:24px 1fr;gap:3px 10px;align-items:baseline}
  .gr-frise span{grid-row:span 2;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;
    border:1px solid var(--rule-strong);color:var(--accent);font-size:11px}
  .gr-frise b{font-size:13px}
  .gr-frise em{font-style:normal;font-size:11px;color:var(--ink-3)}
  `,

  monter(win, api){
    fenetre = win;
    S.onglet = 'service';

    win.innerHTML =
      topbar({ titre:'Resto IA · Gérant', sous:SOUS.service,
               actions:'<span class="chip ok"><i class="dot blink"></i>IA active</span>' }) +
      '<main class="content"></main>' +
      navbar(ONGLETS, S.onglet);

    /* navigation entre onglets */
    win.addEventListener('click', ev => {
      const b = ev.target.closest('[data-tab]');
      if (!b || b.dataset.tab === S.onglet) return;
      S.onglet = b.dataset.tab;
      vibrer(6);
      rendre(api);
    });

    rendre(api);

    /* nettoyage complet à la fermeture de l'application */
    return () => { nettoyerVue(); fenetre = null; };
  }
};
