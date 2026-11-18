Bonjour Claude. PR urgente et courte sur le dépôt du CRM : le suivi des techniciens en route ne fonctionne pas (ni dans l'appli côté admin, ni sur la cartographie du CRM). Mêmes règles que d'habitude : branche dev, crmdev uniquement, jamais crm26, mode test actif, fiches de test uniquement, tests ajoutés.

## Ce que j'ai constaté sur crmdev (GET /api/v1/appointments du jour)

- Quand le technicien appuie sur « Je suis en route » (événement tech.on_the_way), le RDV reste en statut « confirmé » et etapes.en_route reste null.
- Quand il appuie sur « Je suis arrivé » (tech.arrived), la position est bien enregistrée (position.source = "tech.arrived"), mais etapes.sur_place reste null.
- Les événements location.update (envoyés toutes les ~30 s pendant le trajet, data.position = { lat, lng, accuracy_m }) ne semblent pas mettre à jour la position du RDV.
- Résultat : l'admin ne voit jamais personne « en route », et ne peut pas suivre.
- GET /api/v1/push/key répond 503 « Notifications non configurées » (normal tant que les clés VAPID ne sont pas posées) ; un utilisateur voit aussi une erreur 503 côté CRM : vérifie si une page du CRM appelle ce service ou une autre route qui répond 503, et corrige-la pour qu'elle ne bloque rien.

## À faire

1. Sur tech.on_the_way : etapes.en_route = occurred_at, statut du RDV « En route » (le statut RDV, pas celui de la fiche client), position = data.position avec source "tech.on_the_way" et recorded_at.
2. Sur location.update : mettre à jour la position du RDV en cours du technicien (source "location.update", recorded_at, accuracy_m, speed_kmh si fourni) et l'ajouter au trajet du jour (garder les points du jour, pas plus de 24 h).
3. Sur tech.arrived : etapes.sur_place = occurred_at, statut du RDV « Sur place », position (source "tech.arrived").
4. Sur intervention.completed : etapes.termine, statut « Terminé » (déjà en place, à garder). Les statuts automatiques de la fiche (« Pose en cours », « Pose finie ») restent comme aujourd'hui.
5. Nouvelle route pour les admins : GET /api/v1/positions → la dernière position connue de chaque technicien actif aujourd'hui :
   { "positions": [ { "id_crmuser", "nom", "lat", "lng", "accuracy_m", "speed_kmh", "recorded_at", "source", "etat": "en_route"|"sur_place"|"libre", "id_rdv", "client": "...", "destination": { "lat", "lng", "adresse" } } ] }
   et GET /api/v1/positions/{id_crmuser}/trajet?date=AAAA-MM-JJ → { "points": [ { "lat", "lng", "recorded_at" } ] }.
   Un technicien n'a pas accès à ces routes (403).
6. Cartographie du CRM (page carte existante du planning) : afficher en direct la position des techniciens à partir de ces données (pastille aux initiales et couleur du technicien, « il y a 3 min », grisée après 15 min, trait du trajet du jour, destination), actualisée toutes les 60 s sans perdre le zoom. Clic sur un technicien : son RDV en cours, l'heure d'arrivée prévue, boutons « Appeler » et « Ouvrir le RDV ».
7. Dans GET /api/v1/appointments, garder la forme actuelle de position : { lat, lng, accuracy_m, speed_kmh, source, recorded_at }. Les champs lat / lng à la racine du RDV restent l'adresse du client.

## À livrer

- La PR sur dev avec, pour chaque point : fait / pas fait, captures sur crmdev (un technicien de test qui passe « en route » puis « sur place »).
- Les tests ajoutés et le résultat de la suite.
- Un exemple curl pour GET /api/v1/positions et pour le trajet, pour que je branche l'appli dessus.
- Rappel pour JDDev : les clés VAPID dans private/env.php (sinon push/key reste en 503), la migration du lot 6 et le cron des notifications.
