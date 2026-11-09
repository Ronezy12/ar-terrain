# AR Terrain · Entreprise AR

Prototype de l'appli terrain des techniciens Entreprise AR (et de son mode admin), installable sur iPhone et Android.

> **Données fictives.** Rien n'est relié au CRM : aucun message, SMS, e-mail ni paiement n'est réellement envoyé.

## Tester sur son téléphone

Ouvrir le lien GitHub Pages du dépôt sur le téléphone, puis :

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil ».

L'appli s'ouvre alors en plein écran, avec son icône, et fonctionne sans réseau après la première ouverture.

## Contenu

- Technicien : planning (liste, agenda, carte), mode chantier, fin d'intervention avec signature, devis, envoi multicanal, WhatsApp, appels, étiquetage des tableaux (export PDF à l'échelle), scan de tableau, paiement SumUp, avis Google, dictée vocale, trophées cachés (5 touches sur le logo).
- Admin : équipe en direct, suivi en direct, tableau de bord, chiffre d'affaires, personnalisation des boutons et des onglets, accès des techniciens, annonces.

## Structure

| Fichier | Rôle |
| --- | --- |
| `index.html` | L'appli (HTML, CSS et JavaScript) |
| `lib/data.js`, `lib/icons.js`, `lib/pdf.js` | Moteur d'étiquetage repris de l'appli actuelle |
| `vendor/jspdf.umd.min.js` | jsPDF 2.5.2 (licence MIT) pour l'export PDF |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation et fonctionnement hors ligne |

Étape suivante : version native iOS / Android (Capacitor) branchée sur l'API du CRM, avec notifications push, SumUp et publication sur l'App Store et Google Play.
