# Maquette — les trois applications dans un téléphone

Maquette interactive de Resto IA : un téléphone à l'écran, un écran d'accueil
avec ses icônes, et **trois applications réellement cliquables** — gérant,
cuisine, commercial. Tout vient du business plan **v1.7**.

Ouvrir : `index.html` en double-clic ne suffit pas (modules ES bloqués par
`file://`). Lancer un serveur local :

```
cd resto-ia/maquette && python3 -m http.server 8080
```

puis `http://localhost:8080`. En ligne : voir « Publication » plus bas.

> **Tu viens modifier la maquette ?** Lis `CONTRIBUER.md` d'abord : il dit
> dans quel dépôt travailler, quel fichier ouvrir pour quel changement, et
> comment publier.

## Architecture

Reprise de l'esprit de `devis60/` : **vanilla HTML/CSS/JS, aucune dépendance,
aucun build, aucun framework**. La différence : ici le code est découpé en
modules ES au lieu d'une chaîne JavaScript unique, précisément parce que
`devis60/src/app-html.js` s'est révélé impossible à éditer sans le casser.

```
index.html              le téléphone : châssis, barre d'état, écran d'accueil
src/theme.css           la couche visuelle commune — c'est ici qu'on change l'apparence
src/phone.js            le runtime : ouverture/fermeture d'app, notifications, feuilles
src/ui.js               helpers partagés (topbar, navbar, sparkline, anneau, compteurs)
src/icons.js            glyphes SVG + icônes de décor de l'écran d'accueil
src/data.js             toutes les données d'exemple, tirées du business plan
src/app-gerant.js       ┐
src/app-cuisine.js      ├ une application = un module = un fichier
src/app-commercial.js   ┘
```

### Contrat d'une application

Chaque module exporte un objet ; `phone.js` fait le reste (animation
d'ouverture depuis l'icône, barre d'accueil, fermeture, nettoyage).

```js
export default {
  id, nom, sousTitre,
  accent,        // couleur de l'app (barre d'onglets, accents)
  fond, encre,   // apparence de l'icône sur l'écran d'accueil
  icone,         // nom d'un glyphe de icons.js
  badge,         // pastille de notification
  css,           // styles de l'app — classes préfixées .gr- / .ku- / .cm-
  monter(win, api) { … return demonter; }
};
```

`api` donne accès à `data`, `fmt`, `ico`, et aux services du téléphone :
`toast`, `notif`, `sheet`, `basculer(idApp)`, `badge(n)`, `fermer`, `vibrer`.

### Conventions

- **L'argent est en centimes entiers**, les durées d'appel en secondes — même
  règle que `resto-ia/supabase/migrations`. Les minutes sont dérivées à
  l'affichage.
- Thème sombre uniquement, largeur utile ~390 px, comme `devis60`.
- Les classes du thème (`.card`, `.cta`, `.chip`, `.seg`, `.switch`, `.note`,
  `.listrow`, `.stagger`…) sont partagées. Une application qui a besoin d'une
  classe à elle la déclare dans son propre `css`, **préfixée**, pour qu'aucune
  application ne puisse repeindre une autre.
- `prefers-reduced-motion` est respecté partout.

## Ce que chaque application montre

| Application | Onglets |
|---|---|
| **Gérant** | Service (charge et chiffres du jour) · Appels (journal + appel en direct rejouable) · Menu (fiches produit, ruptures, import de carte) · Voix (ton, vitesse, voix signature, appel test) · Compte (horaires, livraison, abonnement) |
| **Cuisine** | File (six statuts, comptes à rebours, arrivée de commandes) · Tickets (ESC/POS, impression, modification) · Ruptures · Charge (rush) |
| **Commercial** | Secteur (carte des prospects, tournée) · Prospects (8 statuts, réservation 3 jours, preuves de visite) · Argumentaire · Gains (commissions 7,50 €) |

## Publication — le lien public

La maquette est en ligne ici, et c'est l'adresse à partager :

**https://haydenrouet2104-web.github.io/resto-ia-maquette/**

Elle est servie par le dépôt **public** `haydenrouet2104-web/resto-ia-maquette`,
qui ne contient *que* ce dossier (aucun business plan, aucun autre projet).
Le dépôt privé `hayden-rouet` reste la source de vérité : on édite ici, on
publie là-bas.

### Publier une modification

Depuis la racine du dépôt privé, une fois les changements commités :

```
git remote add public https://github.com/haydenrouet2104-web/resto-ia-maquette.git   # une seule fois
git subtree push --prefix=resto-ia/maquette public main
```

GitHub Pages reconstruit en 30 à 60 secondes ; il suffit ensuite d'actualiser
la page. Aucun workflow GitHub Actions n'est ajouté, et l'intégration Git de
Cloudflare qui déploie `devis60` n'est pas touchée.

### Un domaine à soi

Pour remplacer l'adresse `github.io` par un vrai domaine (`maquette.restoia.fr`
par exemple) : acheter le domaine, puis Settings → Pages → Custom domain sur le
dépôt public. C'est gratuit côté GitHub.

## Reprendre le développement (avec une autre IA)

Tout est en clair, sans build : ouvrir le dossier, éditer, recharger.

- **Changer l'apparence** → `src/theme.css` uniquement. C'est le seul endroit
  qui définit couleurs, typographies et châssis. Ne pas peindre en dur dans
  les applications.
- **Ajouter un écran à une application** → le fichier `src/app-*.js`
  correspondant, rien d'autre. Chaque application est autonome : son CSS est
  dans sa propriété `css`, ses classes sont préfixées (`.gr-`, `.ku-`, `.cm-`),
  elle ne peut donc pas casser les deux autres.
- **Changer une donnée affichée** → `src/data.js`. Aucun chiffre ne doit être
  écrit en dur dans une application.
- **Ajouter une quatrième application** → créer `src/app-xxx.js` sur le même
  contrat, puis l'importer et l'ajouter au tableau `APPS` dans `src/phone.js`.
  Elle apparaîtra automatiquement sur l'écran d'accueil.
- **Tester** → `python3 -m http.server 8080` dans ce dossier (les modules ES
  ne se chargent pas en `file://`), puis `http://localhost:8080`.
- **Vérifier la syntaxe d'un module** →
  `cp src/app-gerant.js /tmp/t.mjs && node --check /tmp/t.mjs`.
