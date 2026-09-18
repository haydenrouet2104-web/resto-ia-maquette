/* =========================================================================
   Resto IA — application CUISINE.
   Direction C validée : « Tableau de production ».

   Un seul tableau, des filets horizontaux, des minuteurs géants alignés en
   colonne et un bouton plein en bout de ligne. Écran fixe en paysage : on le
   lit à deux mètres et on le touche avec les mains grasses, donc pas de
   petites cibles et le moins de défilement possible.

   ES5 strict. Toutes les classes commencent par k-. Voir src/cuisine.css.
   ========================================================================= */
(function(){
  "use strict";

  var api, root, D_;
  var vue = "service";
  var filtre = "tout";
  var son = true;
  var charge = "rush";
  var cmds = [];           /* copie de travail : on ne mute jamais D.commandes */
  var ouverte = null;      /* commande affichée en plein écran */
  var horloge = "";
  var audio = null;
  var imprimes = {};
  var ticketModif = false;
  var rupt = {};           /* id produit → true si en rupture */
  var catOff = {};
  var delaiRetrait = 15, delaiLivraison = 35, capacite = 12;
  var nouvelles = 0;

  /* ------------------------------ états ------------------------------ */
  var ETATS = {
    appel:       { lbl:"IA en ligne",     suite:null,        bouton:null },
    attente:     { lbl:"À confirmer",     suite:null,        bouton:null },
    confirmee:   { lbl:"À préparer",      suite:"preparation", bouton:"Commencer" },
    preparation: { lbl:"En préparation",  suite:"prete",     bouton:null },
    prete:       { lbl:"Prête",           suite:"terminee",  bouton:null },
    terminee:    { lbl:"Terminée",        suite:null,        bouton:null },
    expiree:     { lbl:"Expirée",         suite:null,        bouton:null }
  };
  var FILTRES = [
    { id:"tout",   lbl:"Tout",       test:function(c){ return c.etat !== "terminee"; } },
    { id:"faire",  lbl:"À préparer", test:function(c){ return c.etat === "confirmee"; } },
    { id:"cours",  lbl:"En cours",   test:function(c){ return c.etat === "preparation"; } },
    { id:"pretes", lbl:"Prêtes",     test:function(c){ return c.etat === "prete"; } },
    { id:"fin",    lbl:"Terminées",  test:function(c){ return c.etat === "terminee" || c.etat === "expiree"; } }
  ];
  var VUES = [
    { id:"service",  lbl:"Service" },
    { id:"tickets",  lbl:"Impression" },
    { id:"ruptures", lbl:"Ruptures" },
    { id:"rythme",   lbl:"Rythme" }
  ];

  /* ------------------------------ utilitaires ------------------------------ */
  function esc(s){ return api.esc(s); }
  function eur(c){ return api.eur(c); }
  function niveau(){
    for (var i = 0; i < D_.charges.length; i++) if (D_.charges[i].id === charge) return D_.charges[i];
    return D_.charges[0];
  }
  function compte(f){
    var n = 0;
    for (var i = 0; i < cmds.length; i++) if (f.test(cmds[i])) n++;
    return n;
  }
  function aPreparer(){
    var n = 0;
    for (var i = 0; i < cmds.length; i++) if (cmds[i].etat === "confirmee" || cmds[i].etat === "preparation") n++;
    return n;
  }
  /* D.commandes[].total inclut déjà les frais de livraison : ne pas les ajouter. */
  function total(c){ return c.total; }

  function bip(){
    if (!son) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      var t = audio.currentTime;
      [880, 1320].forEach(function(f, i){
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = "square"; o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t + i*.12);
        g.gain.exponentialRampToValueAtTime(.16, t + i*.12 + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + i*.12 + .1);
        o.connect(g); g.connect(audio.destination);
        o.start(t + i*.12); o.stop(t + i*.12 + .12);
      });
    } catch(e){}
  }

  /* --------------------------- rendu : en-tête --------------------------- */
  function head(){
    var lv = niveau();
    return '<div class="k-head">' +
      '<div class="k-brand">' + esc(D_.resto.nom) + '</div>' +
      '<div class="k-meta">' +
        '<span class="' + (charge === "stop" ? "off" : (charge === "normal" ? "on" : "al")) + '">' + esc(lv.nom) + '</span>' +
        '<i>·</i><span>' + (lv.delai ? lv.delai + " min annoncées" : "reprise 21h15") + '</span>' +
        '<i>·</i><span>' + aPreparer() + ' en production</span>' +
        '<i>·</i><button data-son>' + (son ? "Alerte sonore" : '<span class="off">Alerte coupée</span>') + '</button>' +
      '</div>' +
      '<div class="k-clock k-mono" data-hor>' + esc(horloge) + '</div>' +
    '</div>' +
    '<div class="k-nav">' +
      VUES.map(function(v){
        return '<button data-vue="' + v.id + '" class="' + (vue === v.id ? "on" : "") + '">' + esc(v.lbl) + '</button>';
      }).join("") +
      '<span class="k-navr">' + esc(D_.resto.adresse) + '</span>' +
    '</div>';
  }

  /* --------------------------- rendu : le tableau --------------------------- */
  function ligneMinuteur(c){
    if (c.etat === "attente"){
      var r = Math.max(0, c.reste | 0);
      return '<u class="k-amb">' + api.chrono(r) + '</u><small>expire</small>';
    }
    if (c.etat === "preparation"){
      var d = c.depuis | 0;
      var trop = d > (c.mode === "livraison" ? delaiLivraison : delaiRetrait) * 60;
      return '<u class="' + (trop ? "k-amb" : "") + '">' + api.chrono(d) + '</u><small>en cuisson</small>';
    }
    if (c.etat === "prete") return '<u class="k-rdy">' + esc(c.prete || "—") + '</u><small>à remettre</small>';
    if (c.etat === "appel") return '<u>' + api.chrono(c.depuis | 0) + '</u><small>en ligne</small>';
    if (c.etat === "expiree") return '<u class="k-strike">00:00</u><small>sans validation</small>';
    if (c.etat === "terminee") return '<u>' + esc(c.prete || "") + '</u><small>servie</small>';
    return '<u>' + esc(c.prete || "—") + '</u><small>annoncée</small>';
  }

  function ligneAction(c){
    if (c.etat === "confirmee")
      return '<button class="k-btn" data-go="' + c.id + '">Commencer</button>';
    if (c.etat === "preparation")
      return '<button class="k-btn amb" data-go="' + c.id + '">' +
        (c.mode === "livraison" ? "Prête pour livreur" : "Prête au comptoir") + '</button>';
    if (c.etat === "prete")
      return '<button class="k-btn rdy" data-go="' + c.id + '">' +
        (c.mode === "livraison" ? "Livrée" : "Récupérée") + '</button>';
    if (c.etat === "attente") return '<div class="k-hold">Ne rien<br>préparer</div>';
    if (c.etat === "appel")   return '<div class="k-hold">Commande<br>en cours</div>';
    return '<div class="k-hold">—</div>';
  }

  function ligne(c){
    var e = ETATS[c.etat];
    var mort = (c.etat === "expiree" || c.etat === "terminee" || c.etat === "attente" || c.etat === "appel");
    var contenu = c.lignes.length
      ? c.lignes.map(function(l){ return l.q + "× " + l.nom; }).join(", ")
      : "prise de commande en cours";
    var detail = c.lignes.length
      ? c.lignes.map(function(l){ return [l.opt, l.sup ? "+ " + l.sup : "", l.dem].filter(Boolean).join(" · "); })
          .filter(Boolean).join("  ·  ")
      : "aucun produit tant que le client n'a pas confirmé";

    return '<div class="k-row' + (mort ? " k-dim" : "") + '" data-open="' + c.id + '" role="button" tabindex="0">' +
      '<span class="k-n k-mono">' + c.id + '</span>' +
      '<span class="k-c"><b>' + esc(contenu) + '</b><span>' + esc(detail || "—") + '</span></span>' +
      '<span class="k-m">' + (c.mode === "livraison" ? "Livraison" : "Retrait") +
        '<small>' + esc(c.client || "—") + '</small></span>' +
      '<span class="k-t">' + ligneMinuteur(c) + '</span>' +
      '<span class="k-a">' + ligneAction(c) + '</span>' +
    '</div>';
  }

  function vueService(){
    var f = FILTRES.filter(function(x){ return x.id === filtre; })[0] || FILTRES[0];
    var liste = cmds.filter(f.test);

    /* les non confirmées et les expirées ne se mélangent jamais au travail */
    if (filtre === "tout"){
      var rang = { confirmee:0, preparation:1, prete:2, appel:3, attente:4, expiree:5 };
      liste.sort(function(a, b){ return (rang[a.etat] | 0) - (rang[b.etat] | 0) || a.id - b.id; });
    }

    return '<div class="k-filt">' +
      FILTRES.map(function(x){
        return '<button data-filt="' + x.id + '" class="' + (filtre === x.id ? "on" : "") + '">' +
          esc(x.lbl) + '<em>' + compte(x) + '</em></button>';
      }).join("") +
    '</div>' +
    '<div class="k-cols">' +
      '<span style="width:104px">N°</span>' +
      '<span style="flex:1">Commande</span>' +
      '<span style="width:130px">Mode</span>' +
      '<span style="width:186px;text-align:right;padding-right:24px">Minuteur</span>' +
      '<span style="width:178px"></span>' +
    '</div>' +
    '<div class="k-body">' +
      (liste.length ? liste.map(ligne).join("")
        : '<div class="k-empty">Rien dans cette file.</div>') +
    '</div>';
  }

  /* ------------------------------ ticket ------------------------------ */
  function ticket(c){
    if (!c) return "Aucune commande confirmée : rien à imprimer.";
    var l = [];
    l.push("      " + D_.resto.nom.toUpperCase());
    l.push("   " + D_.resto.adresse);
    l.push("================================");
    if (ticketModif){
      l.push("** MODIFICATION COMMANDE #" + c.id + " **");
    } else {
      l.push("COMMANDE #" + c.id + "        " + (c.mode === "livraison" ? "LIVRAISON" : "RETRAIT"));
    }
    l.push("Recue     " + (c.heure || "--:--"));
    l.push("Annoncee  " + (c.prete || "--:--"));
    l.push("Client    " + (c.client || "-"));
    l.push("--------------------------------");
    if (ticketModif){
      l.push("RETIRER : CHEDDAR         -1,00");
      l.push("AJOUTER : SAUCE A PART");
      l.push("--------------------------------");
      l.push("NOUVEAU TOTAL              9,50");
    } else {
      c.lignes.forEach(function(x){
        l.push(x.q + "x " + x.nom.toUpperCase());
        if (x.opt) l.push("   " + x.opt);
        if (x.sup) l.push("   + " + x.sup);
        if (x.dem) l.push("   ! " + x.dem);
      });
      l.push("--------------------------------");
      l.push("TOTAL                    " + (total(c)/100).toFixed(2).replace(".", ","));
      if (c.mode === "livraison") l.push("dont frais " + (c.frais/100).toFixed(2).replace(".", ",") + " - " + c.paiement);
      else l.push("A REGLER SUR PLACE");
    }
    l.push("================================");
    l.push(ticketModif ? " Le ticket precedent est annule"
                       : " Commande confirmee par le client");
    l.push(" Prise par assistant vocal - IA");
    return l.join("\n");
  }

  function vueTickets(){
    var c = cmds.filter(function(x){ return x.etat === "confirmee" || x.etat === "preparation"; })[0]
         || cmds.filter(function(x){ return x.lignes.length; })[0];
    var imp = c && imprimes[c.id];
    var reglages = [
      { k:"Alerte sonore",        v:son ? "Active" : "Coupée",            a:"son" },
      { k:"Impression auto",      v:"Commandes confirmées",               a:"auto" },
      { k:"Modifications",        v:"Imprimées",                          a:"mod" },
      { k:"Annulations",          v:"Non imprimées",                      a:"ann" },
      { k:"Imprimante",           v:"Epson TM-m30 · comptoir",            a:"imp" },
      { k:"Test",                 v:"Envoyer une ligne de test",          a:"test" }
    ];
    return '<div class="k-pane">' +
      '<div class="k-colL">' +
        '<div class="k-lbl">Réglages d\'impression<em>ESC/POS</em></div>' +
        reglages.map(function(r){
          return '<button class="k-r" data-reg="' + r.a + '">' +
            '<span class="k">' + esc(r.k) + '</span>' +
            '<span class="v">' + esc(r.v) + '</span>' +
            '<span class="s">Changer</span></button>';
        }).join("") +
        '<div class="k-note">Le restaurant n\'a pas d\'imprimante ? <b>Pack imprimante 79 €</b>. ' +
          'Pour une micro-structure, le ticket part en SMS ou WhatsApp au gérant.</div>' +
      '</div>' +
      '<div class="k-colR">' +
        '<div class="k-lbl">' + (ticketModif ? "Ticket de modification" : "Ticket de préparation") +
          '<em>' + (c ? "#" + c.id : "—") + '</em></div>' +
        '<div class="k-acts">' +
          '<button class="k-btn" data-print>' + (imp ? "Réimprimer le ticket" : "Imprimer le ticket") + '</button>' +
          '<button class="k-btn2' + (ticketModif ? " on" : "") + '" data-modif>Ticket de modification</button>' +
        '</div>' +
        (ticketModif ? '<div class="k-note amb">' + esc(D_.regles.modification) + '</div>' : '') +
        '<div class="k-tkwrap"><div class="k-tk">' + esc(ticket(c)) + '</div></div>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------ ruptures ------------------------------ */
  function vueRuptures(){
    var off = 0, i, j;
    for (i = 0; i < D_.menu.length; i++)
      for (j = 0; j < D_.menu[i].items.length; j++)
        if (rupt[D_.menu[i].items[j].id] || catOff[D_.menu[i].cat]) off++;

    return '<div class="k-pane">' +
      '<div class="k-colL">' +
        '<div class="k-lbl">Catégories<em>' + D_.menu.length + '</em></div>' +
        D_.menu.map(function(c){
          return '<button class="k-r' + (catOff[c.cat] ? " off" : "") + '" data-cat="' + esc(c.cat) + '">' +
            '<span class="k">' + c.items.length + ' produits</span>' +
            '<span class="v">' + esc(c.cat) + '</span>' +
            '<span class="s' + (catOff[c.cat] ? "" : " rdy") + '">' + (catOff[c.cat] ? "Arrêtée" : "En carte") + '</span>' +
          '</button>';
        }).join("") +
        '<div class="k-note">Une rupture s\'applique <b>immédiatement aux nouveaux appels</b>. ' +
          'Elle ne touche jamais une commande déjà confirmée.</div>' +
      '</div>' +
      '<div class="k-colR">' +
        '<div class="k-lbl">Ce que l\'IA ne propose plus<em>' + off + ' produits</em></div>' +
        D_.menu.map(function(cat){
          return cat.items.map(function(it){
            var ko = rupt[it.id] || catOff[cat.cat];
            var alt = cat.items.filter(function(x){ return x.id !== it.id && !rupt[x.id] && !catOff[cat.cat]; })[0];
            return '<button class="k-r' + (ko ? " off" : "") + '" data-rupt="' + it.id + '">' +
              '<span class="k">' + esc(cat.cat) + '</span>' +
              '<span class="v">' + esc(it.nom) +
                (ko && alt ? '<small>l\'IA proposera : ' + esc(alt.nom) + '</small>' : '') + '</span>' +
              '<span class="s' + (ko ? " amb" : " rdy") + '">' + (ko ? "En rupture" : "Disponible") + '</span>' +
            '</button>';
          }).join("");
        }).join("") +
      '</div>' +
    '</div>';
  }

  /* ------------------------------- rythme ------------------------------- */
  function vueRythme(){
    var lv = niveau();
    return '<div class="k-pane">' +
      '<div class="k-colL">' +
        '<div class="k-lbl">Niveau de service<em>manuel</em></div>' +
        D_.charges.map(function(c){
          return '<button class="k-r' + (charge === c.id ? " sel" : "") + '" data-charge="' + c.id + '">' +
            '<span class="k">' + (c.delai ? c.delai + " min" : "arrêt") + '</span>' +
            '<span class="v">' + esc(c.nom) + '</span>' +
            '<span class="s' + (charge === c.id ? " rdy" : "") + '">' + (charge === c.id ? "Actif" : "Choisir") + '</span>' +
          '</button>';
        }).join("") +
        '<div class="k-note">Au lancement le rythme est <b>manuel</b>. Plus tard, l\'IA pourra le ' +
          'recommander selon les commandes en attente — jamais l\'imposer.</div>' +
      '</div>' +
      '<div class="k-colR">' +
        '<div class="k-lbl">Ce que l\'IA dit au client<em>' + esc(lv.nom) + '</em></div>' +
        '<div class="k-note amb"><b>« </b>' + esc(lv.dit) + '<b> »</b></div>' +
        '<div class="k-r"><span class="k">Retrait</span><span class="v">Délai annoncé au comptoir</span>' +
          '<span class="k-step"><button data-d="retrait-">−</button><span class="k-mono">' + delaiRetrait + ' min</span>' +
          '<button data-d="retrait+">+</button></span></div>' +
        '<div class="k-r"><span class="k">Livraison</span><span class="v">Délai annoncé à domicile</span>' +
          '<span class="k-step"><button data-d="liv-">−</button><span class="k-mono">' + delaiLivraison + ' min</span>' +
          '<button data-d="liv+">+</button></span></div>' +
        '<div class="k-r"><span class="k">Capacité</span><span class="v">Commandes simultanées acceptées</span>' +
          '<span class="k-step"><button data-d="cap-">−</button><span class="k-mono">' + capacite + '</span>' +
          '<button data-d="cap+">+</button></span></div>' +
        '<div class="k-acts">' +
          '<button class="k-btn' + (charge === "stop" ? " rdy" : " amb") + '" data-stop>' +
            (charge === "stop" ? "Reprendre les commandes" : "Stopper les commandes") + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* --------------------- détail d'une commande, plein écran --------------------- */
  function overlay(c){
    var liv = c.mode === "livraison";
    var lignes = c.lignes.map(function(l){
      var sous = [l.opt, l.sup ? "+ " + l.sup : ""].filter(Boolean).join(" · ");
      return '<div class="k-li"><span class="q k-mono">' + l.q + '×</span>' +
        '<span class="x"><b>' + esc(l.nom) + '</b>' +
          (sous ? '<small>' + esc(sous) + '</small>' : '') +
          (l.dem ? '<small class="d">' + esc(l.dem) + '</small>' : '') + '</span>' +
        '<span class="p">' + eur(l.prix) + '</span></div>';
    }).join("");

    var infos =
      '<div class="k-r"><span class="k">Client</span><span class="v">' + esc(c.client || "non communiqué") + '</span></div>' +
      '<div class="k-r"><span class="k">Mode</span><span class="v">' + (liv ? "Livraison" : "Retrait au comptoir") +
        (liv ? '<small>' + esc(c.adresse || "") + '</small>' : '') + '</span></div>' +
      (liv ? '<div class="k-r"><span class="k">Distance</span><span class="v"><em>' +
        String(c.km).replace(".", ",") + ' km</em> · frais ' + eur(c.frais) + '</span></div>' : '') +
      '<div class="k-r"><span class="k">Paiement</span><span class="v">' + esc(c.paiement || "—") + '</span></div>' +
      '<div class="k-r"><span class="k">Reçue</span><span class="v"><em>' + esc(c.heure || "—") + '</em>' +
        (c.prete ? ' · annoncée <em>' + esc(c.prete) + '</em>' : '') + '</span></div>' +
      (c.motif ? '<div class="k-note amb">' + esc(c.motif) + '</div>' : '');

    return '<div class="k-over">' +
      '<div class="k-ohead"><button data-close>← Retour au tableau</button>' +
        '<span class="k-clock k-mono" data-hor style="margin-left:auto">' + esc(horloge) + '</span></div>' +
      '<div class="k-hero">' +
        '<span class="l"><b class="k-mono">' + c.id + '</b><span>' + esc(ETATS[c.etat].lbl) + '</span></span>' +
        '<span class="r">' + ligneMinuteur(c) + '</span>' +
      '</div>' +
      infos + lignes +
      '<div class="k-tot">Total de la commande<i>' + eur(total(c)) + '</i></div>' +
      '<div class="k-ofoot">' +
        (ETATS[c.etat].suite
          ? '<button class="k-btn' + (c.etat === "preparation" ? " amb" : (c.etat === "prete" ? " rdy" : "")) +
            '" data-go="' + c.id + '">' + esc(
              c.etat === "confirmee" ? "Commencer" :
              c.etat === "preparation" ? (liv ? "Prête pour livreur" : "Prête au comptoir") :
              (liv ? "Livrée" : "Récupérée")) + '</button>'
          : '<div class="k-hold" style="flex:1">Aucune action : ' + esc(ETATS[c.etat].lbl.toLowerCase()) + '</div>') +
        '<button class="k-btn2" data-ticket="' + c.id + '">Ticket</button>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------- rendu ------------------------------- */
  function peindre(){
    var corps = vue === "service" ? vueService()
              : vue === "tickets" ? vueTickets()
              : vue === "ruptures" ? vueRuptures()
              : vueRythme();
    root.innerHTML = head() + corps + (ouverte ? overlay(ouverte) : "");
    api.badge(aPreparer() ? String(aPreparer()) : 0);
  }

  /* ------------------------------ actions ------------------------------ */
  function avancer(id){
    var c = null, i;
    for (i = 0; i < cmds.length; i++) if (cmds[i].id === id) c = cmds[i];
    if (!c) return;
    var suite = ETATS[c.etat].suite;
    if (!suite){ api.toast("Rien à faire avancer sur la commande " + id + "."); return; }
    c.etat = suite;
    if (suite === "preparation") c.depuis = 0;
    api.vibrer(12);
    api.toast("Commande " + id + " — " + ETATS[suite].lbl.toLowerCase() + ".");
    if (ouverte && ouverte.id === id) ouverte = c;
    peindre();
  }

  function arrive(){
    nouvelles++;
    var base = D_.commandes[2];
    var id = 251 + nouvelles;
    var c = {
      id:id, etat:"confirmee", mode: nouvelles % 2 ? "retrait" : "livraison",
      heure:api.heure(), prete:"20:1" + nouvelles, client: nouvelles % 2 ? "Inès" : "Théo",
      lignes:[{ q:2, nom:"Tacos M", opt:"Poulet · sauce blanche", dem:"", sup:"Cheddar", prix:2100 }],
      total:2100, frais:250, paiement: nouvelles % 2 ? "Sur place" : "Carte au livreur", depuis:0
    };
    if (c.mode === "livraison"){ c.total = 2350; c.km = 1.8; c.adresse = "3 rue Chevreul, 2e étage"; }
    cmds.unshift(c);
    bip();
    api.vibrer(20);
    api.toast("Nouvelle commande " + id + " — confirmée par le client.");
    peindre();
  }

  /* ------------------------------- montage ------------------------------- */
  function monter(scene, a){
    api = a; D_ = a.data;
    charge = D_.resto.charge;
    horloge = api.heure();

    /* copie de travail : les autres applications lisent les mêmes données */
    cmds = D_.commandes.map(function(c){
      var n = {};
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) n[k] = c[k];
      n.lignes = c.lignes.slice();
      n.reste = c.expire || 0;
      n.depuis = c.depuis || (c.etat === "preparation" ? 540 : 0);
      return n;
    });

    root = document.createElement("div");
    root.className = "k-app";
    scene.appendChild(root);
    peindre();

    /* une seconde qui passe : minuteurs, expiration, horloge */
    api.every(function(){
      var bouge = false, i, c;
      for (i = 0; i < cmds.length; i++){
        c = cmds[i];
        if (c.etat === "attente"){
          c.reste = Math.max(0, (c.reste | 0) - 1);
          if (c.reste === 0){ c.etat = "expiree"; c.motif = "Aucune validation du client"; }
          bouge = true;
        } else if (c.etat === "preparation" || c.etat === "appel"){
          c.depuis = (c.depuis | 0) + 1; bouge = true;
        }
      }
      var h = api.heure();
      if (h !== horloge){ horloge = h; bouge = true; }
      if (bouge && !ouverte) peindre();
      else if (bouge && ouverte){
        var n = root.querySelectorAll("[data-hor]");
        for (i = 0; i < n.length; i++) n[i].textContent = horloge;
        peindre();
      }
    }, 1000);

    api.after(arrive, 21000);
    api.after(arrive, 52000);

    root.addEventListener("click", function(ev){
      var t = ev.target;
      if (!t.closest) return;
      var SEL = "[data-go],[data-open],[data-close],[data-vue],[data-filt],[data-son]," +
                "[data-print],[data-modif],[data-reg],[data-rupt],[data-cat],[data-charge]," +
                "[data-stop],[data-ticket],[data-d]";
      var b = t.closest(SEL);
      if (!b) return;
      var d = b.dataset;

      if (d.go !== undefined){ ev.stopPropagation(); avancer(+d.go); return; }
      if (d.open !== undefined && !ouverte){
        var id = +d.open;
        for (var i = 0; i < cmds.length; i++) if (cmds[i].id === id) ouverte = cmds[i];
        peindre(); return;
      }
      if (d.close !== undefined){ ouverte = null; peindre(); return; }
      if (d.vue){ vue = d.vue; ouverte = null; peindre(); return; }
      if (d.filt){ filtre = d.filt; peindre(); return; }
      if (d.son !== undefined){
        son = !son;
        api.toast(son ? "Alerte sonore active." : "Alerte sonore coupée — les commandes arrivent en silence.");
        peindre(); return;
      }
      if (d.print !== undefined){
        var c = cmds.filter(function(x){ return x.etat === "confirmee" || x.etat === "preparation"; })[0];
        if (!c){ api.toast("Rien de confirmé : aucun ticket de préparation."); return; }
        imprimes[c.id] = true;
        api.toast("Envoi ESC/POS vers Epson TM-m30 — commande " + c.id + ".");
        peindre(); return;
      }
      if (d.modif !== undefined){
        ticketModif = !ticketModif;
        api.toast(ticketModif ? "Ticket de modification : le précédent est annulé." : "Retour au ticket de préparation.");
        peindre(); return;
      }
      if (d.reg){
        if (d.reg === "son"){ son = !son; api.toast(son ? "Alerte sonore active." : "Alerte sonore coupée."); }
        else if (d.reg === "test") api.toast("Ligne de test envoyée à l'imprimante du comptoir.");
        else if (d.reg === "imp") api.toast("Imprimante : Epson TM-m30 (comptoir) — seule imprimante appairée.");
        else api.toast("Réglage d'impression modifié.");
        peindre(); return;
      }
      if (d.rupt){
        rupt[d.rupt] = !rupt[d.rupt];
        api.toast(rupt[d.rupt]
          ? "En rupture : l'IA ne le propose plus dès le prochain appel, et propose une alternative."
          : "De nouveau proposé par l'IA.");
        peindre(); return;
      }
      if (d.cat){
        catOff[d.cat] = !catOff[d.cat];
        api.toast(catOff[d.cat] ? "Catégorie « " + d.cat + " » arrêtée." : "Catégorie « " + d.cat + " » de nouveau en carte.");
        peindre(); return;
      }
      if (d.charge){
        charge = d.charge;
        api.toast("Rythme : " + niveau().nom + " — " + niveau().dit);
        peindre(); return;
      }
      if (d.stop !== undefined){
        charge = charge === "stop" ? "rush" : "stop";
        api.toast(charge === "stop"
          ? "Commandes stoppées. L'IA répond encore et annonce une reprise à 21h15."
          : "Commandes rouvertes — délai annoncé " + niveau().delai + " min.");
        peindre(); return;
      }
      if (d.ticket){ ouverte = null; vue = "tickets"; peindre(); return; }
      if (d.d){
        if (d.d === "retrait-") delaiRetrait = Math.max(5, delaiRetrait - 5);
        if (d.d === "retrait+") delaiRetrait = Math.min(90, delaiRetrait + 5);
        if (d.d === "liv-") delaiLivraison = Math.max(10, delaiLivraison - 5);
        if (d.d === "liv+") delaiLivraison = Math.min(120, delaiLivraison + 5);
        if (d.d === "cap-") capacite = Math.max(1, capacite - 1);
        if (d.d === "cap+") capacite = Math.min(40, capacite + 1);
        peindre(); return;
      }
    });

    return function(){
      try { if (audio && audio.close) audio.close(); } catch(e){}
      audio = null;
    };
  }

  RIA.register({
    id:"cuisine", nom:"Cuisine", badge:"2",
    fond:"linear-gradient(145deg,#F5B544,#C8811A)", encre:"#1A1206",
    glyph:'<path d="M4 7h16M4 12h16M4 17h10"/><path d="M19.5 15.5v4"/>',
    format:"tablet",
    css:"cuisine.css",
    monter:monter
  });
})();
