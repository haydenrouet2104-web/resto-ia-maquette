/* =========================================================================
   Données d'exemple — toutes les valeurs proviennent du business plan v1.7.
   Convention reprise de resto-ia/supabase : l'argent est en CENTIMES entiers,
   les durées d'appel en SECONDES. Les minutes sont dérivées à l'affichage.
   ========================================================================= */

export const RESTO = {
  nom:'Snack Le Comptoir',
  adresse:'12 rue Garibaldi, Lyon 7e',
  tel:'04 78 •• •• 12',
  assistant:'Sofiane',
  forfait:'pro',
  minutesUtilisees:147,
  charge:'rush',              // normal | rush | charge | stop
  horaires:[
    { jours:'Lun – Jeu', creneaux:'11h30–14h30 · 18h00–23h00' },
    { jours:'Vendredi',  creneaux:'11h30–14h30 · 18h00–01h00' },
    { jours:'Samedi',    creneaux:'11h30–15h00 · 18h00–01h00' },
    { jours:'Dimanche',  creneaux:'18h00–23h00' }
  ],
  exceptions:[
    { date:'24 décembre', regle:'Fermé' },
    { date:'31 décembre', regle:"Jusqu'à 01h00" }
  ],
  derniereCommande:20,        // minutes avant fermeture
  livraison:{ rayonKm:4.5, minimum:1500, frais:250, paiement:'Espèces + carte au livreur', delai:35 }
};

/* Niveaux de charge — §3 du business plan */
export const CHARGES = {
  normal:{ nom:'Normal',             delai:15, ton:'ok',   dit:"Délai annoncé sans commentaire." },
  rush:  { nom:'Rush',               delai:30, ton:'warn', dit:"L'IA demande si le délai convient avant d'enregistrer." },
  charge:{ nom:'Très chargé',        delai:45, ton:'bad',  dit:"Choix séparé de garder ou non le retrait et la livraison." },
  stop:  { nom:'Commandes stoppées', delai:0,  ton:'bad',  dit:"Plus aucune commande. L'IA indique l'heure de reprise." }
};

/* Forfaits — §7 */
export const FORFAITS = [
  { id:'payg',  nom:'PAYG',         prix:0,     minutes:0,    depassement:49, note:'Commission 10 % du CA' },
  { id:'basic', nom:'Basic',        prix:3200,  minutes:100,  depassement:45, note:'Coût IA ≈ 12 €' },
  { id:'pro',   nom:'Pro',          prix:6600,  minutes:300,  depassement:35, note:'Coût IA ≈ 36 €' },
  { id:'biz',   nom:'Business',     prix:10000, minutes:500,  depassement:28, note:'Coût IA ≈ 60 €' },
  { id:'big',   nom:'Big Business', prix:25000, minutes:1500, depassement:20, note:'Coût IA 100–180 €' }
];

export const COUT_IA_MIN = 12;     // centimes par minute
export const COMMISSION  = 750;    // centimes par mois et par client actif

/* Voix de l'assistant — §3 */
export const VOIX = {
  prenom:'Sofiane',
  ton:'dynamique',                 // chaleureux | dynamique | professionnel | quartier
  vitesse:'normale',
  langues:['Français','Arabe'],
  accueil:"Bonsoir, assistant vocal automatisé du Comptoir, je prends votre commande ?",
  signature:false,
  prononciations:[
    { mot:'Bicky',   dit:'bi-ki' },
    { mot:'Mergguez', dit:'mer-guèz' }
  ]
};

