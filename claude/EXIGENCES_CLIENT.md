# Exigences Client - Rapport HTML Premium

## 🎯 Vision Globale

Le rapport doit avoir une **qualité "premium clinique"** style Oura/Ultrahuman.
Pas de "template AI", pas de "blabla générique".

## ✅ Exigences Validées

### Header/Hero
- [x] Afficher le **prénom** du client (pas l'ID)
- [x] Afficher l'**email** du client
- [x] Afficher la **date de génération**
- [x] Thème **light par défaut** (beige/crème/violet/noir)
- [x] Message d'accueil personnalisé: "Salut {prénom}. Voici ton audit 360..."

### Table des Matières (TOC)
- [x] **Toujours visible** à gauche (position: fixed)
- [x] **Animée** (smooth scroll)
- [x] **Non tronquée** (labels complets)
- [x] Toggle pour réduire/agrandir

### Contenu
- [x] **Zéro emoji** dans le rapport
- [x] **Zéro ASCII art** (barres ████)
- [x] **Pas de "Info à clarifier"** visible pour le client
- [x] **Pas de "tests vidéo"** → remplacer par "À confirmer avec kiné/ostéo"
- [x] Phrases **non tronquées** (pas de "qui comm." coupé)

### Scores
- [x] Score global dans le hero (gauge SVG)
- [x] Scores par section (seulement pour "analysis")
- [x] **Pas de score** pour Executive Summary
- [x] **Pas de score** pour les protocoles

### Radar/Profil
- [x] Titre: **"Profil 360"** (pas "Profil Métabolique")
- [x] Labels **non tronqués**
- [x] Animé au chargement

### CTA Coaching
- [x] Module **premium visuellement** (cartes)
- [x] **Boutons clairs** (pas juste du texte)
- [x] Mention **"79€ 100% déduit"** du coaching
- [x] Code promo visible
- [x] Garanties affichées

### Règles Nutrition
- [x] Si pas d'abdos visibles: **pas de glucides 4h après réveil**
- [x] Si surpoids: **jeûne 16/8** (12h-20h)

### Compléments
- [x] Expliquer **mécanismes d'action**
- [x] Comment **lire les étiquettes**
- [x] Comment **ne pas se faire arnaquer**
- [x] Marqueurs de qualité

## 🔴 Exigences Non Résolues

### Analyse Photo
- [ ] L'analyse doit **réellement utiliser les photos**
- [ ] Mesures **angulaires** (CVA, angle épaule, etc.)
- [ ] **Preuves visuelles** dans le texte: "Sur ta photo de profil, ta tête est projetée de X°..."
- [ ] Pas de "je ne peux pas analyser car pas de photos" si photos fournies

### Performance
- [ ] Génération en **<5 minutes** (actuellement 15-20 min)
- [ ] Pas de sections en **mode dégradé**

## 📝 Ton et Style

### À faire
- Tutoiement naturel
- Explications claires des mécanismes
- Actionnable (quoi faire concrètement)
- Personnalisé (utiliser les données du questionnaire)

### À éviter
- Jargon médical non expliqué
- Promesses médicales (pas "guérir", "diagnostiquer")
- Termes qui font peur ("cortisol" → "protocole circadien")
- Généralités qui s'appliquent à tout le monde

## 🎨 Palette Couleurs (Thème Light)

```css
--surface-0: #faf8f5;      /* Fond principal (crème) */
--surface-1: #f5f2ed;      /* Fond secondaire */
--surface-2: #ebe7e0;      /* Fond tertiaire */
--primary: #6b5b95;        /* Violet principal */
--primary-glow: rgba(107, 91, 149, 0.15);
--accent: #d4a574;         /* Accent doré */
--text: #2d2a26;           /* Texte principal (noir chaud) */
--text-muted: #6b6560;     /* Texte secondaire */
```

## 📱 Responsive

- Desktop: TOC à gauche, contenu à droite
- Mobile: TOC en overlay (toggle)
- Minimum 320px de large supporté

## 🔒 Sécurité

- Pas d'IDs sensibles exposés dans le HTML
- Validation serveur des données
- CSP stricte si pages statiques
- Sanitation des inputs utilisateur

