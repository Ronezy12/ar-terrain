Bonjour Claude. Tu travailles sur le dépôt du CRM de l'Entreprise AR (électricité générale, Asnières). Voici le cahier des charges COMPLET de l'intégration entre le CRM et les outils des techniciens, depuis le début du projet jusqu'aux dernières demandes. Une partie existe déjà dans le CRM (faite lors des lots précédents) : vérifie-la et garde-la. Le reste est à faire, en plusieurs PR si besoin.

# 0. Contexte

Trois outils parlent au CRM, uniquement par l'API /api/v1 :

1. **L'appli des techniciens « AR Terrain »** : PWA hors ligne, dépôt Ronezy12/ar-terrain, en ligne sur https://ronezy12.github.io/ar-terrain/ (fichier index.html). Utilisée sur le terrain par les agents (profil « Agent terrain »), et par les admins.
2. **La console** (https://ronezy12.github.io/ar-terrain/console.html) : back-office pour les admins (Admin +, Commercial sédentaire). Elle règle l'appli, suit les interventions, lit les retours et les bugs en direct.
3. **Le planning B** : nouveau code prêt à intégrer dans crm/planning_b.php, fichier planning-b.html du même dépôt (le mode d'intégration est expliqué en commentaire en haut du fichier).

Lis d'abord le code existant de l'API terrain du CRM (routes /api/v1, tables, tests tests/test_api_terrain_*.php) et réutilise ce qui existe.

# 1. Règles (non négociables)

- Branche dev uniquement. Tests sur crmdev uniquement. Ne jamais toucher à crm26 (production) ni à sa base.
- Mode test actif : aucun SMS ni e-mail réel (une trace à la place).
- Aucune donnée client réelle dans le code, les tests, les captures ou les PR : fiches de test uniquement.
- Ne casse pas le planning A. Petits commits lisibles. Ajoute des tests, lance la suite existante, signale les échecs déjà présents avant tes changements.
- Migrations SQL dans sql/ (le moins de tables possible), clés secrètes dans private/env.php (hors dépôt), crons dans _scripts/ : liste-les dans la PR, c'est JDDev qui les met en place sur crmdev.

# 2. Conventions de l'API /api/v1

- Authentification : POST /api/v1/auth/login { email, psw, code_2fa? } → { token, expires_at, user: { id_crmuser, nom, id_profil, id_installator, profil_nom } }. Puis « Authorization: Bearer <token> » sur toutes les routes. 401 si le jeton est expiré.
- Réponses JSON, avec "test_mode": true sur crmdev. Erreurs : { "error": "message en français" } et le bon code HTTP.
- CORS : autoriser l'origine https://ronezy12.github.io (appli et console), méthodes GET/POST/OPTIONS, en-têtes Authorization, Content-Type, Idempotency-Key.
- Écritures idempotentes sur event_id (ou l'en-tête Idempotency-Key) : l'appli renvoie la même demande si le réseau coupe, il ne doit rien se créer en double.
- Un technicien ne voit que ses RDV et les fiches de ses dossiers ; un admin voit tout.

# 3. Ce qui existe déjà (vérifier, garder, corriger si besoin)

| Route | Rôle |
|---|---|
| POST auth/login | Connexion (+ code 2FA si le compte en a un) |
| GET appointments?from=&to= (62 jours max) | RDV du technicien : id_rdv, id_contact, debut, duree, statut, adresse, nom, note, installateur, technicien_id, telephone, type (POSE, PREVISITE, DÉPANNAGE, SAV), lat, lng, position, commande {statut, passee_le, url}, etapes {confirme, en_route, sur_place, termine} |
| POST appointments / appointments/{id} | RDV pris ou déplacé par le technicien (source = technicien) → plannings A et B, fiche en « RDV pris par le technicien » |
| GET clients/{id} | Fiche : nom, telephone, email, adresse, cp, ville, name_statuscont, commentaires [{date, id_comment, texte}] |
| GET clients?statut=rdv_a_prendre_par_tech | Liste « À appeler » du technicien |
| POST events | Journal des actions (voir § 4) |
| POST photos (multipart) | Photos du chantier : client_id, appointment_id, legende, occurred_at, event_id, photo (jpg), type avant/pendant/après |
| POST devis | Devis terrain : client_id, appointment_id, titre, remarque, a_chiffrer, lignes [{ref | libelle, quantite, unite, prix_unitaire_ht, tva, piece}], remise, acomptes |
| GET catalogue (paginé) | Articles : id, libelle, categorie, unite, prix_ht, tva, ref |
| GET kits | Kits du CRM : id_kit, nom, lignes [{id_article, quantite}] |
| GET/POST settings | Réglages de l'appli { app: {...} } enregistrés TELS QUELS (tabs, quick, techAccess, simple, shape, size, tour, notif, pay, avis, maint, fb, fiche, bureau, perso) |
| POST/GET feedback | Retours et bugs automatiques de l'appli (type, message, screen, version, device, user_nom, role, auto, kind) ; GET réservé aux admins |
| GET technicians | Équipe : id_crmuser, nom, telephone, badge, id_installator, actif |
| POST documents (multipart) | Documents de la fiche : client_id, id_rdv, type (etiquetage, bientôt bon_intervention, note_vocale, signature), event_id, fichier |
| GET push/key, POST push/subscribe, POST push/unsubscribe | Notifications Web Push (code fait ; attend la migration lot 6, les clés VAPID et le cron chez JDDev) |

Statuts automatiques (déjà faits, à garder) — l'appli ne change QUE ceux-ci :
- « RDV pris » (posé par le bureau) : le pouce vert du technicien confirme le RDV dans les plannings, la fiche ne change pas.
- « RDV à prendre par tech » (posé par le bureau) → la fiche apparaît dans « À appeler » du technicien du dossier, avec une notification.
- « RDV pris par le technicien » : quand le technicien crée ou déplace un RDV depuis l'appli.
- « Pose en cours » sur tech.arrived et « Pose finie » sur intervention.completed, seulement si le RDV est une pose ou un chantier.
- Tous les autres statuts (prospect, pose, devis) restent gérés par le bureau. Chaque changement automatique ajoute une ligne d'historique.
- À signaler : sur crmdev, le statut « RDV à prendre par tech » n'est pas trouvé par son nom ; il doit pouvoir être choisi dans Paramétrage › Application terrain.

# 4. Les événements envoyés par l'appli (POST /api/v1/events)

Chaque événement : { event_id, action, occurred_at, client_id?, appointment_id?, data }.

| action | Quand | data utile |
|---|---|---|
| appointment.accepted / appointment.confirmed | Le technicien accepte / confirme (pouce vert) | — |
| appointment.created / appointment.updated / appointment.cancelled | RDV pris, décalé, annulé côté appli | debut, duree, motif |
| tech.on_the_way | « Je suis en route » (confirmé par le technicien) | lat, lng |
| location.update | Toutes les ~30 s entre « en route » et « arrivé » | lat, lng, accuracy_m |
| tech.delay | Retard signalé | minutes, texte |
| tech.arrived | « Je suis arrivé » (confirmé) | lat, lng |
| intervention.completed | Fin signée par le client | travaux, reserve, remarque, satisfaction (1–5), signataire, duree_sur_place, paiement, statut = Terminé |
| note.added | Commentaire du technicien pour le bureau, note « RDV pris/annulé par le technicien » | texte |
| photo.added | Photo (si l'envoi multipart a échoué) | legende |
| quote.created / quote.sent | Devis terrain | lignes, a_chiffrer |
| payment.recorded | Paiement sur place | montant, moyen (cheque, virement, carte, especes), numero_cheque, banque, foreign_tx_id (SumUp) |
| review.requested | Demande d'avis Google | canal |
| message.sent / call.logged | Message ou appel au client | canal, resultat |
| client.created | Fiche prospect créée sur le terrain | nom, telephone, adresse |
| board.saved | Tableau électrique (étiquetage) enregistré | nombre de rangées |

Tous ces événements doivent apparaître dans l'historique de la fiche / du RDV concerné.

# 5. À faire côté API

1. **Devis du technicien sans changement de statut** : POST devis (a_chiffrer = true) ne doit plus passer la fiche en « Devis à faire » tant que l'intervention n'est pas terminée (au plus tôt après intervention.completed) ; le bureau garde la main.
2. **Numéro du client protégé** : dans GET appointments, GET clients/{id}, GET clients?statut=…, ne renvoyer telephone et email au technicien que s'il est le technicien attribué (ou du dossier pour « À appeler ») ET que le RDV est confirmé par lui ou qu'il est sur place. Sinon "telephone": null, "telephone_masque": true. Admins : tout.
3. **Notes vocales** : POST documents avec type = note_vocale (audio/webm, audio/mp4, audio/aac, audio/mpeg, 10 Mo max, champ duree_s). Lecteur audio dans la fiche et le RDV (technicien, date, durée). Transcription seulement si le CRM a déjà un service pour ça. Aujourd'hui l'appli n'envoie qu'une mention « note vocale » : je la brancherai sur cette route.
4. **Signature et bon d'intervention** : POST documents avec type = signature (PNG) et type = bon_intervention (PDF généré par l'appli : travaux, réserves, paiement, signature). Les ranger dans les documents de la fiche et du RDV. Aujourd'hui l'appli n'envoie qu'une mention « signature » : je la brancherai.
5. **Paiement** : enregistrer payment.recorded comme règlement sur la facture si elle existe, sinon en note sur la fiche (moyen, montant, n° de chèque, banque).
6. **Rémunération proposée par le technicien** : POST remunerations { event_id, id_rdv, montant, commentaire } → statut « proposée », visible par le bureau sur le RDV, qui l'accepte / la modifie / la refuse. GET remunerations?from=&to= → { remunerations: [ { id, id_rdv, date, client, type, montant, statut: proposee|acceptee|refusee|payee, payee_le } ] } (technicien : les siennes ; admin : toutes, filtre ?technicien=).
7. **Tableau de bord du technicien** : GET me/dashboard?mois=AAAA-MM → { mois, interventions, par_type {POSE, DÉPANNAGE, PREVISITE, SAV}, ca_mois, ca_mois_precedent, ca_annee, du, paye_mois, en_attente } (ca = factures de ses interventions ; du = rémunérations acceptées non payées). Admin : ?technicien=.
8. **Avis Google par e-mail** : POST avis/demande { event_id, client_id, id_rdv, canal: "email" } → e-mail au client avec le lien Google de l'entreprise (en test : trace seulement). Le WhatsApp, l'appli l'ouvre elle-même.
9. **Suivi en route** : garder les location.update entre tech.on_the_way et tech.arrived (dernière position + trajet du jour), pour la carte du planning et la fiche.
10. **Commande du matériel** : le champ commande de GET appointments doit passer à "passee" (avec passee_le et url) dès que la commande préparée depuis le devis est réellement passée.

# 6. À faire dans l'interface du CRM

1. **Pop-ups en temps réel pour le bureau** : petite fenêtre en bas à droite (non bloquante) quand un technicien agit pendant une intervention : en route, retard, arrivé, terminé, photo, note vocale, commentaire, devis terrain, paiement, document (étiquetage, bon d'intervention), RDV pris par le technicien, bug signalé. Contenu : technicien, client, action, heure, bouton « Ouvrir ». Disparaît après 8 s (reste au survol), cloche dans l'en-tête avec l'historique non lu et « Tout marquer comme lu ». Route interne (session CRM) interrogée toutes les 15 s quand l'onglet est visible. Réglage par utilisateur : types voulus, son on/off (off par défaut). Profils bureau seulement.
2. **Bouton « App techniciens » dans la fiche client** : panneau latéral avec tout ce qui vient de l'appli pour ce client, du plus récent au plus ancien, chaque bloc seulement s'il a du contenu, badge « nouveaux » depuis la dernière ouverture :
   RDV et étapes avec heures (et « RDV pris par le technicien ») · dernière position et trajet en route · photos Avant / Pendant / Après · notes vocales et commentaires du technicien · documents (étiquetage, bon d'intervention, signature) · devis terrain · paiement · fin d'intervention (réserves, étoiles, signataire, avis demandé) · rémunération proposée · retours et bugs envoyés depuis cette fiche.
3. **Rémunérations** : sur le RDV, la proposition du technicien avec Accepter / Modifier / Refuser, et « Marquer payée ».
4. **Planning B** : intégrer planning-b.html dans crm/planning_b.php (copier le style, le bloc #pb-app et le script ; définir window.PLANNING_CONFIG avant le script) :
   - loadRdv(from, to) : les RDV avec les champs du § 3 (+ commande, etapes, telephone, type) ;
   - onAction(action, rdv, data) → Promise renvoyant { rdv } ou { commande } : confirmer · attribuer {technicien} · reattribuer {technicien, debut?} · decaler {debut, technicien} (glisser-déposer) · annuler {avant} · commander (ouvre le parcours de commande existant du devis) · voir_commande · nouveau {date} ;
   - ficheUrl(rdv) et carteUrl.
   Le planning A doit voir les mêmes changements.
5. **Vue Carte du planning** (bouton « Carte » du planning B) : repères numérotés de la couleur du technicien, RDV à attribuer en jaune, position en direct des techniciens (initiales, « il y a 3 min », grisée après 15 min), trajet de chaque tournée, panneau des tournées par technicien (km, temps, étapes), 3 techniciens les plus proches avec « Confier » pour un RDV à attribuer, actualisation des positions toutes les 60 s sans perdre le zoom. Géocodage côté serveur, une seule fois par adresse (lat/lng déjà ajoutés).
6. **Paramétrage › Application terrain** : choix des 4 statuts automatiques par nom (pour corriger « RDV à prendre par tech » sur crmdev).

# 7. À livrer

- Une ou plusieurs PR sur dev. Pour chaque point des § 5 et § 6 : fait / pas fait, fichiers touchés, captures sur crmdev avec des fiches de test.
- Les tests ajoutés et le résultat de la suite (échecs déjà présents signalés).
- La liste de ce que JDDev doit faire sur crmdev (migrations, clés, crons, réglages), y compris ce qui reste du lot 6 : migration sql/migration_api_terrain_lot6.sql, clés VAPID dans private/env.php, cron _scripts/cron_api_terrain_push.php chaque minute.
- Un exemple de requête curl de test pour chaque nouvelle route (avec de faux fichiers pour l'audio, la signature et le PDF), pour que je branche l'appli dessus.
