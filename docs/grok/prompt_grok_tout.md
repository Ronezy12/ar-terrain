Salut Grok, voici tout ce qu'il manque côté CRM pour que l'appli des techniciens (AR Terrain) soit 100 % fonctionnelle. L'appli appelle DÉJÀ ces adresses : dès qu'elles répondent, tout s'active tout seul, sans mise à jour de l'appli (sauf le point 9).

RÈGLES (comme d'habitude)
- Branche dev, tests sur crmdev uniquement, jamais crm26 (production). Mode test actif (aucun SMS réel).
- Aucune donnée client réelle dans le code, les captures ou la PR : fiches de test uniquement.
- Toutes les routes sous /api/v1, authentifiées par le jeton du technicien (Authorization: Bearer), réponses JSON.
- Les écritures doivent être idempotentes sur event_id (ou l'en-tête Idempotency-Key) : l'appli renvoie la même demande si le réseau coupe.

══════════ PRIORITÉ 1 : indispensable ══════════

1. CRÉER / DÉPLACER UN RDV DEPUIS L'APPLI (aujourd'hui : 405)
   POST /api/v1/appointments          → création
   POST /api/v1/appointments/{id_rdv} → déplacement d'un RDV existant
   Corps envoyé par l'appli :
   { "event_id": "uuid", "client_id": 9323, "debut": "2026-11-20T14:00:00+01:00", "duree": 90,
     "type": "Intervention", "note": "code portail 1234", "source": "technicien",
     "statut_contact": "RDV pris par le technicien" }
   À faire : créer/déplacer le RDV dans le planning (A et B), l'attribuer au technicien connecté, passer la fiche en « RDV pris par le technicien ».
   Réponse attendue : { "rdv": { "id_rdv": 7001, ... } } (statut 200 ou 201).
   En attendant, l'appli écrit une note « [RDV pris par le technicien] … » sur la fiche.

2. STATUTS AUTOMATIQUES (à partir des événements que l'appli envoie déjà sur POST /api/v1/events)
   - tech.arrived (« Je suis arrivé ») → fiche en « Pose en cours », SEULEMENT si le RDV est une pose / un chantier.
   - intervention.completed (fin signée par le client) → fiche en « Pose finie », même condition.
   - appointment.confirmed (pouce vert du technicien) → la fiche reste « RDV pris », le RDV est marqué confirmé dans les plannings (déjà en place, à garder).
   - Aucun autre statut ne doit être modifié par l'appli (les statuts devis restent 100 % internes).
   - Chaque changement automatique ajoute une ligne dans l'historique de la fiche.

3. LISTE « À APPELER » (aujourd'hui : 404)
   GET /api/v1/clients?statut=rdv_a_prendre_par_tech
   → les fiches en « RDV à prendre par tech » attribuées au technicien connecté (un admin voit tout).
   Réponse : { "clients": [ { "id_contact": 9323, "nom": "...", "telephone": "06...", "adresse": "...", "ville": "...", "depuis": "2026-11-17" } ] }

4. RÉGLAGES DE LA CONSOLE (GET/POST /api/v1/settings existe)
   Aujourd'hui le CRM ne garde que 8 champs (tabs, quick, techAccess, simple, shape, size, tour, notif) et jette les autres.
   À faire : enregistrer l'objet « app » TEL QUEL (JSON complet), y compris maint, fb, pay, avis, fiche, bureau, perso.
   (En attendant, la console les range dans techAccess._ext ; ça continuera de marcher après ta modification.)

5. RETOURS ET BUGS AUTOMATIQUES (aujourd'hui : 404)
   POST /api/v1/feedback
   { "event_id", "occurred_at", "type": "bug"|"idee"|"question", "message", "screen", "version", "device",
     "user_id", "user_nom", "role", "auto": true|false, "kind": "appli"|"crm" }
   GET /api/v1/feedback?limit=200 (admins uniquement) → { "feedback": [ ...mêmes champs..., "created_at" ] }
   La console les affiche dans « Retours des utilisateurs » et « Bugs en direct » (actualisée chaque minute).

══════════ PRIORITÉ 2 : confort ══════════

6. NOTIFICATIONS SUR LE TÉLÉPHONE (aujourd'hui : 503 sur push/key)
   GET  /api/v1/push/key         → { "publicKey": "<clé publique VAPID>" }
   POST /api/v1/push/subscribe   ← { "endpoint", "keys": { "p256dh", "auth" }, "platform": "ios"|"android"|"web", "app_version" }
   POST /api/v1/push/unsubscribe ← { "endpoint" }
   Le CRM envoie une notification Web Push au technicien quand : un RDV lui est attribué, déplacé ou annulé, et quand un client lui est confié (« RDV à prendre par tech »).
   Contenu de la notification : { "title", "body", "id_rdv" (si RDV), "url" } ; l'appli ouvre le bon RDV au clic.
   Clé privée VAPID uniquement côté serveur, jamais dans le code de l'appli.

7. ÉQUIPE (aujourd'hui : 404)
   GET /api/v1/technicians (admins) → { "technicians": [ { "id_crmuser", "nom", "telephone", "actif": true } ] }
   Sert à la console (Équipe et droits, réglages par personne) et à l'accueil admin de l'appli.

8. KITS DE DEVIS (aujourd'hui : 404)
   GET /api/v1/kits → { "kits": [ { "id_kit", "nom", "lignes": [ { "id_article", "quantite" } ] } ] }
   id_article = le même identifiant que dans GET /api/v1/catalogue.

9. ÉTIQUETAGE DU TABLEAU ÉLECTRIQUE ENVOYÉ SUR LA FICHE (nouvelle route)
   POST /api/v1/documents (multipart/form-data)
   champs : client_id, id_rdv (facultatif), type = "etiquetage", event_id, fichier (PDF)
   → le PDF est rangé dans les documents de la fiche client. Réponse : { "document": { "id", "url" } }
   (Je brancherai l'appli dessus dès que la route existe.)

10. CHAMPS EN PLUS DANS GET /api/v1/appointments
   Ajouter à chaque RDV, s'ils existent : telephone, type (Pose, Dépannage, Prévisite, SAV, Chantier…),
   lat / lng de l'adresse (géocodée côté serveur une seule fois),
   commande : { "statut": "a_faire"|"passee", "passee_le", "url" } ou null,
   etapes : { "confirme", "en_route", "sur_place", "termine" } (heures ISO).

À FAIRE VALIDER (captures sur crmdev, fiches de test)
- RDV pris depuis l'appli → visible dans les plannings A et B, fiche en « RDV pris par le technicien ».
- « Je suis arrivé » sur une pose → « Pose en cours » ; fin signée → « Pose finie » ; visite technique → aucun changement.
- Fiche passée en « RDV à prendre par tech » → visible dans « À appeler » du bon technicien uniquement, + notification.
- Console : publier un numéro du bureau → GET settings le renvoie bien.
- Un retour envoyé depuis l'appli → visible dans GET feedback.
- Pour chaque point : dire ce qui est fait et ce qui ne l'est pas encore.

(Les PR « Planning B » et « Carte » ont leurs propres messages : docs/grok/prompt_grok_maj_pr_planning.md et docs/grok/prompt_grok_carte.md.)
