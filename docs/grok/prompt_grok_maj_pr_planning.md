Salut Grok, mise à jour de la PR du PLANNING B (crm/planning_b.php), sur crmdev. Mêmes règles que d'habitude : branche dev, crmdev uniquement, jamais crm26, mode test actif, aucune donnée client réelle.

CODE DE RÉFÉRENCE (à jour, prêt à intégrer)
https://github.com/Ronezy12/ar-terrain/blob/main/planning-b.html
Fichier autonome HTML + CSS + JS, sans dépendance. Le mode d'intégration est expliqué en commentaire en haut du fichier :
- copier le <style>, le <div id="pb-app"> et le <script> dans planning_b.php ;
- définir window.PLANNING_CONFIG avant le script : loadRdv, onAction, ficheUrl, carteUrl.
Merci de repartir de ce fichier plutôt que de recoder : tout ce qui est listé ci-dessous y est déjà et a été testé.

CHANGEMENTS DEPUIS LA DERNIÈRE VERSION
1. Plus de RDV illisibles quand il y en a beaucoup en même temps : au-delà de ce qui tient dans la largeur (≈ 115 px par RDV), les RDV simultanés sont regroupés en UN bloc « 8 RDV en même temps · 09:00 – 19:30 », avec une ligne par RDV (initiales du technicien, heure, nom du client). Clic sur une ligne = fiche du RDV. Clic sur le titre = vue Jour par technicien. Bord rouge si conflit.
2. Grille plus marquée : traits des heures plus sombres, trait léger à la demi-heure, séparations des jours plus visibles.
3. Initiales du technicien sur chaque RDV (pastille ronde de sa couleur ; « ? » en pointillés si non attribué), et dans la liste des techniciens. On ne dépend plus seulement des couleurs.
4. Filtres « Afficher seulement » : cliquer un statut n'affiche QUE ce statut ; plusieurs combinables ; nombre sur chaque bouton ; « Tout afficher » remet tout.
5. Conflits : deux RDV du même technicien qui se chevauchent sont signalés (bandeau rouge « ⚠ conflit d'horaire » + bouton « Voir »), et le glisser-déposer refuse un créneau déjà pris.
6. Bouton « Commander » toujours visible sur les RDV (sauf terminés / non attribués) et gros bouton jaune « Faire la commande du matériel » dans la fiche. Devient « ✓ Commandé » vert quand commande.statut = "passee".
7. Fiche RDV : section « Libres à cette heure » (3 techniciens sans RDV sur ce créneau, bouton « Confier »), lien « Appeler » si le RDV a un téléphone.
8. Vue Mois : résumé en haut (« 30 RDV en novembre · 10 à confirmer · 3 à attribuer »), légende de charge, initiales des techniciens, et panneau « Journée sélectionnée » à droite (liste des RDV, « Ouvrir la journée », « + RDV ce jour »). Double-clic sur un jour = vue Jour.
9. Mini-calendrier et en-têtes de jour cliquables, aucun saut de page (position de défilement conservée, effets seulement à la navigation).
10. Bouton « Carte » dans l'en-tête → PLANNING_CONFIG.carteUrl (voir la PR carte séparée).

CE QU'IL FAUT BRANCHER CÔTÉ CRM
A. loadRdv(from, to) : renvoyer les RDV du planning B avec ces champs (les noms de l'API v1 sont reconnus) :
   id_rdv, id_contact, debut (ISO), duree (min), nom, adresse, installateur, technicien_id, statut, type,
   telephone, note,
   commande: { statut: "a_faire"|"passee", passee_le, url } | null,
   etapes: { confirme, en_route, sur_place, termine } (heures ISO).
   Le même contenu doit sortir de GET /api/v1/appointments (ajouter telephone, type, commande, etapes s'ils manquent).
B. onAction(action, rdv, data) → Promise. Renvoyer {rdv:{…}} à jour, ou {commande:{…}} pour la commande. Rejeter la Promise = le planning annule le changement.
   - confirmer
   - attribuer {technicien}
   - reattribuer {technicien, debut?}
   - decaler {debut, technicien}   (glisser-déposer)
   - annuler {avant}               (bouton « Annuler » pendant 5 s)
   - commander                     → ouvrir le parcours de commande existant pour le devis du client, renvoyer {commande}
   - voir_commande
   - nouveau {date}                (rdv = null : ouvrir la création de RDV pré-remplie)
C. ficheUrl(rdv) : lien vers la fiche client du CRM (actuellement /crm/fiche.php?id=…, à corriger si besoin).
D. carteUrl : voir la PR carte.
E. Toute modification faite dans le planning B doit apparaître dans le planning A et dans l'appli des techniciens (mêmes RDV).

À FAIRE VALIDER
- Captures sur crmdev (fiches de test) : une semaine chargée avec RDV simultanés (bloc groupé), un conflit, la vue Mois avec la journée sélectionnée, la fiche d'un RDV avec « Faire la commande » et « Libres à cette heure ».
- Tester chaque action de B et dire celles qui ne sont pas encore branchées.
- Confirmer que le planning A n'est pas cassé.
