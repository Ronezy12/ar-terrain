Salut Grok, nouvelle PR : statuts automatiques depuis l'appli AR Terrain + liste « À appeler ». Sur crmdev uniquement, branche dev, jamais crm26, mode test actif, aucune donnée client réelle dans le code ou la PR.

PRINCIPE
L'appli ne change que 5 statuts. Tous les autres restent gérés par le bureau dans le CRM (l'appli ne doit jamais les modifier).

1. STATUTS RDV (prospect)
- « RDV pris » : posé par le bureau. Quand le technicien confirme dans l'appli (événement appointment.confirmed, déjà envoyé), le statut de la fiche NE CHANGE PAS, mais le RDV est marqué confirmé dans les plannings A et B (déjà en place, à garder).
- « RDV à prendre par tech » : posé par le bureau quand il confie un client à un technicien. → le client doit apparaître dans l'appli de ce technicien (voir 3).
- « RDV pris par le technicien » : à poser automatiquement quand le technicien crée ou déplace un RDV depuis l'appli.
  L'appli envoie POST /api/v1/appointments (création) ou POST /api/v1/appointments/{id} (déplacement) avec :
  { event_id, client_id, debut (ISO), duree (min), type, note, source: "technicien", statut_contact: "RDV pris par le technicien" }
  Aujourd'hui cette route répond 405 : merci de la créer (idempotente sur event_id). Elle crée/déplace le RDV dans le planning, l'attribue au technicien connecté, et passe la fiche en « RDV pris par le technicien ». Réponse attendue : { rdv: { id_rdv, … } }.
  En attendant, l'appli écrit une note « [RDV pris par le technicien] … » sur la fiche.

2. STATUTS POSE (automatiques, à partir des événements déjà envoyés par l'appli)
- tech.arrived (« Je suis arrivé ») → fiche en « Pose en cours », SEULEMENT si le RDV est une pose / un chantier (pas pour une visite technique, un devis ou un dépannage).
- intervention.completed (fin d'intervention signée par le client) → fiche en « Pose finie », même condition.
- Les autres statuts de pose (à placer, programmée, à finir, annulée, finie pas facturée, à confirmer par tech / date) restent au bureau.
- Les statuts DEVIS restent 100 % internes au CRM.
- Garder l'historique : chaque changement automatique ajoute une ligne dans l'historique de la fiche (« Statut changé par l'appli : … par <technicien> »).

3. LISTE « À APPELER » POUR L'APPLI
- GET /api/v1/clients?statut=rdv_a_prendre_par_tech
  → les fiches en « RDV à prendre par tech » attribuées au technicien connecté (un admin voit tout).
  Réponse : { clients: [ { id_contact, nom, telephone, adresse, ville, depuis (date du passage dans ce statut) } ] }
- L'appli appelle déjà cette adresse (elle répond 404 pour l'instant) et affiche la liste dès qu'elle existe : accueil (« N clients à appeler ») et écran « À appeler ».

4. RETOURS ET BUGS AUTOMATIQUES (pour la console)
- POST /api/v1/feedback : { event_id, occurred_at, type ("bug"|"idee"|"question"), message, screen, version, device, user_id, user_nom, role, auto (true si erreur automatique), kind ("appli"|"crm") }
- GET /api/v1/feedback?limit=200 (admins uniquement) : { feedback: [ … mêmes champs …, created_at ] }, du plus ancien au plus récent.
- L'appli envoie déjà les erreurs automatiquement (au plus une fois par heure et par téléphone pour la même erreur, 12 max par heure). La console les affiche dans « Bugs en direct », actualisée toutes les minutes.
- En attendant cette route, tout passe en commentaire sur la fiche « Retours AR Terrain » choisie dans la console.

À FAIRE VALIDER
- Sur des fiches de test : « Je suis arrivé » sur une pose → « Pose en cours » ; fin signée → « Pose finie » ; visite technique → aucun changement.
- RDV pris depuis l'appli → RDV dans les plannings A et B + fiche en « RDV pris par le technicien ».
- Fiche passée en « RDV à prendre par tech » → visible dans l'appli du bon technicien seulement.
- Aucun autre statut n'est modifié par l'appli.
