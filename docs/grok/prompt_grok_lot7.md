Salut Grok, merci pour le lot 6, tout répond bien sur crmdev (testé : À appeler, retours, équipe, kits, réglages, documents, lat/lng). L'appli envoie maintenant les vrais types (POSE, PREVISITE, DÉPANNAGE, SAV) quand le technicien prend un RDV. Voici le lot 7. Mêmes règles : branche dev, crmdev uniquement, jamais crm26, mode test actif, fiches de test uniquement, écritures idempotentes sur event_id.

1. DEVIS ENVOYÉ PAR LE TECHNICIEN : NE PAS CHANGER LE STATUT DE LA FICHE
   Quand l'appli envoie POST /api/v1/devis (a_chiffrer: true), le CRM passe la fiche en « Devis à faire » alors que le RDV n'est pas fini.
   À faire : ne pas toucher au statut de la fiche à la création d'un devis depuis l'appli (le bureau s'en occupe), ou au plus tôt après intervention.completed.

2. NUMÉRO DU CLIENT VISIBLE SEULEMENT POUR LE BON TECHNICIEN
   Dans GET /api/v1/appointments, GET /api/v1/clients/{id} et GET /api/v1/clients?statut=… : ne renvoyer « telephone » (et l'e-mail) au technicien que si :
   - il est le technicien attribué au RDV (ou le technicien du dossier pour « RDV à prendre par tech »), et
   - le RDV est confirmé par lui, ou il est sur place.
   Sinon renvoyer "telephone": null et "telephone_masque": true. Les admins voient toujours tout.

3. RÉMUNÉRATION PROPOSÉE PAR LE TECHNICIEN
   POST /api/v1/remunerations ← { "event_id", "id_rdv", "montant": 150.00, "commentaire": "..." }
   → enregistrée « proposée », visible par le bureau sur le RDV, qui peut l'accepter / la modifier / la refuser.
   GET /api/v1/remunerations?from=AAAA-MM-JJ&to=AAAA-MM-JJ → { "remunerations": [ { "id", "id_rdv", "date", "client", "type", "montant", "statut": "proposee"|"acceptee"|"refusee"|"payee", "payee_le" } ] }
   Un technicien ne voit que les siennes, un admin voit tout (filtre ?technicien=id_crmuser).

4. TABLEAU DE BORD DU TECHNICIEN
   GET /api/v1/me/dashboard?mois=AAAA-MM →
   { "mois": "2026-11", "interventions": 23, "par_type": { "POSE": 12, "DÉPANNAGE": 6, "PREVISITE": 3, "SAV": 2 },
     "ca_mois": 0, "ca_mois_precedent": 0, "ca_annee": 0,
     "du": 1250.00, "paye_mois": 800.00, "en_attente": 450.00 }
   - ca_* = chiffre d'affaires des interventions du technicien (factures du CRM).
   - du = rémunérations acceptées pas encore payées ; paye_mois = payées ce mois ; en_attente = proposées pas encore acceptées.
   Le technicien ne voit que ses chiffres. Un admin peut passer ?technicien=id_crmuser.

5. BON D'INTERVENTION SIGNÉ
   L'appli va générer un vrai bon d'intervention PDF à la signature du client (travaux, réserves, paiement, signature) et l'envoyer sur POST /api/v1/documents avec type = "bon_intervention" (même route que l'étiquetage, déjà faite).
   À faire : accepter ce type et le ranger dans les documents de la fiche + du RDV.

6. PAIEMENT ENREGISTRÉ À LA FIN DE L'INTERVENTION
   L'appli envoie déjà l'événement payment.recorded. Champs : { "appointment_id", "client_id", "data": { "montant", "moyen": "cheque"|"virement"|"carte"|"especes", "numero_cheque", "banque", "foreign_tx_id" } }
   À faire : l'enregistrer comme règlement sur la fiche / la facture si elle existe (sinon en note).

7. AVIS GOOGLE PAR E-MAIL
   POST /api/v1/avis/demande ← { "event_id", "client_id", "id_rdv", "canal": "email" }
   → le CRM envoie au client l'e-mail de demande d'avis avec le lien Google de l'entreprise (en mode test : pas d'envoi réel, juste une trace).
   (Le WhatsApp, l'appli l'ouvre elle-même avec le message prérempli.)

8. SUIVI DU TECHNICIEN EN ROUTE SUR LA CARTE DU CRM
   L'appli envoie location.update toutes les ~30 s entre « Je suis en route » et « Je suis arrivé » (lat, lng, précision).
   À faire : afficher ce trajet en direct sur la carte du planning (voir le prompt carte) et dans la fiche du RDV.

À FAIRE VALIDER : pour chaque point, ce qui est fait / pas fait, avec un test sur une fiche de test.
