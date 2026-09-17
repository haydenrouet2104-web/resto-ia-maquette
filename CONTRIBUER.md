# Instructions de travail sur la maquette

> **Premier réflexe : dans quel dépôt es-tu ?**
>
> - Si l'URL du dépôt est **`haydenrouet2104-web/hayden-rouet`** (privé) → tu es
>   au bon endroit, continue.
> - Si l'URL du dépôt est **`haydenrouet2104-web/resto-ia-maquette`** (public) →
>   **n'édite rien ici.** Ce dépôt est un miroir de publication, écrasé à chaque
>   mise en ligne. Va travailler dans le dépôt privé, dossier
>   `resto-ia/maquette/`.

---

## 1. Comment le système fonctionne

```
        TU TRAVAILLES ICI                        CE QUE LE MONDE VOIT
  ┌──────────────────────────────┐          ┌────────────────────────────┐
  │  hayden-rouet   (PRIVÉ)      │          │  resto-ia-maquette (PUBLIC)│
  │                              │          │                            │
  │  resto-ia/maquette/  ────────┼─────────▶│  /  (le même dossier,      │
  │    index.html                │ subtree  │      à la racine)          │
  │    src/…                     │  push    │                            │
  │                              │          │            │               │
  │  resto-ia/docs/   (PRD…)     │          │            ▼               │
  │  devis60/         (autre     │          │     GitHub Pages           │
  │                    projet)   │          │     reconstruit 30–60 s    │
  └──────────────────────────────┘          └────────────────────────────┘
                                                         │
                                                         ▼
                        https://haydenrouet2104-web.github.io/resto-ia-maquette/
```

- Le **dépôt privé** est la source de vérité. Tout l'historique, le PRD, le
  schéma de base de données et la maquette y vivent ensemble.
- Le **dépôt public** ne contient que le dossier `maquette/`, remonté à sa
  racine. Il existe uniquement pour servir le site : Hayden actualise la page
  et voit les changements.
- La copie est **à sens unique** : privé → public. Un commit fait directement
  dans le public sera perdu et bloquera la publication suivante.

Le site est **entièrement statique** : pas de serveur, pas de base de données,
pas de compte, pas de clé d'API. Ce sont des fichiers ouverts par le navigateur.

## 2. À lire avant de toucher quoi que ce soit

1. `resto-ia/maquette/README.md` — l'architecture et le contrat d'une application.
2. `resto-ia/docs/prd.md` — la décision produit. Elle fait foi.
3. Le business plan le plus récent (`BUSINESS_PLAN_v1.7.pdf` chez Hayden) pour
   les chiffres. **Ne jamais inventer un chiffre** : tout ce qui s'affiche dans
   la maquette doit venir du business plan ou être une donnée d'exemple
   assumée (un nom de client, une adresse).

## 3. Où modifier quoi

Tous les chemins sont relatifs à `resto-ia/maquette/` dans le dépôt privé.

| Ce que tu veux changer | Le fichier à ouvrir | À ne pas toucher |
|---|---|---|
| Couleurs, polices, châssis du téléphone, boutons, cartes | `src/theme.css` | rien d'autre : c'est la seule couche visuelle partagée |
| Un écran, un onglet, une animation de l'app **gérant** | `src/app-gerant.js` | les deux autres apps |
| Idem pour l'app **cuisine** | `src/app-cuisine.js` | les deux autres apps |
| Idem pour l'app **commercial** | `src/app-commercial.js` | les deux autres apps |
| Un prix, un menu, un prospect, un forfait, un texte de règle | `src/data.js` | ne jamais écrire un chiffre en dur dans une app |
| Les icônes de l'écran d'accueil, les glyphes | `src/icons.js` | |
| L'ouverture d'app, les notifications, les toasts, les feuilles | `src/phone.js` | |
| Un helper partagé (topbar, navbar, courbe, anneau, compteur) | `src/ui.js` | |
| Le téléphone lui-même, la barre d'état, le panneau de gauche | `index.html` | |

**Ajouter une quatrième application** : créer `src/app-xxx.js` sur le même
contrat que les trois autres, puis l'importer dans `src/phone.js` et l'ajouter
au tableau `APPS`. Elle apparaît automatiquement sur l'écran d'accueil.

## 4. Les règles qui ne se négocient pas

