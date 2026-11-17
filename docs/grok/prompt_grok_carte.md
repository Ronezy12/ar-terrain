Salut Grok, nouvelle PR : la vue CARTE du planning B (crm/planning_b.php), sur crmdev.

RÈGLES
- Branche dev uniquement, tests sur crmdev uniquement, jamais crm26 (production). Mode test actif (aucun SMS réel).
- Aucune donnée client réelle dans le code, les captures ou la PR (fiches de test uniquement).
- La clé Google Maps reste côté CRM : celle qui sert déjà à la carte actuelle, limitée au domaine du CRM. Jamais en clair dans le dépôt GitHub de l'appli.
- Le planning A continue de fonctionner.

BUT
Aujourd'hui la carte Google Maps est en bas de page. On veut une vraie vue « Carte » dans le planning B, ouverte par le bouton « Carte » de l'en-tête, sans changer de page ni recharger le planning.

1. OUVERTURE
- Le bouton « Carte » est déjà dans le nouveau planning. Il appelle window.PLANNING_CONFIG.carteUrl.
- Deux options, au choix :
  a) intégrer la carte comme 4e vue dans la même page (préféré, pas de rechargement) ;
  b) ou une page planning_b.php?vue=carte&date=AAAA-MM-JJ, avec PLANNING_CONFIG.carteUrl = function(d){ return '/crm/planning_b.php?vue=carte&date='+d.toISOString().slice(0,10); }.
- La carte s'ouvre sur le jour affiché dans le planning. Flèches précédent / suivant et « Aujourd'hui » comme dans les autres vues.

2. CE QU'ON VOIT SUR LA CARTE (jour choisi)
- Un repère par RDV du jour : rond de la couleur du technicien avec le NUMÉRO de l'étape dans sa tournée (1, 2, 3…).
- RDV terminés : repère pâle avec une coche. RDV « à attribuer » : repère jaune en pointillés avec un « ? ».
- Position en direct de chaque technicien : pastille avec ses INITIALES (même couleur que dans le planning), et l'heure de la dernière position (« il y a 3 min »). Grisée si la position date de plus de 15 min.
  Ces positions sont déjà envoyées par l'appli au CRM (actions En route / Sur place / Terminé et positions des RDV).
- Le trajet de chaque tournée : ligne de la couleur du technicien qui relie ses RDV dans l'ordre des heures (Directions API, ou ligne droite si quota dépassé).
- Les filtres du panneau de gauche s'appliquent aussi à la carte : techniciens, types, « Afficher seulement ».

3. PANNEAU DE LA CARTE (à gauche de la carte, 320 px)
- Une carte par technicien : initiales + nom, nombre de RDV, km et temps de route du jour, état actuel (En route / Sur place / Libre).
- En dessous, ses étapes numérotées : heure, nom du client, ville, statut.
- Clic sur une étape : la carte centre le repère et ouvre la même fiche RDV que dans le planning (Confirmer, Décaler, Réattribuer, Faire la commande, Itinéraire, Ouvrir la fiche).
- Section jaune « À attribuer » en haut, avec pour chaque RDV les 3 techniciens les plus proches (km et temps depuis leur position ou leur RDV précédent) et un bouton « Confier ».

4. ADRESSES → COORDONNÉES
- Géocoder les adresses CÔTÉ SERVEUR avec la clé Google du CRM, et ENREGISTRER lat/lng sur la fiche ou le RDV. On ne géocode qu'une fois par adresse, et à nouveau seulement si l'adresse change.
- Adresse introuvable : RDV listé dans le panneau avec « Adresse à vérifier », sans repère.
- Exposer aussi lat et lng dans GET /api/v1/appointments, pour que l'appli des techniciens affiche la même carte.

5. CONFORT
- Pas de saut de page : la carte a une hauteur fixe (toute la hauteur disponible sous l'en-tête). Squelette gris pendant le chargement.
- Repères qui se superposent (même immeuble) : regroupés en une pastille « 3 » qui s'ouvre au clic.
- Actualisation des positions toutes les 60 s sans recharger la carte ni perdre le zoom.
- Mêmes petits effets que le reste du planning : survol d'une étape = repère qui grossit légèrement, ouverture de fiche en fondu 0,24 s, prefers-reduced-motion respecté.
- Tablette : le panneau passe au-dessus de la carte en liste repliable.

À FAIRE VALIDER
- Captures sur crmdev avec des fiches de test : une journée à 2 techniciens, une adresse introuvable, un RDV à attribuer.
- Vérifier que le bouton « Carte » du planning B ouvre bien la carte du jour affiché, et que la fiche RDV s'ouvre depuis la carte.
- Dire quelle option (a ou b) a été choisie et la valeur de carteUrl à mettre.
