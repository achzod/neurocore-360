# 💎 NEUROCORE 360 - SYSTÈME DESIGN ÉLITE V4

Ce dossier contient les fichiers nécessaires pour transformer tes audits en rapports de luxe (Design "Elite"). 

## 🚀 Ce qui a changé
1. **Zéro ASCII** : Le système nettoie automatiquement les barres `[■■■]` et les séparateurs `===`. Tout est remplacé par du design pur.
2. **Graphiques SVG** : Le rapport HTML génère maintenant de vrais graphiques (Jauges circulaires et Radar métabolique en toile d'araignée).
3. **Photos Intégrées** : Les clichés du client sont injectés directement dans le rapport avec un cadre "Clinique".
4. **Narration d'Expert** : Gemini est forcé de rédiger des paragraphes denses et d'utiliser des émojis de précision au lieu de listes à puces d'IA.

## 📁 Contenu du dossier
- `server/exportService.ts` : **Moteur de rendu principal**. C'est ici que la magie du HTML de luxe opère.
- `server/geminiPremiumEngine.ts` : **Le Cerveau**. Contient les instructions strictes pour le ton "Chirurgien Olympique".
- `server/photoAnalysisAI.ts` : **L'Expert Vision**. Analyse les photos et prépare le texte narratif.
- `server/formatDashboard.ts` : **Le Filtre**. Nettoie le texte brut pour l'affichage dashboard.
- `server/routes.ts` : Gère le passage des photos aux moteurs d'export.
- `client/AuditDetail.tsx` : La vue frontend qui affiche le dashboard avec les nouveaux styles.

## 🛠️ Installation sur Replit
1. Copie le contenu de `design/server/` dans le dossier `server/` de ton projet Replit.
2. Copie `design/client/AuditDetail.tsx` dans `client/src/pages/`.
3. Redémarre ton serveur.

## 🩺 Conseils de Maintenance
- **Pour changer les couleurs** : Ouvre `server/exportService.ts` et modifie les variables CSS au début du fichier (`--primary`, `--navy`, etc.).
- **Pour changer le ton de l'IA** : Modifie `MASTER_PERSONA` au début de `server/geminiPremiumEngine.ts`.

---
*Développé par ACHZOD - Neurocore 360*