1. **Aucune dépendance, aucun build, aucun framework.** Pas de npm, pas de
   React, pas de Tailwind, pas d'étape de compilation. Du HTML, du CSS et du
   JavaScript que le navigateur lit directement. C'est ce qui permet à
   n'importe qui de reprendre le projet dans dix mois.
2. **Une application ne peut pas repeindre une autre.** Chaque app porte son
   CSS dans sa propriété `css`, et **toutes ses classes sont préfixées** :
   `.gr-` pour le gérant, `.ku-` pour la cuisine, `.cm-` pour le commercial.
   Une classe non préfixée dans un fichier d'app est un bug.
3. **L'argent est en centimes entiers, les durées en secondes.** Comme le
   schéma `resto-ia/supabase/migrations`. Les euros et les minutes sont
   calculés à l'affichage, avec les fonctions de `fmt` dans `src/data.js`.
4. **Aucun bouton mort.** Si un bouton existe, il fait quelque chose de
   visible. Une maquette dont la moitié des boutons ne répondent pas ne sert
   à rien pour montrer le produit.
5. **`monter()` rend une fonction de nettoyage** qui annule tous les
   `setInterval`, `setTimeout`, `requestAnimationFrame` et contextes audio.
   Sans ça, les minuteurs continuent à tourner après la fermeture de l'app et
   la page finit par ramer.
6. **`prefers-reduced-motion` est respecté** : la fonction `reduit()` de
   `src/ui.js` sert à couper les animations longues.
7. **Ne pas toucher `devis60/` ni `wrangler.toml` à la racine.** C'est un autre
   projet, déployé automatiquement sur Cloudflare à chaque push sur la branche
   par défaut. En particulier : ne jamais éditer `devis60/src/app-html.js`,
   c'est une chaîne JavaScript de 175 000 signes qui casse le Worker au moindre
   faux pas.
8. **Pas de workflow GitHub Actions.** GitHub Pages sert la branche
   directement, et Cloudflare a déjà son intégration Git. Un workflow ferait
   doublon.

## 5. La boucle de travail, pas à pas

```bash
# 1. toujours repartir de l'état à jour
git checkout claude/coding-capabilities-iqz2jp && git pull

# 2. travailler sur une branche
git checkout -b claude/ma-modification

# 3. éditer les fichiers concernés (voir le tableau du §3)

# 4. essayer pour de vrai — les modules ES ne se chargent pas en file://
cd resto-ia/maquette && python3 -m http.server 8080
#    puis ouvrir http://localhost:8080 et cliquer partout

# 5. vérifier la syntaxe de chaque module modifié
cp src/app-gerant.js /tmp/t.mjs && node --check /tmp/t.mjs

# 6. commiter
git add -A && git commit -m "…"

# 7. pousser le dépôt privé (le travail)
git push -u origin claude/ma-modification

# 8. publier le site (une fois la modification validée et fusionnée)
git subtree push --prefix=resto-ia/maquette public main
```

Le remote `public` se crée une seule fois :

```bash
git remote add public https://github.com/haydenrouet2104-web/resto-ia-maquette.git
```

## 6. Checklist avant de publier

- [ ] La page s'ouvre sans **aucune erreur** dans la console du navigateur.
- [ ] Les **trois** applications s'ouvrent et se ferment (barre d'accueil en bas).
- [ ] Les onglets de chaque application s'affichent tous.
- [ ] Ça tient à **375 px de large** (outils de développement, mode téléphone).
- [ ] Aucun chiffre inventé : tout vient du business plan ou de `data.js`.
- [ ] `node --check` passe sur chaque module modifié.

## 7. Pièges connus

- **Double-cliquer sur `index.html` ne marche pas.** Les modules ES sont
  bloqués en `file://`. Il faut un serveur local (§5, étape 4).
- **Le site semble ne pas se mettre à jour** : GitHub Pages met 30 à 60
  secondes à reconstruire, et le navigateur garde l'ancienne version en cache.
  Recharger en forçant (Cmd+Shift+R).
- **`git subtree push` refusé** : quelqu'un a commité directement dans le
  dépôt public. Le contenu du public n'a aucune valeur, on le remplace :
  ```bash
  git push public `git subtree split --prefix=resto-ia/maquette HEAD`:main --force
  ```
- **Une app plante et affiche un message d'erreur rouge** : c'est `phone.js`
  qui rattrape l'exception. Le détail est dans la console.