/* ------------------------------- MENU ------------------------------- */
export const MENU = [
  { id:'tacos', nom:'Tacos', items:[
    { id:'tacos-m', nom:'Tacos M', prix:950, dispo:true, populaire:true,
      inclus:['Frites','Une boisson'],
      obligatoires:[
        { nom:'Taille',  min:1, max:1, choix:['M'] },
        { nom:'Viande',  min:1, max:1, choix:['Poulet','Kebab','Merguez','Cordon bleu','Steak haché'] },
        { nom:'Sauce',   min:1, max:2, choix:['Algérienne','Blanche','Samouraï','Biggy','Harissa','Andalouse'] }
      ],
      supplements:[
        { nom:'Cheddar', prix:100, dispo:true },
        { nom:'Boursin', prix:100, dispo:false },
        { nom:'Double viande', prix:200, dispo:true },
        { nom:'Boisson 1,5 L', prix:200, dispo:true }
      ],
      precisions:['Halal','Contient gluten, lait'],
      demandes:['Sans oignons','Sauce à part','Frites sans sel','Bien cuit'] },
    { id:'tacos-l', nom:'Tacos L — 2 viandes', prix:1200, dispo:true, inclus:['Frites','Une boisson'],
      obligatoires:[{ nom:'Viandes', min:2, max:2, choix:['Poulet','Kebab','Merguez','Cordon bleu'] },
                    { nom:'Sauce', min:1, max:2, choix:['Algérienne','Blanche','Samouraï','Biggy'] }],
      supplements:[{ nom:'Cheddar', prix:100, dispo:true },{ nom:'Triple viande', prix:300, dispo:true }],
      precisions:['Halal'], demandes:['Sans oignons','Sauce à part'] }
  ]},
  { id:'sandwichs', nom:'Sandwichs & burgers', items:[
    { id:'kebab-xl', nom:'Kebab XL', prix:900, dispo:true, populaire:true, inclus:[],
      obligatoires:[{ nom:'Pain', min:1, max:1, choix:['Galette','Pain kebab','Assiette'] },
                    { nom:'Sauce', min:1, max:2, choix:['Blanche','Harissa','Samouraï','Ketchup'] }],
      supplements:[{ nom:'Cheddar', prix:100, dispo:true },{ nom:'Frites dedans', prix:150, dispo:true }],
      precisions:['Halal'], demandes:['Sans oignons','Sans crudités'] },
    { id:'burger', nom:'Burger maison', prix:1050, dispo:true, inclus:['Frites'],
      obligatoires:[{ nom:'Cuisson', min:1, max:1, choix:['À point','Bien cuit'] }],
      supplements:[{ nom:'Bacon de dinde', prix:150, dispo:true },{ nom:'Œuf', prix:100, dispo:true }],
      precisions:['Contient gluten, lait, œufs'], demandes:['Sans cornichons','Sauce à part'] }
  ]},
  { id:'pizzas', nom:'Pizzas', items:[
    { id:'4from', nom:'Pizza 4 fromages', prix:1150, dispo:true, inclus:[],
      obligatoires:[{ nom:'Base', min:1, max:1, choix:['Tomate','Crème'] },
                    { nom:'Taille', min:1, max:1, choix:['Moyenne','Grande'] }],
      supplements:[{ nom:'Bien cuite', prix:0, dispo:true },{ nom:'Piment', prix:0, dispo:true }],
      precisions:['Végétarien','Contient gluten, lait'], demandes:['Bien cuite','Coupée en 8'] },
    { id:'merguez-pizza', nom:'Pizza merguez', prix:1250, dispo:false, inclus:[],
      obligatoires:[{ nom:'Base', min:1, max:1, choix:['Tomate'] }],
      supplements:[], precisions:['Halal'], demandes:[] }
  ]},
  { id:'cotes', nom:'À côté', items:[
    { id:'frites', nom:'Frites', prix:350, dispo:true, inclus:[],
      obligatoires:[{ nom:'Taille', min:1, max:1, choix:['Petite','Grande'] }],
      supplements:[{ nom:'Cheddar fondu', prix:150, dispo:true }], precisions:[], demandes:['Sans sel'] },
    { id:'tiramisu', nom:'Tiramisu maison', prix:300, dispo:true, inclus:[], obligatoires:[],
      supplements:[], precisions:['Contient lait, œufs, gluten'], demandes:[] },
    { id:'oasis', nom:'Boisson 33 cl', prix:180, dispo:true, inclus:[],
      obligatoires:[{ nom:'Parfum', min:1, max:1, choix:['Oasis tropical','Coca','Ice Tea','Eau'] }],
      supplements:[], precisions:[], demandes:[] }
  ]}
];

