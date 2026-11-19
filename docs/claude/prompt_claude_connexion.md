Bonjour Claude. Problème de connexion à vérifier sur le dépôt du CRM (branche dev, crmdev uniquement, jamais crm26, aucune donnée ni identifiant réel dans le code, les tests ou la PR).

## Constat

Depuis quelques jours, un compte du bureau n'arrive plus à se connecter à l'appli AR Terrain :
POST /api/v1/auth/login { "email": "...", "psw": "...", "code_2fa": "" } → 401 { "error": "Informations incorrectes." }
- L'appli envoie bien les champs attendus (vérifié : sans « psw » le CRM répond 422 « Champs obligatoires manquants », avec un compte inexistant il répond 401 « Informations incorrectes »). La requête OPTIONS (CORS) depuis https://ronezy12.github.io répond 204.
- Le même message est renvoyé pour TOUS les échecs, donc impossible de savoir pourquoi le compte est refusé.

## À faire

1. Vérifier que POST /api/v1/auth/login utilise exactement la même vérification que la connexion web du CRM (même colonne de mot de passe, même algorithme de hachage, même gestion des anciens mots de passe, même table d'utilisateurs). Regarder en particulier si une PR récente (lots 6 et 7, PR #374) a modifié l'authentification, la table des utilisateurs ou le contrôle des profils.
2. Vérifier les autres causes possibles d'un 401 : compte désactivé, profil non autorisé pour l'API terrain, double authentification activée sur le compte (code_2fa vide), blocage après plusieurs essais, e-mail avec majuscules ou espaces (comparer sans tenir compte de la casse et après trim de l'e-mail, jamais du mot de passe).
3. Garder un message générique pour le mot de passe faux (« Informations incorrectes »), mais renvoyer un code clair quand le mot de passe est BON et que c'est autre chose qui bloque :
   - { "error": "Code de double authentification requis.", "code": "2fa_requis" } (401)
   - { "error": "Code de double authentification incorrect.", "code": "2fa_invalide" } (401)
   - { "error": "Compte désactivé, contactez le bureau.", "code": "compte_inactif" } (403)
   - { "error": "Ce profil n'a pas accès à l'appli terrain.", "code": "profil_refuse" } (403)
   - { "error": "Trop d'essais, réessayez dans 15 minutes.", "code": "trop_essais" } (429)
4. Journaliser chaque échec de connexion côté serveur (date, e-mail, motif interne, IP), sans jamais écrire le mot de passe, pour qu'un admin puisse comprendre un refus.
5. Tests : connexion OK, mauvais mot de passe, compte inexistant, compte désactivé, 2FA requis / faux / bon, trop d'essais.

## À livrer

La PR sur dev, la cause trouvée pour ce refus (sans citer le compte), les tests et leur résultat. Je mettrai l'appli à jour pour afficher ces messages clairs.
