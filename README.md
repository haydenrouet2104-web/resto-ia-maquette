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

## Publication

Le dépôt est privé. Pour obtenir un lien classique qui se met à jour à chaque
push : **Settings → Pages → Source : Deploy from a branch → branche
`claude/coding-capabilities-iqz2jp`, dossier `/ (root)` → Save.**

L'adresse devient alors :

```
https://haydenrouet2104-web.github.io/hayden-rouet/resto-ia/maquette/
```

GitHub Pages sur un dépôt **privé** demande un plan payant ; sur un dépôt
public c'est gratuit. Si le dépôt doit rester privé sans plan payant,
l'alternative est un dépôt public dédié ne contenant que ce dossier.

Aucun workflow GitHub Actions n'est ajouté : Pages sert directement la
branche, et l'intégration Git de Cloudflare qui déploie `devis60` n'est pas
touchée.