/* ----------------------------- COMMANDES ----------------------------- */
/* etat : appel | attente | confirmee | preparation | prete | livraison | terminee | expiree */
export const COMMANDES = [
  { id:251, etat:'appel', mode:'retrait', heure:'19:44', client:null, depuis:38,
    lignes:[], total:0, paiement:null, ticketImprime:false },

  { id:250, etat:'attente', mode:'livraison', heure:'19:43', client:'Karim', expireDans:64,
    adresse:'8 rue Jaboulay, bât. B, 3e étage, digicode 47A29', distanceKm:2.1,
    lignes:[
      { q:2, nom:'Kebab XL', options:['Galette','Sauce blanche'], demandes:['Sans oignons'], prix:1800 },
      { q:1, nom:'Frites', options:['Grande'], demandes:[], prix:350 }
    ],
    total:2400, frais:250, paiement:'Carte au livreur', ticketImprime:false },

  { id:248, etat:'confirmee', mode:'retrait', heure:'19:41', prete:'19:48', client:'Sarah',
    lignes:[
      { q:1, nom:'Tacos M', options:['Poulet','Sauce algérienne','Frites + Oasis tropical'],
        demandes:[], supplements:['Cheddar'], prix:1050 }
    ],
    total:1050, paiement:'Sur place', ticketImprime:false },

  { id:247, etat:'preparation', mode:'livraison', heure:'19:38', prete:'20:05', client:'Mehdi',
    adresse:'24 av. Berthelot, 1er étage', distanceKm:3.4,
    lignes:[
      { q:1, nom:'Pizza 4 fromages', options:['Crème','Grande'], demandes:['Bien cuite'], prix:1150 },
      { q:1, nom:'Tiramisu maison', options:[], demandes:[], prix:300 }
    ],
    total:1700, frais:250, paiement:'Espèces au livreur', ticketImprime:true },

  { id:245, etat:'prete', mode:'retrait', heure:'19:30', prete:'19:45', client:'Yanis',
    lignes:[
      { q:3, nom:'Burger maison', options:['Bien cuit'], demandes:['Sans cornichons','Sauce à part'], prix:3150 }
    ],
    total:3150, paiement:'Sur place', ticketImprime:true },

  { id:244, etat:'expiree', mode:'retrait', heure:'19:26', client:null,
    lignes:[{ q:1, nom:'Tacos L — 2 viandes', options:['Poulet + kebab','Sauce samouraï'], demandes:[], prix:1200 }],
    total:1200, paiement:null, ticketImprime:false, motif:'Aucune validation du client' }
];

/* --------------------------- APPEL DÉMO --------------------------- */
/* t = seconde de l'appel ; utilisé par l'app gérant (écran « Appel en direct ») */
export const APPEL_DEMO = [
  { t:2,  qui:'ia',  txt:"Bonsoir ! Vous êtes en ligne avec l'assistant vocal automatisé du Comptoir. Je prends votre commande ?" },
  { t:11, qui:'cli', txt:"Ouais bonsoir, je voudrais un tacos M poulet sauce algérienne.",
    panier:{ q:1, nom:'Tacos M', options:['Poulet','Sauce algérienne'], prix:950 } },
  { t:19, qui:'ia',  txt:"C'est noté. Le tacos M vient avec frites et une boisson — je vous mets quoi comme boisson ?" },
  { t:28, qui:'cli', txt:"Un Oasis. Et rajoutez du cheddar.",
    maj:{ options:['Poulet','Sauce algérienne','Frites + Oasis tropical'], supplements:['Cheddar'], prix:1050 } },
  { t:30, qui:'sys', txt:"Cheddar +1,00 € · panier mis à jour" },
  { t:37, qui:'ia',  txt:"Cheddar ajouté. Je vous propose un tiramisu maison à 3 € pour finir ?" },
  { t:44, qui:'cli', txt:"Non c'est bon. Je passe le prendre." },
  { t:47, qui:'sys', txt:"Récapitulatif préparé · SMS envoyé", sms:true },
  { t:58, qui:'ia',  txt:"Je vous ai envoyé le récapitulatif par SMS : un tacos M poulet sauce algérienne avec cheddar, boisson Oasis, 10,50 € à régler sur place. Vous me confirmez ?" },
  { t:66, qui:'cli', txt:"Oui je valide.", confirme:true },
  { t:74, qui:'ia',  txt:"Parfait, c'est envoyé en cuisine. Ce sera prêt dans 15 minutes au comptoir. Bonne soirée !" },
  { t:78, qui:'sys', txt:"Commande #248 confirmée → écran cuisine", fin:true }
];

export const SMS_RECAP =
`SNACK LE COMPTOIR — commande #248
1x Tacos M poulet, sauce algérienne
   + cheddar · boisson Oasis
Retrait à 19h48 — 10,50 € sur place

Répondez OK pour valider, MODIF pour changer.
Confidentialité : lecomptoir.fr/vie-privee`;

/* --------------------------- JOURNAL D'APPELS --------------------------- */
export const APPELS = [
  { id:1, heure:'19:41', duree:92,  issue:'commande', numero:'06 •• •• •• 47', montant:1050, cmd:248 },
  { id:2, heure:'19:36', duree:44,  issue:'question', numero:'07 •• •• •• 03', montant:0,    q:"Horaires du dimanche" },
  { id:3, heure:'19:31', duree:131, issue:'commande', numero:'06 •• •• •• 88', montant:3150, cmd:245 },
  { id:4, heure:'19:24', duree:58,  issue:'transfert',numero:'06 •• •• •• 12', montant:0,    motif:"Allergie évoquée" },
  { id:5, heure:'19:19', duree:26,  issue:'expiree',  numero:'masqué',         montant:0,    cmd:244 },
  { id:6, heure:'19:12', duree:104, issue:'commande', numero:'06 •• •• •• 51', montant:1700, cmd:247 }
];

