/* =========================================================================
   Application « Cuisine » — écran de préparation (KDS).
   Spécification : business plan v1.7, §4 « Réception restaurant » et fin
   du §3 pour la disponibilité et la charge.

   Quatre onglets : File (le cœur), Tickets (impression ESC/POS),
   Ruptures (ce que la cuisine peut couper seule), Charge (le rush).

   Tout est vanilla : aucune dépendance, aucun build. Les minuteurs, les
   requestAnimationFrame et le contexte audio sont rangés par `demonter`.
   ========================================================================= */

import { topbar, navbar, esc, on, reduit, vibrer, compte } from './ui.js';

/* ------------------------------ constantes ------------------------------ */

/* Les six statuts du §4, dans l'ordre du cycle de vie. */
const ETATS = {
  appel:      { nom:'IA en appel',    chip:'info', lis:'var(--info)'   },
  attente:    { nom:'À confirmer',    chip:'warn', lis:'var(--warn)'   },
  confirmee:  { nom:'À préparer',     chip:'ok',   lis:'var(--ok)'     },
  preparation:{ nom:'En préparation', chip:'acc',  lis:'var(--accent)' },
  prete:      { nom:'Prête',          chip:'info', lis:'var(--info)'   },
  terminee:   { nom:'Terminée',       chip:'',     lis:'var(--rule)'   },
  expiree:    { nom:'Annulée',        chip:'bad',  lis:'var(--bad)'    }
};

const FILTRES = [
  { id:'tout',        nom:'Tout'       },
  { id:'confirmee',   nom:'À préparer' },
  { id:'preparation', nom:'En cours'   },
  { id:'prete',       nom:'Prêtes'     },
  { id:'terminee',    nom:'Terminées'  }
];

const IMPRIMANTES = [
  { id:'epson', nom:'Epson TM-m30 II', via:'USB' },
  { id:'star',  nom:'Star mC-Print3',  via:'Wi-Fi' },
  { id:'pack',  nom:'Pack Resto IA',   via:'79 €' }
];

/* Les deux commandes qui tombent toutes seules pendant la démonstration.
   #252 reprend celle annoncée par la notification du springboard. */
const ARRIVAGES = [
  { id:252, etat:'confirmee', mode:'retrait', heure:'19:52', prete:'20:12', client:'Inès',
    lignes:[
      { q:2, nom:'Tacos M', options:['Kebab','Sauce samouraï','Frites + Coca'],
        supplements:['Double viande'], demandes:[], prix:2300 },
      { q:1, nom:'Kebab XL', options:['Galette','Sauce blanche'], demandes:['Sans oignons'], prix:900 }
    ],
    total:3200, paiement:'Sur place', ticketImprime:false },

  { id:253, etat:'confirmee', mode:'livraison', heure:'19:56', prete:'20:31', client:'Thomas',
    adresse:'5 rue Chevreul, bât. A, 2e étage, digicode 12B04', distanceKm:1.6,
    lignes:[
      { q:1, nom:'Pizza 4 fromages', options:['Tomate','Moyenne'], demandes:['Coupée en 8'], prix:1150 },
      { q:2, nom:'Boisson 33 cl', options:['Coca'], demandes:[], prix:360 }
    ],
    total:1510, frais:250, paiement:'Espèces au livreur', ticketImprime:false }
];

const COL = 32;                                   // largeur du ticket ESC/POS

/* ========================================================================= */

