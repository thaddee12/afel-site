# Site AFEL (Association Femme en Lumière)

Site vitrine et espace membre de l'AFEL (Yaoundé). Intégration par INNOVA ALPHA à partir
du dossier Claude Design du 2026-11-09 (copie dans
`livrables/clients/afel/site-web/handoff-claude-design-2026-11-09/`).

## Choix technique

HTML statique, sans étape de compilation, déployé par FTP sur Hostinger. Les pages tournent sur
le moteur de Claude Design (`support.js`), comme le site d'Entelia. Les composants partagés gardent
l'extension `.dc.html` : c'est sous ce nom que `support.js` les charge (`<dc-import name="Logo">`
charge `Logo.dc.html`).

## Pages

| Page | Fichier | Visibilité |
|---|---|---|
| Accueil | `index.html` | publique |
| Pages intérieures (SMOP, actions, témoignages, association, s'engager, partenaire, don, contact) | `pages.html#…` | publique |
| Adhésion en ligne | `adherer.html` | publique |
| Formulaire d'adhésion imprimable | `formulaire-adhesion.html` | publique |
| Carte VIP Premium | `carte-vip-premium.html` | publique |
| Vérification d'une carte | `verifier.html` | publique |
| Espace présidente | `espace-presidente.html` | privée |
| Générateur de carte | `generateur-carte.html` | privée |

## État

Chantier en cours : tout le site est en `noindex` et le `robots.txt` bloque tout.