/* Chiffres du jour — app gérant */
export const JOUR = {
  appelsPris:31, appelsManquesAvant:0, commandes:24, expirees:6,
  ca:41280, panierMoyen:1720, minutes:147, transferts:2,
  courbe:[2,4,3,6,9,12,8,5,3,7,11,14,10,6]   // appels par tranche de 30 min
};

/* ------------------------------- CRM ------------------------------- */
export const STATUTS = {
  jamais:    { nom:'Jamais démarché',  ton:'',     def:"Disponible dans le canal autorisé." },
  reserve:   { nom:'Réservé',          ton:'acc',  def:"Réservation de 3 jours après « Je prends ce prospect »." },
  sansrep:   { nom:'Sans réponse',     ton:'',     def:"Tentative réalisée ; relance planifiable." },
  refus:     { nom:'Refus',            ton:'bad',  def:"Date de retour à définir, ou Ne plus contacter." },
  attente:   { nom:'En attente',       ton:'warn', def:"Intérêt, démonstration ou rappel programmé." },
  essai:     { nom:"Période d'essai",  ton:'info', def:"Le restaurant teste le produit." },
  client:    { nom:'Client actif',     ton:'ok',   def:"Restaurant payant ; commission calculée." },
  stop:      { nom:'Ne plus contacter',ton:'bad',  def:"Opposition respectée par tous." }
};

export const PROSPECTS = [
  { id:1,  nom:'Istanbul Kebab',   type:'kebab',  adresse:'34 av. Jean-Jaurès',    statut:'client',  depuis:'12/07', ca:6600, distance:120, x:22, y:30 },
  { id:2,  nom:'Tacos Avenue',     type:'tacos',  adresse:'7 rue Sébastien Gryphe',statut:'reserve', reste:'2 j 4 h', distance:180, x:52, y:46,
    derniere:'16/09 · porte-à-porte 14h20', preuve:'photo devanture', objection:"« déjà débordé, rappeler hors service »" },
  { id:3,  nom:'Pizza Del Sole',   type:'pizza',  adresse:'21 rue de Marseille',   statut:'attente', rappel:'lundi 10h', distance:260, x:70, y:22 },
  { id:4,  nom:'Burger 7',         type:'burger', adresse:'3 place Gabriel Péri',  statut:'jamais',  distance:300, x:34, y:68 },
  { id:5,  nom:'Snack Étoile',     type:'kebab',  adresse:'88 grande rue',         statut:'essai',   reste:'essai j5/14', distance:420, x:80, y:62 },
  { id:6,  nom:'Le Bosphore',      type:'kebab',  adresse:'12 rue Salomon',        statut:'client',  depuis:'02/08', ca:3200, distance:510, x:14, y:78 },
  { id:7,  nom:'Chicken Street',   type:'burger', adresse:'45 cours Gambetta',     statut:'sansrep', relance:'jeudi', distance:540, x:62, y:80 },
  { id:8,  nom:'Pizzeria Napoli',  type:'pizza',  adresse:'2 rue Béchevelin',      statut:'refus',   retour:'janvier', distance:610, x:88, y:36 },
  { id:9,  nom:'Tacos King',       type:'tacos',  adresse:'19 av. Berthelot',      statut:'jamais',  distance:700, x:44, y:14 },
  { id:10, nom:'Sandwicherie Sud', type:'kebab',  adresse:'60 rue Pasteur',        statut:'stop',    distance:760, x:26, y:52 },
  { id:11, nom:'Mama Pizza',       type:'pizza',  adresse:'33 rue Chevreul',       statut:'client',  depuis:'28/08', ca:10000, distance:820, x:74, y:70 },
  { id:12, nom:'Le Comptoir',      type:'tacos',  adresse:'12 rue Garibaldi',      statut:'client',  depuis:'05/07', ca:6600, distance:900, x:56, y:60 }
];

