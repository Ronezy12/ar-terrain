Bonjour Claude. Tu travailles sur le dépôt du CRM de l'Entreprise AR. Je te demande une PR qui rend visible dans le CRM tout ce que font les techniciens avec l'appli mobile « AR Terrain », en temps réel.

## Contexte

- L'appli des techniciens est une PWA séparée (dépôt Ronezy12/ar-terrain, en ligne sur https://ronezy12.github.io/ar-terrain/). Elle parle au CRM uniquement par l'API /api/v1 (jeton Bearer du technicien, réponses JSON). Le lot 6 de cette API est déjà fait (création de RDV, statuts automatiques, « À appeler », réglages, retours, équipe, kits, documents, lat/lng).
- Ce que l'appli envoie déjà au CRM :
  - POST /api/v1/events, champ « action » parmi : appointment.accepted, appointment.confirmed, appointment.created, appointment.updated, appointment.cancelled, tech.on_the_way, tech.delay, tech.arrived, location.update, intervention.completed, note.added, photo.added, quote.created, quote.sent, payment.recorded, review.requested, message.sent, call.logged, client.created, board.saved. Chaque événement porte event_id, occurred_at, client_id et/ou appointment_id, data.
  - POST /api/v1/photos (multipart) : photos du chantier avec leur type (avant, pendant, après travaux).
  - POST /api/v1/documents (multipart) : PDF d'étiquetage (type = etiquetage), bientôt le bon d'intervention signé (type = bon_intervention).
  - POST /api/v1/devis, POST /api/v1/feedback, POST /api/v1/appointments(/{id}).
- Repère-toi dans le code existant de l'API terrain (routes, tables, tests du lot 6) avant d'écrire quoi que ce soit, et réutilise ce qui existe.

## Règles (non négociables)

- Branche dev uniquement. Tests sur crmdev uniquement. Ne jamais toucher à crm26 (production) ni à sa base.
- Mode test actif : aucun SMS ni e-mail réel.
- Aucune donnée client réelle dans le code, les tests, les captures ou la description de la PR (fiches de test uniquement).
- Ne casse pas le planning A ni le planning B. Petits commits lisibles. Ajoute des tests et lance la suite existante (signale les échecs déjà présents avant tes changements).
- Si une table est nécessaire, une seule migration SQL dans sql/, et dis-le clairement dans la PR (c'est JDDev qui l'exécute).

## 1. Notes vocales des techniciens

Aujourd'hui l'appli enregistre la voix du technicien (micro du téléphone) mais n'envoie au CRM qu'une mention « note vocale », sans le son.

- Accepter les fichiers audio sur POST /api/v1/documents avec type = note_vocale : champs client_id, id_rdv (facultatif), event_id, duree_s, fichier (audio/webm, audio/mp4, audio/aac ou audio/mpeg, 10 Mo max). Idempotent sur event_id. Réponse : { "document": { "id", "url" } }.
- Stocker le fichier comme les autres documents de la fiche, accessible seulement aux utilisateurs connectés du CRM.
- Dans la fiche client et dans le RDV : un lecteur audio (balise audio), avec le nom du technicien, la date, la durée.
- Facultatif, seulement si le CRM a déjà un service de transcription : le texte sous le lecteur. Sinon, ne rien ajouter.

## 2. Pop-ups en temps réel pour le bureau

Quand un technicien agit pendant une intervention, les personnes du bureau connectées au CRM doivent le voir tout de suite, dans une petite fenêtre en bas à droite (pas une alerte bloquante).

- Événements qui déclenchent une pop-up : tech.on_the_way (« Karim est en route vers M. X »), tech.delay (retard + minutes), tech.arrived, intervention.completed, photo.added, note vocale, note.added (commentaire du technicien), quote.created (devis terrain à chiffrer), payment.recorded, document envoyé (étiquetage, bon d'intervention), appointment.created par un technicien (« RDV pris par le technicien »), feedback de type bug.
- Contenu : icône, nom du technicien, client, action, heure, et un bouton « Ouvrir » qui mène à la fiche ou au RDV. La pop-up disparaît seule après 8 s, reste si on la survole, et une cloche dans l'en-tête garde l'historique non lu (compteur), avec « Tout marquer comme lu ».
- Technique : une route interne au CRM (session utilisateur, pas l'API des techniciens) qui renvoie les événements depuis le dernier lu, interrogée toutes les 15 s quand l'onglet est visible (pas de websocket si le CRM n'en a pas déjà).
- Réglage par utilisateur dans son profil : quels types de pop-up il veut recevoir, et un son on/off (désactivé par défaut).
- Seuls les profils bureau (Admin +, Commercial sédentaire…) reçoivent ces pop-ups, jamais les techniciens.

## 3. Bouton « App techniciens » dans la fiche client

Dans la fiche client, ajoute un bouton « App techniciens » (à côté des onglets ou des actions existantes) qui ouvre un panneau latéral regroupant tout ce qui vient de l'appli pour ce client, du plus récent au plus ancien :

1. RDV et avancement : pour chaque RDV, les étapes avec leurs heures (Confirmé → En route → Sur place → Terminé), le technicien, et « RDV pris par le technicien » quand c'est le cas.
2. Trajet : la dernière position reçue pendant « En route » (lien Google Maps), avec l'heure.
3. Photos du chantier, rangées par Avant / Pendant / Après travaux, en vignettes cliquables.
4. Notes vocales (lecteur audio) et commentaires du technicien pour le bureau.
5. Documents de l'appli : étiquetage PDF, bon d'intervention signé.
6. Devis terrain envoyés par le technicien (lignes, « à chiffrer »), avec un lien vers le devis du CRM.
7. Paiement enregistré sur place (moyen, montant, n° de chèque).
8. Fin d'intervention : réserves, satisfaction (étoiles), signature, demande d'avis Google envoyée ou non.
9. Retours et bugs envoyés par le technicien depuis cette fiche.

Chaque bloc n'apparaît que s'il a du contenu. Un badge sur le bouton indique le nombre d'éléments nouveaux depuis la dernière ouverture par cet utilisateur. Visible seulement par les profils bureau.

## À livrer

- La PR sur dev, avec une description qui liste, pour chaque point (1, 2, 3) : ce qui est fait, les fichiers touchés, la migration éventuelle, et les captures prises sur crmdev avec des fiches de test.
- Les tests ajoutés et le résultat de la suite (en précisant les échecs déjà présents avant).
- La liste de ce que JDDev doit faire sur crmdev (migration, cron, réglage).
- Pour la route audio : un exemple de requête curl de test (avec un faux fichier), pour que je branche l'appli dessus.
