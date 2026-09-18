/* =========================================================================
   Resto IA — runtime.
   Il fait trois choses, et rien de plus : afficher l'écran d'accueil du
   téléphone, ouvrir une application dans une scène vide, ranger ses
   minuteurs à la fermeture.

   Changement de fond par rapport à la version précédente : le runtime
   n'impose plus aucun chrome. Il n'y a plus de barre de titre, plus de
   barre d'onglets, plus de barre d'action communes. Chaque application
   dessine la totalité de son écran et charge sa propre feuille de style.
   C'est ce qui permet à la cuisine, au gérant et au commercial de ne
   partager aucun composant.
   ========================================================================= */
var RIA = (function(){
  "use strict";

  var $ = function(i){ return document.getElementById(i); };
  var esc = function(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };
  var eur = function(c){ return (c/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + " €"; };
  var eur0 = function(c){ return Math.round(c/100).toLocaleString('fr-FR') + " €"; };
  var dur = function(s){ return s < 60 ? s + " s" : Math.floor(s/60) + " min " + String(s%60).padStart(2,"0"); };
  var chrono = function(s){ return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(Math.floor(s)%60).padStart(2,"0"); };
  var norm = function(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); };
  var vibrer = function(ms){ try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch(e){} };
  var reduit = function(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  var APPS = [], courante = null, timers = [], toastT = null;

  function register(a){ APPS.push(a); }
  function every(fn, ms){ var id = setInterval(fn, ms); timers.push(id); return id; }
  function after(fn, ms){ var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers(){
    for (var i = 0; i < timers.length; i++){ clearInterval(timers[i]); clearTimeout(timers[i]); }
    timers = [];
  }

  /* ------------------ mise à l'échelle du châssis ------------------ */
  function ajuster(){
    var d = $("device");
    var large = d.offsetWidth, haut = d.offsetHeight;
    var dispoW = window.innerWidth - 32;
    var dispoH = window.innerHeight - 92;
    var k = Math.min(dispoW / large, dispoH / haut, 1);
    d.style.setProperty("--k", k.toFixed(3));
  }
  window.addEventListener("resize", ajuster);

  /* Le châssis change de taille avec une transition : une seule mesure
     donnerait l'ancienne largeur et laisserait la tablette déborder sur un
     petit écran. On réajuste donc pendant toute la durée de la transition. */
  function format(f){
    $("device").dataset.format = f || "phone";
    var t0 = Date.now();
    (function boucle(){
      ajuster();
      if (Date.now() - t0 < 520) requestAnimationFrame(boucle);
    })();
  }

  /* ------------------------ horloge de la barre ------------------------ */
  function heure(){
    var d = new Date();
    return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  }
  function tick(){
    var n = document.querySelectorAll("[data-clock]");
    for (var i = 0; i < n.length; i++) n[i].textContent = heure();
  }

  /* --------------------------- écran d'accueil --------------------------- */
  var DECO = [
    { l:"Photos",   bg:"linear-gradient(145deg,#F5A05E,#D6497C 52%,#8B3EB4)", d:'<rect x="3" y="7" width="18" height="13" rx="3.5"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8.5 7 10 4h4l1.5 3"/>' },
    { l:"Éclair",   bg:"linear-gradient(145deg,#FFE773,#F2C009)", k:"#2B2103", d:'<path d="M5 20V10a7 7 0 0 1 14 0v10l-2.3-2-2.3 2-2.4-2-2.4 2z"/><path d="M9.5 10h.01M14.5 10h.01"/>' },
    { l:"Messages", bg:"linear-gradient(145deg,#6BDC86,#1FA84E)", k:"#04220F", d:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>' },
    { l:"Musique",  bg:"linear-gradient(145deg,#FA8B8B,#C62F47)", d:'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>' },
    { l:"Plans",    bg:"linear-gradient(145deg,#86DCB0,#3F8FD4 72%)", d:'<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>' },
    { l:"Météo",    bg:"linear-gradient(145deg,#88C0F0,#2F6FB5)", d:'<path d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.6 1.4A3.6 3.6 0 0 1 17.5 18z"/>' },
    { l:"Mail",     bg:"linear-gradient(145deg,#9CCBF3,#2D6FC4)", d:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/>' },
    { l:"Vidéo",    bg:"linear-gradient(145deg,#33333B,#121217)", d:'<rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 11 6-3.5v9L15 13z"/>' },
    { l:"Réglages", bg:"linear-gradient(145deg,#77736B,#3A3833)", d:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"/>' }
  ];
  var DOCK = [
    { l:"Téléphone", bg:"linear-gradient(145deg,#6BDC86,#1C9C48)", k:"#04220F", d:'<path d="M6.6 3.5 4 6.1c-.7.7-.9 1.8-.5 2.7a20 20 0 0 0 11.7 11.7c.9.4 2 .2 2.7-.5l2.6-2.6-4.2-2.8-2 1.6a15 15 0 0 1-6.5-6.5l1.6-2z"/>' },
    { l:"Messages",  bg:"linear-gradient(145deg,#88C0F0,#2F6FB5)", d:'<path d="M4 5h16v11H9l-5 4z"/>' },
    { l:"Notes",     bg:"linear-gradient(145deg,#F6EDC0,#DCBB4E)", k:"#251D06", d:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>' },
    { l:"Appareil",  bg:"linear-gradient(145deg,#B9BEC6,#6E747E)", k:"#15171B", d:'<rect x="3" y="7" width="18" height="13" rx="3.5"/><circle cx="12" cy="13.5" r="3.6"/>' }
  ];

  function tuile(o, id){
    return '<div class="happ' + (id ? '' : ' deco') + '">' +
      '<button ' + (id ? 'data-app="' + id + '"' : 'data-deco="' + esc(o.l) + '"') + ' aria-label="' + esc(o.l) + '">' +
        '<span class="ic" style="background:' + o.bg + ';color:' + (o.k || "#fff") + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + o.d + '</svg>' +
          (o.b ? '<span class="bdg">' + esc(o.b) + '</span>' : '') +
        '</span>' +
      '</button>' +
      '<span class="lb">' + esc(o.l) + '</span></div>';
  }

  function peindreAccueil(){
    $("hgrid").innerHTML =
      APPS.map(function(a){ return tuile({ l:a.nom, bg:a.fond, k:a.encre, d:a.glyph, b:a.badge }, a.id); }).join("") +
      DECO.map(function(o){ return tuile(o); }).join("");
    $("hdock").innerHTML = DOCK.map(function(o){ return tuile(o); }).join("");
  }

  /* ----------------------- ouverture d'une application ----------------------- */
  var cssCharge = {};
  function charger(app, pret){
    if (!app.css || cssCharge[app.id]) return pret();
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "src/" + app.css;
    l.onload = pret; l.onerror = pret;
    document.head.appendChild(l);
    cssCharge[app.id] = true;
  }

  function ouvrir(id){
    var app = APPS.filter(function(a){ return a.id === id; })[0];
    if (!app || courante) return;
    vibrer(10);
    charger(app, function(){
      courante = app;
      format(app.format || "phone");
      document.documentElement.dataset.app = id;

      var scene = document.createElement("div");
      scene.className = "scene";
      scene.id = "scene";
      scene.dataset.app = id;
      $("glass").insertBefore(scene, $("homebar"));
      $("home").classList.add("away");

      try { app.demonter = app.monter(scene, api(app)) || null; }
      catch(e){
        console.error("[" + id + "]", e);
        scene.innerHTML = '<div style="padding:26px;color:#fff;font:14px/1.6 Inter,sans-serif">' +
          "Cette application n'a pas pu se charger.<br><span style=\"opacity:.6\">" + esc(e.message) + "</span></div>";
      }
    });
  }

  function fermer(){
    if (!courante) return;
    clearTimers();
    try { if (typeof courante.demonter === "function") courante.demonter(); } catch(e){ console.error(e); }
    courante.demonter = null;
    courante = null;
    delete document.documentElement.dataset.app;
    var s = $("scene");
    if (s) s.remove();
    $("home").classList.remove("away");
    format("phone");
    vibrer(6);
  }

  /* --------------------------- toast système --------------------------- */
  function toast(msg, ms){
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function(){ t.classList.remove("on"); }, ms || 2600);
  }

  /* ------------------ ce qu'une application reçoit ------------------ */
  function api(app){
    return {
      data:D, esc:esc, eur:eur, eur0:eur0, dur:dur, chrono:chrono, norm:norm, heure:heure,
      toast:toast, fermer:fermer, vibrer:vibrer, reduit:reduit,
      every:every, after:after,
      badge:function(n){
        app.badge = n;
        var b = document.querySelector('[data-app="' + app.id + '"] .bdg');
        if (n && b) b.textContent = n;
        else if (n && !b){
          var ic = document.querySelector('[data-app="' + app.id + '"] .ic');
          if (ic) ic.insertAdjacentHTML("beforeend", '<span class="bdg">' + esc(n) + '</span>');
        } else if (!n && b) b.remove();
      },
      ouvrir:function(autre){ fermer(); setTimeout(function(){ ouvrir(autre); }, 260); }
    };
  }

  /* ------------------------------ démarrage ------------------------------ */
  function boot(){
    peindreAccueil();
    tick(); setInterval(tick, 15000);
    ajuster();
    format("phone");

    $("hgrid").addEventListener("click", function(ev){
      var b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.app) ouvrir(b.dataset.app);
      else toast("« " + b.dataset.deco + " » est une icône de décor.");
    });
    $("hdock").addEventListener("click", function(ev){
      var b = ev.target.closest("button");
      if (b) toast("« " + b.dataset.deco + " » est une icône de décor.");
    });
    $("homebar").addEventListener("click", fermer);
    document.addEventListener("keydown", function(ev){ if (ev.key === "Escape") fermer(); });
  }

  return { boot:boot, register:register, ouvrir:ouvrir, fermer:fermer, toast:toast, ajuster:ajuster };
})();
