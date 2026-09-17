# Maquette — les trois applications dans un téléphone

Prototype interactif de Resto IA : un téléphone à l'écran, un écran d'accueil
avec ses icônes, et **trois applications réellement cliquables** — gérant,
cuisine, commercial. Tout le contenu vient du business plan **v1.7**.

En ligne : <https://haydenrouet2104-web.github.io/resto-ia-maquette/>

> **Tu viens modifier la maquette ?** Lis `CONTRIBUER.md` d'abord : il dit dans
> quel dépôt travailler, quel fichier ouvrir pour quel changement, et comment
> publier.

## La forme vient de devis60, entièrement

Ce n'est pas une inspiration lointaine : c'est le même produit visuel.

- **`src/theme.css` est le CSS de devis60 repris à l'identique**, dans l'ordre
  où le navigateur le reçoit en production : la feuille de l'application
  (`devis60/src/app-html.js`), puis la passe atelier, puis
  `devis60/src/theme.js` — la couche bleu nuit que le Worker injecte après le
  dernier `</style>`. Rien n'a été réécrit. Si devis60 change de peau, on
  recopie.
- **La structure HTML est la même, balise pour balise** : `.caption` au-dessus
  du téléphone, `.device > .notch + .viewport`, puis `.home` (barre d'état,
  `.iconsgrid`, `.dock`) et `.screen` (barre d'état, `.content`, `.actionbar`,
  `.navbar`, `.homeind`), un `.toast`, et le `<footer>` explicatif.
- **Le JavaScript est en ES5**, comme devis60 : `var` et `function`, pas de
  modules, pas de build, chargé par des `<script>` classiques. `setContent()`
  avec fondu, `toast()`, la barre d'onglets rendue à chaque écran, l'`actionbar`
  pilotée par l'écran courant.
- **Aucune classe CSS n'a été créée.** Les écrans sont composés uniquement avec
  les classes qui existent déjà : le fil de discussion et ses bulles pour
  l'appel en direct, les cartes du journal pour les commandes, la marketplace
  (`.mkt-card`, `.lead-*`) pour les prospects, le document imprimable
  (`.doc-*`) pour le ticket de caisse, les blocs `.sub-*` pour l'abonnement,
  l'agenda pour les horaires.

Seule différence assumée : le téléphone porte **trois** applications au lieu
d'une, donc `openApp()` prend un identifiant et chaque application apporte sa
propre barre d'onglets.

## Fichiers

```
index.html              le téléphone : châssis, barre d'état, écran d'accueil
src/theme.css           la couche visuelle — le CSS de devis60, tel quel
src/app.js              le noyau : accueil, ouverture d'appli, setContent,
                        toast, barre d'onglets, feuille coulissante
src/data.js             toutes les données, tirées du business plan v1.7
src/app-gerant.js       ┐
src/app-cuisine.js      ├ une application = un fichier
src/app-commercial.js   ┘
```

Pourquoi découpé, alors que devis60 tient en une seule chaîne JavaScript ?
Parce que cette chaîne est précisément ce qui a cassé deux fois le Worker :
`devis60/design/v0/README.md` interdit d'y toucher. Ici chaque fichier s'édite
normalement.

### Contrat d'une application

```js
RIA.register({
  id, nom, badge,        // l'icône sur l'écran d'accueil et sa pastille
  fond, encre, glyph,    // son apparence
  espace,                // le bandeau « ESPACE … » ajouté dans chaque .topbar
  titre, sub, cta,       // son écran de connexion
  tabs: [ { id, lbl, svg, go } ]   // sa barre d'onglets
});
```

`RIA` fournit : `setContent`, `renderNavbar`, `actionbar`, `screenHeader`,
`backHeader`, `menurow`, `chip`, `pill`, `stat`, `note`, `sheet`, `closeSheet`,
`toast`, `openApp`, `every` / `after` (minuteurs annulés à la fermeture de
l'appli), et les formateurs `eur`, `dur`, `chrono`, `esc`, `norm`, `svg`.

### Conventions

- **L'argent est en centimes entiers**, les durées d'appel en secondes — même
  règle que `resto-ia/supabase/migrations`.
- Thème sombre uniquement, largeur utile 390 px.
- `prefers-reduced-motion` est déjà respecté par le CSS de devis60.
- Les ressources portent un `?v=` : après une mise en ligne, un rechargement
  simple suffit, sans vider le cache.
- Un `<svg>` inséré sans `width`/`height` occupe 300 × 150 px et fait éclater
  son conteneur : `RIA.svg()` pose donc une taille par défaut, que le CSS
  écrase là où il en définit une.

## Ce que chaque application montre

| Application | Onglets |
|---|---|
| **Gérant** | Service (charge, chiffres du jour) · Appels (appel en direct rejoué + journal) · Menu (fiches produit, ruptures, import de carte) · Voix (ton, vitesse, voix signature, appel test) · Compte (horaires, livraison, abonnement) |
| **Cuisine** | File (six statuts, comptes à rebours, commandes qui tombent) · Tickets (ESC/POS, impression, modification) · Ruptures · Charge |
| **Commercial** | Secteur (zone, tournée) · Prospects (8 statuts, réservation 3 jours, preuves de visite) · Argumentaire · Gains (commissions 7,50 €) |

## Essayer en local

Les fichiers sont chargés par des `<script>` classiques, donc un double-clic sur
`index.html` suffit. Pour être au plus près de la mise en ligne :

```
cd resto-ia/maquette && python3 -m http.server 8080
```

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
  contrat (il se termine par `RIA.register({…})`), puis ajouter sa balise
  `<script>` dans `index.html`. Elle apparaît automatiquement sur l'écran
  d'accueil.
- **Tester** → `python3 -m http.server 8080` dans ce dossier (les modules ES
  ne se chargent pas en `file://`), puis `http://localhost:8080`.
- **Vérifier la syntaxe d'un module** →
  `cp src/app-gerant.js /tmp/t.mjs && node --check /tmp/t.mjs`.