export const COMMERCIAL = {
  nom:'Nadia B.',
  zone:'Lyon 7e — secteur Guillotière',
  ciblesZone:42,
  clientsActifs:19,
  moisGains:[
    { mois:'Juin',      montant:4500 },
    { mois:'Juillet',   montant:8250 },
    { mois:'Août',      montant:11250 },
    { mois:'Septembre', montant:14250 }
  ],
  entonnoir:[
    { etape:'Chargés au CRM', n:248, ton:'' },
    { etape:'Visités',        n:176, ton:'info' },
    { etape:'Démos faites',   n:54,  ton:'warn' },
    { etape:'Essais lancés',  n:31,  ton:'acc' },
    { etape:'Clients payants',n:21,  ton:'ok' },
    { etape:'Ne plus contacter', n:9, ton:'bad' }
  ],
  regles:[
    { titre:'Réservation 3 jours', txt:"« Je prends ce prospect » le verrouille 3 jours. Sans action il retourne au commun : le même commercial ne peut plus le reprendre pendant 2 mois, un autre le peut immédiatement." },
    { titre:'Protection 30 jours', txt:"Après une action valide et un suivi, le prospect est protégé 30 jours depuis la dernière action." },
    { titre:'Preuve de visite',    txt:"Appel depuis le numéro professionnel, message depuis le canal Resto IA, ou photo de devanture sans visages ni plaques. L'audio ne sert pas de preuve. Géolocalisation ponctuelle, jamais de suivi continu." },
    { titre:'Fin de mandat',       txt:"Résiliable avec préavis dans les deux sens. La commission court jusqu'à la fin du cycle d'engagement de 6 mois en cours, puis s'arrête. À valider juridiquement avant tout recrutement." }
  ],
  argumentaire:[
    { q:"« J'ai pas le temps »",        r:"L'installation prend 10 minutes : vous gardez votre numéro, on active juste le renvoi sur non-réponse. Je peux le faire maintenant, hors rush." },
    { q:"« Ça va faire robot »",        r:"On choisit ensemble le prénom, le ton et la vitesse. Vous validez un appel test sur votre vrai menu avant que ça parte en ligne." },
    { q:"« Et si l'IA se trompe ? »",   r:"Rien ne part en cuisine sans confirmation du client. En cas d'allergie, de grosse commande ou de doute, elle transfère." },
    { q:"« C'est cher »",               r:"Essai gratuit d'abord : on mesure votre vrai volume d'appels. Un seul tacos récupéré par jour paie déjà le forfait Basic." },
    { q:"« Je rappelle les gens après »",r:"Aux heures de pointe, un client qui tombe sur un répondeur commande ailleurs. C'est ça qu'on récupère." }
  ]
};

/* ------------------------- textes de cadrage ------------------------- */
export const REGLES = {
  confirmation:"Une commande ne part en cuisine qu'après confirmation. L'IA reste en ligne jusqu'à 45 secondes, propose la confirmation par SMS, puis laisse la commande expirer après 2 minutes.",
  modification:"Une modification ne doit jamais créer deux commandes : le panier est corrigé, l'ancien récapitulatif invalidé, un nouveau SMS envoyé. Le ticket porte la mention MODIFICATION COMMANDE #…",
  transfert:"L'IA ne doit pas insister si le client demande un humain, semble énervé, évoque une allergie, demande une très grosse commande, formule une demande hors menu, ou reste incertaine après deux tentatives.",
  allergenes:"Les informations d'allergènes sont formulées comme « selon les informations du restaurant ». L'IA ne garantit jamais l'absence d'allergène.",
  paiement:"Resto IA ne collecte jamais le paiement des commandes, ne stocke pas de carte, ne rembourse pas et ne gère pas les litiges. L'entreprise facture uniquement son abonnement.",
  rgpd:"L'IA annonce en début d'appel que le client parle à un assistant automatisé (RGPD et AI Act). Base légale : exécution du contrat. Audio brut conservé 30 jours.",
  renvoi:"Renvoi conditionnel chez l'opérateur : **61*NUMERO# sur non-réponse, **67*NUMERO# sur occupation. Désactivation : ##61# et ##67#. Codes GSM standardisés (3GPP), réversibles en deux minutes."
};

/* --------------------------------- fmt --------------------------------- */
export const fmt = {
  euro(cents){ return (cents/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'; },
  euroCourt(cents){ return Math.round(cents/100).toLocaleString('fr-FR') + ' €'; },
  duree(sec){ return sec < 60 ? sec + ' s' : Math.floor(sec/60) + ' min ' + String(sec%60).padStart(2,'0'); },
  horloge(sec){ return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(Math.floor(sec)%60).padStart(2,'0'); },
  nb(n){ return n.toLocaleString('fr-FR'); }
};

export function forfaitDe(id){ return FORFAITS.find(f => f.id === id) || FORFAITS[2]; }