export default {
  id:'cuisine',
  nom:'Cuisine',
  sousTitre:'Écran de préparation',
  accent:'#5fbf8b',
  fond:'linear-gradient(150deg,#79d3a4,#2f9d68)',
  encre:'#06180f',
  icone:'ticket',
  badge:4,

  css:`
  .ku-band{position:sticky;top:-14px;z-index:6;padding:11px 13px;display:grid;gap:9px;backdrop-filter:blur(10px)}
  .ku-stats{display:flex;align-items:stretch}
  .ku-s{flex:1;display:grid;gap:2px;text-align:center;padding:0 2px}
  .ku-s + .ku-s{border-left:1px solid var(--rule)}
  .ku-s b{font-family:var(--f-display);font-size:23px;line-height:1;font-variant-numeric:tabular-nums}
  .ku-s span{font-size:9px;color:var(--ink-3);letter-spacing:.05em;text-transform:uppercase;font-family:var(--f-mono)}
  .ku-s.ok b{color:var(--ok)} .ku-s.acc b{color:var(--accent-bright)} .ku-s.info b{color:var(--info)}
  .ku-s.delai b{font-size:19px;padding-top:3px}
  .ku-son{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;
    border:1px solid var(--rule);background:var(--surface-2);font-size:11.5px;color:var(--ink-3)}
  .ku-son svg{width:15px;height:15px}
  .ku-son[aria-pressed="true"]{border-color:rgba(95,191,139,.45);background:var(--ok-soft);color:var(--ok)}
  .ku-son[aria-pressed="true"] svg{animation:kuRing 3.2s ease-in-out infinite}
  @keyframes kuRing{0%,88%,100%{transform:rotate(0)}91%{transform:rotate(-13deg)}95%{transform:rotate(11deg)}}

  .ku-cmd{position:relative;padding:0;overflow:hidden;border-left:4px solid var(--lis,var(--rule))}
  .ku-tap{display:block;width:100%;text-align:left;padding:12px 14px 9px}
  .ku-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
  .ku-num{font-family:var(--f-display);font-size:20px;line-height:1;letter-spacing:-.01em}
  .ku-mode{margin-left:auto;font-family:var(--f-mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase}
  .ku-client{font-size:12.5px;color:var(--ink-2);margin-bottom:8px}
  .ku-client b{color:var(--ink)}
  .ku-lignes{list-style:none;margin:0;padding:0;display:grid;gap:7px}
  .ku-lignes li{display:flex;gap:9px;align-items:flex-start}
  .ku-q{font-family:var(--f-mono);font-size:15px;color:var(--app-accent,var(--accent));flex:none;min-width:24px;padding-top:1px}
  .ku-l{display:grid;gap:1px;min-width:0}
  .ku-l b{font-size:14.5px;font-weight:600;line-height:1.2}
  .ku-opt{font-size:11.5px;color:var(--ink-2)}
  .ku-sup{font-size:11.5px;color:var(--accent)}
  .ku-dem{font-size:11.5px;color:var(--warn)}
  .ku-acts{display:grid;gap:8px;grid-auto-flow:column;grid-auto-columns:1fr;padding:2px 12px 12px}
  .ku-acts .cta{padding:15px 10px;font-size:14.5px;border-radius:13px}
  .ku-acts .cta.ghost{font-size:12.5px;padding:15px 8px}

  .ku-chrono{display:flex;align-items:center;gap:6px;font-family:var(--f-mono);font-size:18px;
    font-variant-numeric:tabular-nums;color:var(--ink)}
  .ku-chrono svg{width:14px;height:14px;color:var(--ink-3)}
  .ku-chrono.is-late{color:var(--warn);animation:breathe 1.4s ease-in-out infinite}
  .ku-chrono.is-late svg{color:var(--warn)}
  .ku-tempo{display:flex;align-items:center;justify-content:space-between;gap:10px;
    padding:8px 14px 2px;border-top:1px dashed var(--rule);margin-top:9px}
  .ku-tempo span{font-size:10.5px;color:var(--ink-3);font-family:var(--f-mono);letter-spacing:.05em;text-transform:uppercase}
  .ku-jauge{margin:8px 14px 0}
  .ku-jauge i{background:var(--warn);transition:width .55s linear}
  .ku-jauge.is-court i{background:var(--bad)}

  .ku-wave{display:inline-flex;gap:2px;align-items:flex-end;height:13px}
  .ku-wave i{width:2.5px;border-radius:2px;background:var(--info);animation:kuWave 1s ease-in-out infinite}
  .ku-wave i:nth-child(1){height:5px;animation-delay:0s}
  .ku-wave i:nth-child(2){height:11px;animation-delay:.12s}
  .ku-wave i:nth-child(3){height:7px;animation-delay:.24s}
  .ku-wave i:nth-child(4){height:13px;animation-delay:.36s}
  .ku-wave i:nth-child(5){height:6px;animation-delay:.48s}
  @keyframes kuWave{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}

  .ku-pastille{position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:999px;
    background:var(--ok);color:#06180f;font-size:9px;font-weight:700;font-family:var(--f-mono);
    letter-spacing:.1em;animation:breathe 1.1s ease-in-out infinite}
  @keyframes kuIn{from{opacity:0;transform:translateY(-16px) scale(.96)}to{opacity:1;transform:none}}
  @keyframes kuOut{from{opacity:1;transform:none}to{opacity:0;transform:translateX(42px) scale(.97)}}
  @keyframes kuFlash{0%,100%{box-shadow:0 0 0 0 rgba(95,191,139,0)}35%{box-shadow:0 0 0 3px rgba(95,191,139,.5)}}
  .ku-cmd.is-in{animation:kuIn .4s var(--ease) both}
  .ku-cmd.is-new{animation:kuIn .45s var(--ease) both, kuFlash 1.2s ease .2s 2}
  .ku-cmd.is-out{animation:kuOut .26s var(--ease) both}
  .ku-cmd.is-fige{opacity:.6}

  .ku-sep{display:flex;align-items:center;gap:9px;padding-top:4px}
  .ku-sep span{font-family:var(--f-mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
  .ku-sep i{flex:1;height:1px;background:var(--rule)}
  .ku-vide{text-align:center;padding:30px 14px;color:var(--ink-3);font-size:12.5px}

  .ku-printer{border:1px solid var(--rule);border-radius:15px;background:var(--surface-2);padding:11px 11px 13px}
  .ku-slot{height:11px;border-radius:6px;background:var(--bg);box-shadow:inset 0 2px 6px rgba(0,0,0,.7);
    position:relative;z-index:2;margin-bottom:-4px}
  .ku-paper{overflow:hidden;max-height:0;transition:max-height 1.7s linear}
  .ku-paper.is-open{max-height:1800px}
  .ku-pre{margin:0;background:var(--ink);color:var(--bg);font-family:var(--f-mono);font-size:11px;
    line-height:1.5;padding:15px 11px 16px;white-space:pre;overflow-x:auto;
    transform:translateY(-16px);transition:transform 1.7s linear}
  .ku-paper.is-open .ku-pre{transform:none}
  .ku-tear{height:9px;background:var(--ink);
    -webkit-mask:radial-gradient(circle at 50% 0,transparent 0 4px,#000 4.6px) 0 0/11px 9px repeat-x;
            mask:radial-gradient(circle at 50% 0,transparent 0 4px,#000 4.6px) 0 0/11px 9px repeat-x}
  @keyframes kuShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-.9px)}75%{transform:translateX(.9px)}}
  .ku-printer.is-printing{animation:kuShake .09s linear infinite}
  .ku-printer.is-printing .ku-slot{box-shadow:inset 0 2px 6px rgba(0,0,0,.7),0 0 0 1px var(--rule-strong)}
  .ku-led{width:7px;height:7px;border-radius:50%;background:var(--ink-3);flex:none}
  .ku-printer.is-printing .ku-led{background:var(--ok);animation:breathe .5s ease-in-out infinite}
  .ku-phead{display:flex;align-items:center;gap:8px;padding:0 3px 9px;font-family:var(--f-mono);
    font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}

  .ku-sw{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;
    border:1px solid var(--rule);background:var(--surface)}
  .ku-sw .tx{flex:1;min-width:0}
  .ku-sw .tx b{display:block;font-size:13px}
  .ku-sw .tx span{display:block;font-size:11px;color:var(--ink-3);line-height:1.35}

  .ku-rline{display:grid;gap:0;padding:9px 12px;border-radius:12px;border:1px solid var(--rule);
    background:var(--surface);transition:border-color .25s,background .25s}
  .ku-rtop{display:flex;align-items:center;gap:11px}
  .ku-rnom{flex:1;min-width:0;font-size:13.5px;font-weight:600;transition:color .25s}
  .ku-rprix{font-family:var(--f-mono);font-size:12px;color:var(--ink-3)}
  .ku-rline.is-off{border-color:rgba(224,119,110,.42);background:var(--bad-soft)}
  .ku-rline.is-off .ku-rnom{color:var(--ink-3);text-decoration:line-through}
  .ku-alt{max-height:0;opacity:0;overflow:hidden;font-size:11.5px;color:var(--warn);
    transition:max-height .3s var(--ease),opacity .25s ease,margin .3s var(--ease)}
  .ku-rline.is-off .ku-alt{max-height:44px;opacity:1;margin-top:7px}
  .ku-cathead{display:flex;align-items:center;gap:10px;padding:2px 2px 0}
  .ku-cathead h3{flex:1;font-family:var(--f-body);font-size:13.5px;font-weight:600}
  .ku-compteur{display:flex;align-items:baseline;gap:9px}
  .ku-compteur b{font-family:var(--f-display);font-size:30px;line-height:1;color:var(--bad)}

  .ku-niv{display:block;width:100%;text-align:left;padding:12px 14px;border-radius:14px;
    border:1px solid var(--rule);background:var(--surface);transition:all .22s var(--ease)}
  .ku-niv:active{transform:translateY(1px)}
  .ku-niv[aria-pressed="true"]{border-color:var(--rule-strong);background:var(--accent-soft);
    box-shadow:inset 3px 0 0 var(--nc,var(--accent))}
  .ku-nivtop{display:flex;align-items:center;gap:9px;margin-bottom:4px}
  .ku-nivtop b{flex:1;font-size:14px;font-weight:600}
  .ku-nivdel{font-family:var(--f-mono);font-size:15px;color:var(--ink)}
  .ku-nivdit{font-size:11.5px;color:var(--ink-2);line-height:1.45}
  .ku-step{display:flex;align-items:center;gap:7px}
  .ku-step button{width:40px;height:40px;border-radius:12px;border:1px solid var(--rule);
    background:var(--surface-2);display:grid;place-items:center;color:var(--ink)}
  .ku-step button:active{transform:translateY(1px)}
  .ku-step button svg{width:16px;height:16px}
  .ku-step b{flex:1;text-align:center;font-family:var(--f-display);font-size:20px;font-variant-numeric:tabular-nums}
  .ku-reprise{display:flex;align-items:center;gap:10px}
  .ku-reprise b{font-family:var(--f-mono);font-size:22px;color:var(--bad)}

  .ku-det{display:grid;gap:3px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--rule)}
  .ku-det .k{font-family:var(--f-mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
  .ku-det .v{font-size:13px;line-height:1.4}

  @media (prefers-reduced-motion:reduce){
    .ku-paper{transition:none} .ku-pre{transition:none;transform:none}
  }
  `,

  /* ===================================================================== */
  monter(win, api){
    const D = api.data, fmt = api.fmt, ico = api.ico;

    /* ----------------------------- état vivant ----------------------------- */
    const etat = {
      tab:'file',
      filtre:'tout',
      charge:D.RESTO.charge,               // normal | rush | charge | stop
      delaiRetrait:D.CHARGES[D.RESTO.charge].delai,
      delaiLivraison:D.CHARGES[D.RESTO.charge].delai + 20,
      capacite:12,
      reprise:null,                        // heure estimée de reprise si stop
      ticket:248,
      ticketModif:false,
      opt:{ son:true, auto:true, modifs:true, annul:false, imprimante:'epson' },
      imprimes:new Set()                   // clés « 248 » ou « 248-modif »
    };

    /* Copie de travail : la maquette modifie les commandes, jamais data.js. */
    const now0 = Date.now();
    const cmds = D.COMMANDES.map(c => Object.assign({}, c, {
      lignes:c.lignes.map(l => Object.assign({}, l)),
      reste:c.expireDans || 0,
      resteTotal:c.expireDans || 120,
      tPrep:c.etat === 'preparation' ? now0 - 11 * 60000 : null,
      tPret:c.etat === 'prete' ? now0 - 4 * 60000 : null
    }));

    /* Ruptures : on part de l'état « dispo » du menu. */
    const ruptures = new Set();
    D.MENU.forEach(cat => cat.items.forEach(it => { if (!it.dispo) ruptures.add('p:' + it.id); }));
    const SUPS = [];
    D.MENU.forEach(cat => cat.items.forEach(it => (it.supplements || []).forEach(s => {
      if (!SUPS.some(x => x.nom === s.nom)) SUPS.push(s);
      if (!s.dispo) ruptures.add('s:' + s.nom);
    })));

    /* ------------------------ minuteurs et audio ------------------------ */
    const tos = new Set();
    let tick = null, audio = null, rafId = 0;
    function apres(fn, ms){
      const id = setTimeout(() => { tos.delete(id); fn(); }, ms);
      tos.add(id); return id;
    }

    /* Bip réel : deux oscillateurs courts, aucun fichier externe. */
    function bip(grave){
      if (!etat.opt.son) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!audio) audio = new AC();
        if (audio.state === 'suspended') audio.resume();
        const t = audio.currentTime;
        const notes = grave ? [[520, 0]] : [[880, 0], [1320, .13]];
        notes.forEach(function(n){
          const o = audio.createOscillator(), g = audio.createGain();
          o.type = 'sine'; o.frequency.value = n[0];
          g.gain.setValueAtTime(.0001, t + n[1]);
          g.gain.exponentialRampToValueAtTime(.18, t + n[1] + .015);
          g.gain.exponentialRampToValueAtTime(.0001, t + n[1] + .17);
          o.connect(g); g.connect(audio.destination);
          o.start(t + n[1]); o.stop(t + n[1] + .19);
        });
      } catch(e){}
    }

    /* ------------------------------ utilitaires ------------------------------ */
    const cmd = id => cmds.find(c => c.id === id);
    const delaiDe = c => c.mode === 'livraison' ? etat.delaiLivraison : etat.delaiRetrait;

    function compteurs(){
      const n = { appel:0, attente:0, confirmee:0, preparation:0, prete:0, terminee:0, expiree:0 };
      cmds.forEach(c => { n[c.etat] = (n[c.etat] || 0) + 1; });
      return n;
    }
    let dernierBadge = -1;
    function majBadge(){
      const n = compteurs();
      const total = n.attente + n.confirmee + n.preparation + n.prete;
      api.badge(total);
      if (total !== dernierBadge){ dernierBadge = total; majNav(); }
    }
    function hhmm(d){
      return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }
    /* L'imprimante ESC/POS n'a pas d'accents : on s'en tient à l'ASCII. */
    function ascii(s){
      return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/[’']/g,"'").replace(/[«»]/g,'"').replace(/[–—]/g,'-').replace(/€/g,'E');
    }

    /* ------------------------------ ossature ------------------------------ */
    function tabsDef(){
      const n = compteurs();
      return [
        { id:'file',     label:'File',     icone:'ticket',  badge:n.attente + n.confirmee + n.preparation + n.prete },
        { id:'tickets',  label:'Tickets',  icone:'printer' },
        { id:'ruptures', label:'Ruptures', icone:'layers'  },
        { id:'charge',   label:'Charge',   icone:'flame'   }
      ];
    }
    function majNav(){
      const nav = win.querySelector('.navbar');
      if (nav) nav.outerHTML = navbar(tabsDef(), etat.tab);
    }

    win.innerHTML =
      topbar({
        titre:D.RESTO.nom, sous:'Écran de préparation',
        actions:'<span class="chip acc mono" data-hh>' + hhmm(new Date()) + '</span>'
      }) +
      '<main class="content"></main>' +
      navbar(tabsDef(), etat.tab);

    const content = win.querySelector('.content');

    on(win, '[data-tab]', 'click', (ev, b) => {
      if (b.dataset.tab === etat.tab) return;
      etat.tab = b.dataset.tab; vibrer(6); majNav(); peindre();
    });

    /* ===================================================================== */
    /*  ONGLET 1 — FILE                                                      */
    /* ===================================================================== */

    const anims = new Map();               // id → 'is-in' | 'is-new'

    function bandeau(){
      const n = compteurs();
      const ch = D.CHARGES[etat.charge];
      return '<div class="card ku-band">' +
        '<div class="ku-stats">' +
          '<div class="ku-s ok"><b>' + n.confirmee + '</b><span>à préparer</span></div>' +
          '<div class="ku-s acc"><b>' + n.preparation + '</b><span>en cours</span></div>' +
          '<div class="ku-s info"><b>' + n.prete + '</b><span>prêtes</span></div>' +
          '<div class="ku-s delai"><b>' +
            (etat.charge === 'stop' ? '—' : etat.delaiRetrait + '′') +
          '</b><span>délai annoncé</span></div>' +
        '</div>' +
        '<div class="row between">' +
          '<span class="chip ' + ch.ton + '"><i class="dot"></i>' + esc(ch.nom) +
            (etat.charge === 'stop' ? '' : ' · livraison ' + etat.delaiLivraison + '′') + '</span>' +
          '<button class="ku-son" data-son aria-pressed="' + (etat.opt.son ? 'true' : 'false') + '">' +
            ico('bell') + 'Alerte sonore</button>' +
        '</div>' +
      '</div>';
    }

    function lignes(c){
      return '<ul class="ku-lignes">' + c.lignes.map(l =>
        '<li><span class="ku-q">' + l.q + '×</span><span class="ku-l">' +
          '<b>' + esc(l.nom) + '</b>' +
          (l.options && l.options.length ? '<span class="ku-opt">' + esc(l.options.join(' · ')) + '</span>' : '') +
          (l.supplements && l.supplements.length ? '<span class="ku-sup">+ ' + esc(l.supplements.join(', ')) + '</span>' : '') +
          (l.demandes && l.demandes.length ? '<span class="ku-dem">! ' + esc(l.demandes.join(' · ')) + '</span>' : '') +
        '</span></li>').join('') + '</ul>';
    }

    function actions(c){
      const b = [];
      if (c.etat === 'confirmee'){
        b.push('<button class="cta ok" data-act="commencer" data-id="' + c.id + '">' + ico('play') + 'Commencer</button>');
        b.push('<button class="cta ghost" data-act="ticket" data-id="' + c.id + '">' + ico('printer') +
          (c.ticketImprime || etat.imprimes.has(String(c.id)) ? 'Réimprimer' : 'Ticket') + '</button>');
      } else if (c.etat === 'preparation'){
        b.push('<button class="cta" data-act="prete" data-id="' + c.id + '">' + ico('check') +
          (c.mode === 'livraison' ? 'Prête pour livreur' : 'Prête') + '</button>');
      } else if (c.etat === 'prete'){
        b.push('<button class="cta ok" data-act="fin" data-id="' + c.id + '">' + ico('check') +
          (c.mode === 'livraison' ? 'Livrée' : 'Récupérée') + '</button>');
        b.push('<button class="cta ghost" data-act="ticket" data-id="' + c.id + '">' + ico('printer') + 'Réimprimer</button>');
      } else if (c.etat === 'attente'){
        b.push('<button class="cta ghost" data-act="detail" data-id="' + c.id + '">' + ico('clock') +
          'Panier provisoire — ne rien préparer</button>');
      } else if (c.etat === 'appel'){
        b.push('<button class="cta ghost" data-act="detail" data-id="' + c.id + '">' + ico('mic') +
          'IA en ligne — ne rien préparer</button>');
      } else if (c.etat === 'expiree'){
        b.push('<button class="cta ghost" data-act="effacer" data-id="' + c.id + '">' + ico('x') + 'Effacer de l’écran</button>');
      } else if (c.etat === 'terminee'){
        b.push('<button class="cta ghost" data-act="ticket" data-id="' + c.id + '">' + ico('printer') + 'Ticket</button>');
      }
      return '<div class="ku-acts">' + b.join('') + '</div>';
    }

    function tempo(c){
      if (c.etat === 'attente'){
        const p = Math.max(0, Math.min(1, c.reste / c.resteTotal));
        return '<div class="ku-tempo"><span>Expire dans</span>' +
            '<span class="ku-chrono' + (c.reste < 20 ? ' is-late' : '') + '" data-reste="' + c.id + '">' +
              ico('clock') + fmt.horloge(Math.ceil(c.reste)) + '</span></div>' +
          '<div class="bar ku-jauge' + (c.reste < 20 ? ' is-court' : '') + '" data-jauge="' + c.id + '">' +
            '<i style="width:' + (p * 100).toFixed(1) + '%"></i></div>';
      }
      if (c.etat === 'preparation'){
        const s = (Date.now() - c.tPrep) / 1000;
        const late = s > delaiDe(c) * 60;
        return '<div class="ku-tempo"><span>En cuisine depuis</span>' +
          '<span class="ku-chrono' + (late ? ' is-late' : '') + '" data-chrono="' + c.id + '">' +
            ico('clock') + fmt.horloge(s) + '</span></div>';
      }
      if (c.etat === 'prete'){
        const s = (Date.now() - c.tPret) / 1000;
        return '<div class="ku-tempo"><span>' +
          (c.mode === 'livraison' ? 'Attend le livreur depuis' : 'Attend au comptoir depuis') + '</span>' +
          '<span class="ku-chrono' + (s > 300 ? ' is-late' : '') + '" data-attente="' + c.id + '">' +
            ico('clock') + fmt.horloge(s) + '</span></div>';
      }
      if (c.etat === 'appel'){
        return '<div class="ku-tempo"><span>Appel en cours</span>' +
          '<span class="ku-chrono" data-appel="' + c.id + '">' + ico('mic') + fmt.horloge(c.depuis) + '</span></div>';
      }
      return '';
    }

    function carte(c){
      const E = ETATS[c.etat];
      const an = anims.get(c.id) || '';
      anims.delete(c.id);
      const arg = c.total ? fmt.euro(c.total + (c.frais || 0)) : null;
      return '<article class="card ku-cmd ' + an + (c.etat === 'expiree' || c.etat === 'terminee' ? ' is-fige' : '') +
          '" data-cmd="' + c.id + '" style="--lis:' + E.lis + '">' +
        (an === 'is-new' ? '<span class="ku-pastille">NOUVELLE</span>' : '') +
        '<button class="ku-tap" data-act="detail" data-id="' + c.id + '">' +
          '<div class="ku-head">' +
            '<span class="ku-num">#' + c.id + '</span>' +
            '<span class="chip ' + E.chip + '">' +
              (c.etat === 'appel' ? '<span class="ku-wave"><i></i><i></i><i></i><i></i><i></i></span>' : '<i class="dot"></i>') +
              esc(E.nom) + '</span>' +
            '<span class="ku-mode">' + (c.mode === 'livraison' ? 'Livraison' : 'Retrait') +
              (c.prete ? ' · ' + c.prete : '') + '</span>' +
          '</div>' +
          '<div class="ku-client">' +
            (c.client ? '<b>' + esc(c.client) + '</b>' : '<b>Client en ligne</b>') +
            (arg ? ' · ' + arg : '') +
            (c.paiement ? ' · ' + esc(c.paiement) : '') +
            (c.mode === 'livraison' && c.distanceKm ? ' · ' + c.distanceKm + ' km' : '') +
          '</div>' +
          (c.lignes.length ? lignes(c) : '<div class="ku-opt">Panier en construction — l’IA prend la commande.</div>') +
          (c.motif ? '<div class="ku-dem" style="margin-top:8px">' + esc(c.motif) + ' — aucune préparation.</div>' : '') +
        '</button>' +
        tempo(c) +
        actions(c) +
      '</article>';
    }

    function peindreFile(){
      const actifs = ['appel','attente','confirmee','preparation','prete'];
      let liste = cmds.filter(c => etat.filtre === 'tout' ? actifs.indexOf(c.etat) >= 0 : c.etat === etat.filtre);
      /* Les plus urgentes en haut : à préparer, puis en cours, puis le reste. */
      const rang = { confirmee:0, preparation:1, prete:2, attente:3, appel:4, terminee:5, expiree:6 };
      liste = liste.slice().sort((a,b) => (rang[a.etat] - rang[b.etat]) || (b.id - a.id));
      const expirees = cmds.filter(c => c.etat === 'expiree');

      content.innerHTML =
        bandeau() +
        '<div class="seg">' + FILTRES.map(f =>
          '<button data-filtre="' + f.id + '" aria-pressed="' + (etat.filtre === f.id) + '">' + f.nom +
          '</button>').join('') + '</div>' +
        '<div class="sec stagger" data-liste>' +
          (liste.length ? liste.map(carte).join('') :
            '<div class="ku-vide">Aucune commande dans ce filtre.<br>L’écran reste ouvert : la prochaine arrive toute seule.</div>') +
        '</div>' +
        ((etat.filtre === 'tout' || etat.filtre === 'terminee') && expirees.length ?
          '<div class="ku-sep"><span>Annulées / expirées</span><i></i></div>' +
          '<div class="sec">' + expirees.map(carte).join('') + '</div>' +
          '<div class="note bad">Une commande expirée n’est <b>jamais</b> mêlée aux commandes actives : aucune préparation, aucun ticket.</div>' : '') +
        '<div class="note">' + esc(D.REGLES.confirmation) + '</div>';
    }

    /* Passage d'un état au suivant, avec sortie puis entrée animées. */
    function avancer(id, suite, msg, bipGrave){
      const c = cmd(id); if (!c) return;
      const carteEl = content.querySelector('[data-cmd="' + id + '"]');
      const fin = () => {
        c.etat = suite;
        if (suite === 'preparation') c.tPrep = Date.now();
        if (suite === 'prete') c.tPret = Date.now();
        anims.set(id, 'is-in');
        api.toast(msg);
        vibrer(12);
        if (bipGrave) bip(true);
        majBadge();
        if (etat.tab === 'file') peindreFile();
      };
      if (carteEl && !reduit()){ carteEl.classList.add('is-out'); apres(fin, 260); }
      else fin();
    }

    /* Une commande tombe : animation d'entrée, pastille, bip et notification. */
    function arrivee(modele){
      if (cmd(modele.id)) return;
      const c = Object.assign({}, modele, {
        lignes:modele.lignes.map(l => Object.assign({}, l)),
        reste:0, resteTotal:120, tPrep:null, tPret:null
      });
      cmds.unshift(c);
      anims.set(c.id, 'is-new');
      bip();
      vibrer(22);
      majBadge();
      if (etat.opt.auto){
        etat.imprimes.add(String(c.id));
        c.ticketImprime = true;
      }
      api.notif({
        titre:'Commande #' + c.id + ' confirmée',
        texte:(c.client || 'Client') + ' · ' + (c.mode === 'livraison' ? 'livraison' : 'retrait') +
              ' ' + (c.prete || '') + ' · ' + fmt.euro(c.total + (c.frais || 0)),
        couleur:'#5fbf8b', glyph:'check',
        onClic(){ etat.tab = 'file'; etat.filtre = 'tout'; majNav(); peindre(); }
      });
      api.toast('Nouvelle commande #' + c.id +
        (etat.opt.auto ? ' — ticket imprimé automatiquement.' : ' — à préparer.'));
      if (etat.tab === 'file') peindreFile();
    }

    /* --------------------------- battement d'une demi-seconde --------------------------- */
    function battement(){
      const t = Date.now();
      const hh = win.querySelector('[data-hh]');
      if (hh) hh.textContent = hhmm(new Date());

      let aExpire = null;
      cmds.forEach(c => {
        if (c.etat === 'attente'){
          c.reste = Math.max(0, c.reste - .5);
          if (c.reste <= 0) aExpire = c;
        }
        if (c.etat === 'appel') c.depuis += .5;
      });

      /* Rafraîchissement ciblé : on ne repeint jamais la liste pour du texte. */
      content.querySelectorAll('[data-reste]').forEach(n => {
        const c = cmd(+n.dataset.reste); if (!c) return;
        n.innerHTML = ico('clock') + fmt.horloge(Math.ceil(c.reste));
        n.classList.toggle('is-late', c.reste < 20);
      });
      content.querySelectorAll('[data-jauge]').forEach(n => {
        const c = cmd(+n.dataset.jauge); if (!c) return;
        const i = n.firstElementChild;
        if (i) i.style.width = Math.max(0, Math.min(1, c.reste / c.resteTotal)) * 100 + '%';
        n.classList.toggle('is-court', c.reste < 20);
      });
      content.querySelectorAll('[data-chrono]').forEach(n => {
        const c = cmd(+n.dataset.chrono); if (!c || !c.tPrep) return;
        const s = (t - c.tPrep) / 1000;
        n.innerHTML = ico('clock') + fmt.horloge(s);
        n.classList.toggle('is-late', s > delaiDe(c) * 60);
      });
      content.querySelectorAll('[data-attente]').forEach(n => {
        const c = cmd(+n.dataset.attente); if (!c || !c.tPret) return;
        const s = (t - c.tPret) / 1000;
        n.innerHTML = ico('clock') + fmt.horloge(s);
        n.classList.toggle('is-late', s > 300);
      });
      content.querySelectorAll('[data-appel]').forEach(n => {
        const c = cmd(+n.dataset.appel); if (!c) return;
        n.innerHTML = ico('mic') + fmt.horloge(c.depuis);
      });

      if (aExpire){
        aExpire.etat = 'expiree';
        aExpire.motif = 'Aucune validation du client';
        anims.set(aExpire.id, 'is-in');
        api.toast('Commande #' + aExpire.id + ' expirée — le client n’a pas confirmé. Rien à préparer.');
        majBadge();
        if (etat.tab === 'file') peindreFile();
      }
    }

    /* ===================================================================== */
    /*  ONGLET 2 — TICKETS                                                   */
    /* ===================================================================== */

    const ctr = t => ' '.repeat(Math.max(0, Math.floor((COL - t.length) / 2))) + t;
    const lig = (g, d) => g + ' '.repeat(Math.max(1, COL - g.length - d.length)) + d;
    const SEP = '-'.repeat(COL);

    function ticketTexte(c, modif){
      const L = [];
      L.push(ctr(ascii(D.RESTO.nom.toUpperCase())));
      L.push(ctr(ascii(D.RESTO.adresse)));
      L.push(ctr(ascii(D.RESTO.tel)));
      L.push('');
      if (modif){
        L.push(ctr('** MODIFICATION **'));
        L.push(ctr('COMMANDE #' + c.id));
        L.push(ctr('LE TICKET PRECEDENT'));
        L.push(ctr('EST ANNULE'));
      }
      L.push(SEP);
      L.push(lig('COMMANDE #' + c.id, c.mode === 'livraison' ? 'LIVRAISON' : 'RETRAIT'));
      L.push(lig('Recue', c.heure));
      L.push(lig('Annoncee', c.prete || '--:--'));
      L.push(lig('Client', ascii(c.client || 'non communique')));
      if (c.mode === 'livraison'){
        L.push(SEP);
        L.push('ADRESSE');
        ascii(c.adresse || '').split(', ').forEach(x => L.push('  ' + x));
        L.push(lig('  Distance', (c.distanceKm || 0) + ' km'));
      }
      L.push(SEP);
      if (modif){
        L.push(lig('- RETIRER CHEDDAR', '-1,00'));
        L.push('  sur 1x TACOS M');
        L.push('');
        L.push('Le reste de la commande est');
        L.push('inchange.');
        L.push(SEP);
        L.push(lig('NOUVEAU TOTAL', fmt.euro(c.total - 100).replace(' €','')));
      } else {
        c.lignes.forEach(l => {
          L.push(lig(l.q + 'x ' + ascii(l.nom.toUpperCase()), fmt.euro(l.prix).replace(' €','')));
          (l.options || []).forEach(o => L.push('   ' + ascii(o)));
          (l.supplements || []).forEach(s => L.push('   + ' + ascii(s)));
          (l.demandes || []).forEach(d => L.push('   ! ' + ascii(d.toUpperCase())));
        });
        L.push(SEP);
        if (c.frais) L.push(lig('Frais de livraison', fmt.euro(c.frais).replace(' €','')));
        L.push(lig('TOTAL', fmt.euro(c.total + (c.frais || 0)).replace(' €','')));
      }
      L.push('');
      L.push(ctr(c.mode === 'livraison'
        ? 'A REGLER AU LIVREUR'
        : 'A REGLER SUR PLACE'));
      if (c.paiement) L.push(ctr('(' + ascii(c.paiement) + ')'));
      L.push(SEP);
      L.push('Commande confirmee par le');
      L.push('client. Prise par assistant');
      L.push('vocal automatise.');
      L.push('Resto IA ne collecte aucun');
      L.push('paiement.');
      L.push('');
      L.push(ctr('#' + c.id + ' - ' + (modif ? 'MODIF' : '1/1')));
      return L.join('\n');
    }

    function peindreTickets(){
      const imprimables = cmds.filter(c => ['confirmee','preparation','prete','terminee'].indexOf(c.etat) >= 0);
      if (!imprimables.some(c => c.id === etat.ticket) && imprimables.length) etat.ticket = imprimables[0].id;
      const c = cmd(etat.ticket) || imprimables[0];
      const cle = c ? c.id + (etat.ticketModif ? '-modif' : '') : '';
      const dejaFait = c ? etat.imprimes.has(String(cle)) : false;

      content.innerHTML =
        (imprimables.length ?
          '<div class="seg">' + imprimables.map(x =>
            '<button data-ticket="' + x.id + '" aria-pressed="' + (x.id === etat.ticket) + '">#' + x.id + ' · ' +
            (x.mode === 'livraison' ? 'livr.' : 'retrait') + '</button>').join('') + '</div>' : '') +

        (c ?
        '<div class="ku-printer" data-printer>' +
          '<div class="ku-phead"><span class="ku-led"></span>' +
            esc(IMPRIMANTES.find(p => p.id === etat.opt.imprimante).nom) +
            ' · ESC/POS · ' + COL + ' colonnes</div>' +
          '<div class="ku-slot"></div>' +
          '<div class="ku-paper' + (dejaFait ? ' is-open' : '') + '" data-paper>' +
            '<pre class="ku-pre" data-pre>' + esc(ticketTexte(c, etat.ticketModif)) + '</pre>' +
            '<div class="ku-tear"></div>' +
          '</div>' +
        '</div>' +
        '<div class="grid2">' +
          '<button class="cta" data-imprimer>' + ico('printer') +
            (dejaFait ? 'Réimprimer' : 'Imprimer le ticket') + '</button>' +
          '<button class="cta ghost" data-modif aria-pressed="' + etat.ticketModif + '">' + ico('edit') +
            (etat.ticketModif ? 'Ticket normal' : 'Ticket de modification') + '</button>' +
        '</div>' +
        (dejaFait ? '<div class="note info">Ticket déjà sorti. La réimpression sert quand le papier manque, quand le ticket est perdu ou quand une seconde copie est utile.</div>' : '') +
        (etat.ticketModif ? '<div class="note warn"><b>' + esc(D.REGLES.modification) + '</b></div>' : '')
        : '<div class="ku-vide">Aucune commande confirmée à imprimer pour l’instant.</div>') +

        '<div class="sec"><div class="sec-head"><h3>Réglages d’impression</h3>' +
          '<span class="eyebrow">Cuisine</span></div>' +
          '<div class="list">' +
            swRow('son',    'Alerte sonore',                'Un bip à chaque commande confirmée.') +
            swRow('auto',   'Impression automatique',       'Les commandes confirmées sortent seules.') +
            swRow('modifs', 'Impression des modifications', 'Ticket « MODIFICATION COMMANDE #… ».') +
            swRow('annul',  'Impression des annulations',   'Au choix du restaurant ; désactivé par défaut.') +
          '</div>' +
        '</div>' +

        '<div class="sec"><div class="sec-head"><h3>Imprimante</h3></div>' +
          '<div class="seg">' + IMPRIMANTES.map(p =>
            '<button data-imp="' + p.id + '" aria-pressed="' + (etat.opt.imprimante === p.id) + '">' +
            esc(p.nom) + ' · ' + esc(p.via) + '</button>').join('') + '</div>' +
          '<button class="cta ghost" data-test>' + ico('refresh') + 'Tester l’imprimante</button>' +
          '<div class="ku-printer" data-testprinter hidden>' +
            '<div class="ku-slot"></div>' +
            '<div class="ku-paper" data-testpaper>' +
              '<pre class="ku-pre">' + esc([
                ctr('*** TEST IMPRIMANTE ***'),
                SEP,
                lig('Liaison', 'OK'),
                lig('Papier', 'OK'),
                lig('Coupe', 'OK'),
                SEP,
                ctr('RESTO IA')
              ].join('\n')) + '</pre>' +
              '<div class="ku-tear"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="note">Liaison ESC/POS par WebSockets ou Cloud Print. Sans matériel, le <b>pack imprimante à 79 €</b> est proposé à l’installation.</div>' +
        '<div class="note info">L’écran cuisine fonctionne même si l’impression est indisponible. Pour les micro-structures, repli par <b>SMS ou WhatsApp au gérant</b>.</div>';
    }

    function swRow(cle, titre, sous){
      return '<div class="ku-sw"><span class="tx"><b>' + esc(titre) + '</b><span>' + esc(sous) + '</span></span>' +
        '<button class="switch" role="switch" data-sw="' + cle + '" aria-checked="' +
        (etat.opt[cle] ? 'true' : 'false') + '" aria-label="' + esc(titre) + '"></button></div>';
    }

    /* Papier qui sort : la feuille se révèle, l'imprimante tremble. */
    function imprimer(printer, paper, fini){
      const duree = reduit() ? 0 : 1700;
      paper.classList.remove('is-open');
      printer.classList.add('is-printing');
      // reflow pour rejouer la transition de max-height
      void paper.offsetHeight;
      rafId = requestAnimationFrame(() => { rafId = 0; paper.classList.add('is-open'); });
      apres(() => { printer.classList.remove('is-printing'); if (fini) fini(); }, duree);
    }

    /* ===================================================================== */
    /*  ONGLET 3 — RUPTURES                                                  */
    /* ===================================================================== */

    /* L'alternative que l'IA proposera : un produit encore disponible,
       d'abord dans la même catégorie. */
    function alternative(cat, item){
      const voisin = cat.items.find(i => i.id !== item.id && !ruptures.has('p:' + i.id));
      if (voisin) return voisin.nom;
      for (const c2 of D.MENU){
        const x = c2.items.find(i => !ruptures.has('p:' + i.id));
        if (x) return x.nom;
      }
      return 'le reste de la carte';
    }

    function peindreRuptures(){
      const conf = cmds.filter(c => ['confirmee','preparation','prete'].indexOf(c.etat) >= 0).length;
      content.innerHTML =
        '<div class="card"><div class="row between">' +
          '<div class="ku-compteur"><b data-cpt>0</b>' +
            '<span class="stat"><span>ce que l’IA ne propose plus</span></span></div>' +
          '<span class="chip ok">effet immédiat</span>' +
        '</div>' +
        '<div class="note" style="margin-top:11px">La rupture vaut pour les <b>nouveaux appels</b>, sans repasser par « Publier ». ' +
          'Elle ne supprime jamais une commande confirmée : <b>' + conf + '</b> en cuisine sont intouchées.</div>' +
        '</div>' +

        D.MENU.map(cat => {
          const off = cat.items.every(i => ruptures.has('p:' + i.id));
          return '<div class="sec">' +
            '<div class="ku-cathead"><h3>' + esc(cat.nom) + '</h3>' +
              '<button class="cta sm ghost" data-cat="' + cat.id + '">' +
                (off ? 'Tout rétablir' : 'Arrêter la catégorie') + '</button></div>' +
            '<div class="list stagger">' + cat.items.map(it => {
              const ko = ruptures.has('p:' + it.id);
              return '<div class="ku-rline' + (ko ? ' is-off' : '') + '" data-ligne="p:' + it.id + '">' +
                '<div class="ku-rtop">' +
                  '<span class="ku-rnom">' + esc(it.nom) + (it.populaire ? ' <span class="chip acc">top</span>' : '') + '</span>' +
                  '<span class="ku-rprix">' + fmt.euro(it.prix) + '</span>' +
                  '<button class="switch" role="switch" data-rupt="p:' + it.id + '" aria-checked="' + (!ko) + '" ' +
                    'aria-label="Disponibilité de ' + esc(it.nom) + '"></button>' +
                '</div>' +
                '<div class="ku-alt">L’IA propose à la place : <b>' + esc(alternative(cat, it)) + '</b></div>' +
              '</div>';
            }).join('') + '</div>' +
          '</div>';
        }).join('') +

        '<div class="sec"><div class="ku-cathead"><h3>Suppléments</h3></div>' +
          '<div class="list">' + SUPS.map(s => {
            const ko = ruptures.has('s:' + s.nom);
            return '<div class="ku-rline' + (ko ? ' is-off' : '') + '" data-ligne="s:' + s.nom + '">' +
              '<div class="ku-rtop">' +
                '<span class="ku-rnom">' + esc(s.nom) + '</span>' +
                '<span class="ku-rprix">' + (s.prix ? '+' + fmt.euro(s.prix) : 'offert') + '</span>' +
                '<button class="switch" role="switch" data-rupt="s:' + esc(s.nom) + '" aria-checked="' + (!ko) + '" ' +
                  'aria-label="Disponibilité de ' + esc(s.nom) + '"></button>' +
              '</div>' +
              '<div class="ku-alt">L’IA ne le propose plus et n’en parle plus spontanément.</div>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>' +

        '<div class="note info">La cuisine peut couper un produit sans passer par le gérant. Tout est tracé dans l’application gérant.</div>';

      const cpt = content.querySelector('[data-cpt]');
      if (cpt) compte(cpt, ruptures.size);
    }

    function majCompteur(){
      const cpt = content.querySelector('[data-cpt]');
      if (cpt) cpt.textContent = ruptures.size;
    }

    /* ===================================================================== */
    /*  ONGLET 4 — CHARGE                                                    */
    /* ===================================================================== */

    function peindreCharge(){
      const tons = { ok:'var(--ok)', warn:'var(--warn)', bad:'var(--bad)' };
      content.innerHTML =
        '<div class="sec stagger">' +
          Object.keys(D.CHARGES).map(k => {
            const c = D.CHARGES[k];
            return '<button class="ku-niv" data-charge="' + k + '" aria-pressed="' + (etat.charge === k) + '" ' +
              'style="--nc:' + (tons[c.ton] || 'var(--accent)') + '">' +
              '<span class="ku-nivtop"><b>' + esc(c.nom) + '</b>' +
                '<span class="ku-nivdel">' + (c.delai ? c.delai + ' min' : 'arrêt') + '</span>' +
                (etat.charge === k ? '<span class="chip ' + c.ton + '"><i class="dot blink"></i>actif</span>' : '') +
              '</span>' +
              '<span class="ku-nivdit">' + esc(c.dit) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +

        (etat.charge === 'stop' ?
          '<div class="card"><div class="row between">' +
            '<div class="ku-reprise"><b data-rep>' + esc(etat.reprise || '--:--') + '</b>' +
              '<span class="stat"><span>reprise estimée<br>annoncée par l’IA</span></span></div>' +
            '<button class="cta sm ghost" data-plus15>' + ico('plus') + '15 min</button>' +
          '</div></div>' : '') +

        '<div class="sec"><div class="sec-head"><h3>Délais annoncés</h3><span class="eyebrow">distincts</span></div>' +
          '<div class="grid2">' +
            '<div class="card tight"><div class="eyebrow">Retrait</div>' +
              '<div class="ku-step"><button data-delai="retrait:-5" aria-label="Moins 5 minutes">' + ico('minus') + '</button>' +
                '<b data-dr>' + etat.delaiRetrait + '′</b>' +
                '<button data-delai="retrait:5" aria-label="Plus 5 minutes">' + ico('plus') + '</button></div></div>' +
            '<div class="card tight"><div class="eyebrow">Livraison</div>' +
              '<div class="ku-step"><button data-delai="livraison:-5" aria-label="Moins 5 minutes">' + ico('minus') + '</button>' +
                '<b data-dl>' + etat.delaiLivraison + '′</b>' +
                '<button data-delai="livraison:5" aria-label="Plus 5 minutes">' + ico('plus') + '</button></div></div>' +
          '</div>' +
          '<div class="card tight"><div class="row between"><div>' +
            '<div class="eyebrow">Capacité maximale</div>' +
            '<div class="ku-opt">commandes acceptées en parallèle</div></div>' +
            '<div class="ku-step" style="width:150px">' +
              '<button data-cap="-1" aria-label="Moins une commande">' + ico('minus') + '</button>' +
              '<b data-cap>' + etat.capacite + '</b>' +
              '<button data-cap="1" aria-label="Plus une commande">' + ico('plus') + '</button></div>' +
          '</div></div>' +
        '</div>' +

        '<button class="cta ' + (etat.charge === 'stop' ? 'ok' : 'danger') + '" data-stop>' +
          ico(etat.charge === 'stop' ? 'play' : 'stop') +
          (etat.charge === 'stop' ? 'Reprendre les commandes' : 'Stopper les commandes') + '</button>' +

        '<div class="note">Au lancement, le rush est <b>manuel</b> et activable par le gérant ou par la cuisine. ' +
          'Plus tard, l’IA pourra le recommander ou l’activer selon les commandes en attente.</div>' +
        '<div class="note info">Le délai choisi ici est celui que l’IA annonce au téléphone et qui s’affiche en haut de la file.</div>';
    }

    function majCharge(k){
      etat.charge = k;
      const c = D.CHARGES[k];
      if (k === 'stop'){
        etat.reprise = hhmm(new Date(Date.now() + 30 * 60000));
        api.toast('Commandes stoppées — l’IA annonce une reprise à ' + etat.reprise + '.');
      } else {
        etat.reprise = null;
        etat.delaiRetrait = c.delai;
        etat.delaiLivraison = c.delai + 20;
        api.toast(c.nom + ' — l’IA annonce ' + c.delai + ' min au retrait, ' + (c.delai + 20) + ' min en livraison.');
      }
      vibrer(10);
      peindreCharge();
    }

    /* ===================================================================== */
    /*  Feuille de détail                                                    */
    /* ===================================================================== */

    function detail(id){
      const c = cmd(id); if (!c) return;
      const E = ETATS[c.etat];
      const bloc = (k, v) => '<div class="ku-det"><span class="k">' + esc(k) + '</span><span class="v">' + v + '</span></div>';
      let html =
        '<div class="row"><span class="chip ' + E.chip + '"><i class="dot"></i>' + esc(E.nom) + '</span>' +
          '<span class="chip">' + (c.mode === 'livraison' ? 'Livraison' : 'Retrait') + '</span>' +
          '<span class="chip mono">reçue ' + esc(c.heure) + '</span></div>' +
        '<div class="grid2">' +
          bloc('Client', esc(c.client || 'en ligne, non communiqué')) +
          bloc('Heure annoncée', esc(c.prete || 'à confirmer')) +
        '</div>';

      if (c.mode === 'livraison'){
        html += bloc('Adresse de livraison', esc(c.adresse || '—')) +
          '<div class="grid3">' +
            bloc('Distance', (c.distanceKm || 0) + ' km') +
            bloc('Frais', fmt.euro(c.frais || 0)) +
            bloc('Zone', (c.distanceKm || 0) <= D.RESTO.livraison.rayonKm ? 'dans les ' + D.RESTO.livraison.rayonKm + ' km' : 'hors zone') +
          '</div>' +
          bloc('Paiement au livreur', esc(c.paiement || '—') + ' · à encaisser ' + fmt.euro(c.total + (c.frais || 0)));
      } else {
        html += bloc('Encaissement', 'Sur place au comptoir · ' + fmt.euro(c.total));
      }

      html += '<div class="sec"><div class="sec-head"><h3>Commande</h3>' +
          '<span class="mono">' + fmt.euro(c.total + (c.frais || 0)) + '</span></div>' +
          (c.lignes.length ? lignes(c) : '<div class="ku-opt">Panier encore vide — l’IA est en ligne.</div>') +
        '</div>';

      if (c.etat === 'attente')
        html += '<div class="note warn">Panier provisoire : <b>aucun ticket de préparation</b> tant que le client n’a pas confirmé. ' +
          'Il reste ' + fmt.horloge(Math.ceil(c.reste)) + '.</div>';
      if (c.etat === 'appel')
        html += '<div class="note info">L’IA est en ligne depuis ' + fmt.horloge(c.depuis) + '. Ne rien préparer tant que la confirmation n’est pas acquise.</div>';
      if (c.etat === 'expiree')
        html += '<div class="note bad">' + esc(c.motif || 'Expirée') + '. Cette commande n’est jamais mêlée aux commandes actives.</div>';
      html += '<div class="note">' + esc(D.REGLES.paiement) + '</div>';

      let act = null;
      if (c.etat === 'confirmee') act = { a:'commencer', t:'Commencer la préparation', cl:'ok' };
      else if (c.etat === 'preparation') act = { a:'prete', t:c.mode === 'livraison' ? 'Prête pour livreur' : 'Prête', cl:'' };
      else if (c.etat === 'prete') act = { a:'fin', t:c.mode === 'livraison' ? 'Livrée' : 'Récupérée', cl:'ok' };
      if (act) html += '<button class="cta ' + act.cl + '" data-sheetact="' + act.a + '">' + ico('check') + act.t + '</button>';

      api.sheet('Commande #' + c.id, html, body => {
        const b = body.querySelector('[data-sheetact]');
        if (b) b.addEventListener('click', () => { api.fermerSheet(); executer(b.dataset.sheetact, c.id); });
      });
    }

    function executer(action, id){
      const c = cmd(id); if (!c) return;
      if (action === 'commencer') avancer(id, 'preparation', 'Commande #' + id + ' en préparation.');
      else if (action === 'prete') avancer(id, 'prete',
        'Commande #' + id + (c.mode === 'livraison' ? ' prête pour le livreur.' : ' prête au comptoir.'), true);
      else if (action === 'fin') avancer(id, 'terminee',
        'Commande #' + id + (c.mode === 'livraison' ? ' livrée.' : ' récupérée.') + ' Retirée de l’écran.');
    }

    /* ===================================================================== */
    /*  Peinture et écouteurs                                                */
    /* ===================================================================== */

    function peindre(){
      if (etat.tab === 'file') peindreFile();
      else if (etat.tab === 'tickets') peindreTickets();
      else if (etat.tab === 'ruptures') peindreRuptures();
      else peindreCharge();
    }

    /* --- file --- */
    on(content, '[data-filtre]', 'click', (ev, b) => {
      etat.filtre = b.dataset.filtre; vibrer(5); peindreFile();
    });
    on(content, '[data-son]', 'click', () => {
      etat.opt.son = !etat.opt.son;
      api.toast(etat.opt.son ? 'Alerte sonore activée — un bip par commande confirmée.' : 'Alerte sonore coupée.');
      if (etat.opt.son) bip(true);
      peindreFile();
    });
    on(content, '[data-act]', 'click', (ev, b) => {
      const id = +b.dataset.id, a = b.dataset.act;
      if (a === 'detail') return detail(id);
      if (a === 'ticket'){
        etat.ticket = id; etat.ticketModif = false; etat.tab = 'tickets';
        majNav(); peindre();
        apres(() => { const btn = content.querySelector('[data-imprimer]'); if (btn) btn.click(); }, 260);
        return;
      }
      if (a === 'effacer'){
        const carteEl = content.querySelector('[data-cmd="' + id + '"]');
        const fin = () => {
          const i = cmds.findIndex(x => x.id === id);
          if (i >= 0) cmds.splice(i, 1);
          api.toast('Commande #' + id + ' retirée de l’écran.');
          peindreFile();
        };
        if (carteEl && !reduit()){ carteEl.classList.add('is-out'); apres(fin, 260); } else fin();
        return;
      }
      executer(a, id);
    });

    /* --- tickets --- */
    on(content, '[data-ticket]', 'click', (ev, b) => {
      etat.ticket = +b.dataset.ticket; etat.ticketModif = false; peindreTickets();
    });
    on(content, '[data-imprimer]', 'click', () => {
      const c = cmd(etat.ticket); if (!c) return;
      const printer = content.querySelector('[data-printer]');
      const paper = content.querySelector('[data-paper]');
      if (!printer || !paper) return;
      const cle = c.id + (etat.ticketModif ? '-modif' : '');
      vibrer(14);
      imprimer(printer, paper, () => {
        etat.imprimes.add(String(cle));
        c.ticketImprime = true;
        api.toast((etat.ticketModif ? 'Ticket de modification' : 'Ticket') + ' #' + c.id + ' imprimé.');
        peindreTickets();
      });
    });
    on(content, '[data-modif]', 'click', () => {
      const c = cmd(etat.ticket); if (!c) return;
      etat.ticketModif = !etat.ticketModif;
      peindreTickets();
      if (etat.ticketModif) api.toast('Ticket de modification : l’ancien ticket de #' + c.id + ' est annulé.');
    });
    on(content, '[data-sw]', 'click', (ev, b) => {
      const k = b.dataset.sw;
      etat.opt[k] = !etat.opt[k];
      b.setAttribute('aria-checked', etat.opt[k] ? 'true' : 'false');
      vibrer(6);
      const noms = { son:'Alerte sonore', auto:'Impression automatique',
                     modifs:'Impression des modifications', annul:'Impression des annulations' };
      api.toast(noms[k] + (etat.opt[k] ? ' : activée.' : ' : désactivée.'));
      if (k === 'son' && etat.opt.son) bip(true);
    });
    on(content, '[data-imp]', 'click', (ev, b) => {
      etat.opt.imprimante = b.dataset.imp;
      const p = IMPRIMANTES.find(x => x.id === b.dataset.imp);
      api.toast(p.id === 'pack'
        ? 'Pack imprimante Resto IA — 79 €, livré configuré si le restaurant n’a rien.'
        : p.nom + ' sélectionnée (' + p.via + ').');
      peindreTickets();
    });
    on(content, '[data-test]', 'click', () => {
      const printer = content.querySelector('[data-testprinter]');
      const paper = content.querySelector('[data-testpaper]');
      if (!printer || !paper) return;
      printer.hidden = false;
      vibrer(10);
      imprimer(printer, paper, () => api.toast('Test terminé : liaison, papier et coupe en ordre.'));
    });

    /* --- ruptures --- */
    on(content, '[data-rupt]', 'click', (ev, b) => {
      const cle = b.dataset.rupt;
      const ko = ruptures.has(cle);
      if (ko) ruptures.delete(cle); else ruptures.add(cle);
      b.setAttribute('aria-checked', ko ? 'true' : 'false');
      const ligne = b.closest('[data-ligne]');
      if (ligne) ligne.classList.toggle('is-off', !ko);
      majCompteur();
      vibrer(8);
      const nom = ligne ? ligne.querySelector('.ku-rnom').textContent.replace(' top','').trim() : cle;
      api.toast(ko
        ? nom + ' de nouveau disponible — l’IA le propose dès le prochain appel.'
        : nom + ' en rupture — effet immédiat, les commandes confirmées sont intouchées.');
    });
    on(content, '[data-cat]', 'click', (ev, b) => {
      const cat = D.MENU.find(c => c.id === b.dataset.cat); if (!cat) return;
      const off = cat.items.every(i => ruptures.has('p:' + i.id));
      cat.items.forEach(i => { if (off) ruptures.delete('p:' + i.id); else ruptures.add('p:' + i.id); });
      vibrer(14);
      api.toast(off ? 'Catégorie « ' + cat.nom + ' » rétablie.' : 'Catégorie « ' + cat.nom + ' » arrêtée d’un coup.');
      peindreRuptures();
    });

    /* --- charge --- */
    on(content, '[data-charge]', 'click', (ev, b) => majCharge(b.dataset.charge));
    on(content, '[data-delai]', 'click', (ev, b) => {
      const p = b.dataset.delai.split(':'), d = +p[1];
      if (p[0] === 'retrait') etat.delaiRetrait = Math.max(5, Math.min(90, etat.delaiRetrait + d));
      else etat.delaiLivraison = Math.max(10, Math.min(120, etat.delaiLivraison + d));
      const n = content.querySelector(p[0] === 'retrait' ? '[data-dr]' : '[data-dl]');
      if (n) n.textContent = (p[0] === 'retrait' ? etat.delaiRetrait : etat.delaiLivraison) + '′';
      vibrer(5);
      api.toast('L’IA annoncera ' + (p[0] === 'retrait' ? etat.delaiRetrait + ' min au retrait.' : etat.delaiLivraison + ' min en livraison.'));
    });
    on(content, '[data-cap]', 'click', (ev, b) => {
      if (!b.dataset.cap || b.tagName !== 'BUTTON') return;
      etat.capacite = Math.max(2, Math.min(40, etat.capacite + (+b.dataset.cap)));
      const n = content.querySelector('b[data-cap]');
      if (n) n.textContent = etat.capacite;
      vibrer(5);
      api.toast('Capacité maximale : ' + etat.capacite + ' commandes en parallèle.');
    });
    on(content, '[data-stop]', 'click', () => majCharge(etat.charge === 'stop' ? 'rush' : 'stop'));
    on(content, '[data-plus15]', 'click', () => {
      etat.reprise = hhmm(new Date(Date.now() + 45 * 60000));
      const n = content.querySelector('[data-rep]');
      if (n) n.textContent = etat.reprise;
      api.toast('Reprise repoussée : l’IA annonce ' + etat.reprise + '.');
    });

    /* ------------------------------ démarrage ------------------------------ */
    peindre();
    majBadge();
    tick = setInterval(battement, 500);
    apres(() => arrivee(ARRIVAGES[0]), 20000);
    apres(() => arrivee(ARRIVAGES[1]), 62000);

    /* ------------------------------ nettoyage ------------------------------ */
    return function demonter(){
      clearInterval(tick); tick = null;
      tos.forEach(id => clearTimeout(id)); tos.clear();
      if (rafId) cancelAnimationFrame(rafId);
      if (audio){ try { audio.close(); } catch(e){} audio = null; }
    };
  }
};
