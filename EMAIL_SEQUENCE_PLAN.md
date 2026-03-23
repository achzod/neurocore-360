# 📧 PLAN SÉQUENCE EMAIL POST-DISCOVERY

**Objectif:** Convertir les 229 Discovery Scan gratuits vers Ultimate (79€) ou Anabolic (59€)

**Target:** Utilisateurs ayant complété leur Discovery Scan

---

## 🎯 ARCHITECTURE DE LA SÉQUENCE

### Trigger automatique:
- Quand un Discovery Scan passe en statut `completed`
- Envoyer email J+0 immédiatement
- Schedule emails J+1, J+3, J+7

### Variables dynamiques à injecter:
- `{firstName}` - Prénom du user
- `{discoveryLink}` - Lien vers le rapport Discovery
- `{ultimateLink}` - https://apexlabs.onrender.com/offers/ultimate-scan
- `{anabolicLink}` - https://apexlabs.onrender.com/offers/anabolic-bioscan
- `{promoCode}` - DISCOVERY20 (pour J+7)

---

## ✉️ EMAIL J+0 - RAPPORT PRÊT

**Timing:** Immédiatement après completion du Discovery

**Sujet:** ✅ Ton Discovery Scan est prêt

**Preview:** Tu vas voir tes blocages métaboliques, ton profil hormonal, et tes axes à optimiser

**Corps (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #222222; border-radius: 4px;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FCDD00;">
                APEXLABS
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #666666;">
                by Achzod
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Salut <strong style="color: #ffffff;">{firstName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Ton Discovery Scan est disponible ici :
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{discoveryLink}" style="display: inline-block; padding: 16px 32px; background-color: #FCDD00; color: #000000; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Voir mon rapport
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu vas voir :
              </p>
              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #cccccc;">
                <li style="margin: 0 0 8px 0;">Tes blocages métaboliques</li>
                <li style="margin: 0 0 8px 0;">Ton profil hormonal</li>
                <li>Tes axes à optimiser</li>
              </ul>

              <div style="padding: 20px; background-color: #1a1a1a; border-left: 3px solid #FCDD00; margin: 0 0 30px 0;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #FCDD00; font-weight: 700;">
                  📊 Tu as reçu ton diagnostic
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #cccccc;">
                  Maintenant, tu veux les <strong style="color: #ffffff;">SOLUTIONS</strong> ?
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #cccccc;">
                  Ultimate Scan = Discovery + Protocoles exacts + Wearables + Posture 3D
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{ultimateLink}" style="display: inline-block; padding: 14px 28px; background-color: #FCDD00; color: #000000; text-decoration: none; font-weight: 700; font-size: 13px; border-radius: 4px;">
                      Upgrade vers Ultimate (79€)
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; font-size: 12px; text-align: center; color: #888888;">
                💰 100% déductible de ton coaching • 🎁 Livré en 24-48h
              </p>

              <p style="margin: 0 0 8px 0; font-size: 14px; color: #888888;">
                PS: 52 personnes ont upgradé cette semaine. C'est le scan des athlètes Elite.
              </p>

              <p style="margin: 30px 0 0 0; font-size: 14px; color: #cccccc;">
                — Achzod<br>
                <span style="font-size: 11px; color: #666666;">Certifié ISSA, NASM, 10+ certifications</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666666;">
                APEXLABS by Achzod<br>
                Optimisation Humaine & Bio-Data
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## ✉️ EMAIL J+1 - COMMENT CORRIGER

**Timing:** 24h après completion du Discovery

**Sujet:** Tu as vu tes blocages. Voici comment les corriger.

**Preview:** Ces problèmes se corrigent avec des protocoles précis, pas des conseils génériques

**Corps (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #222222; border-radius: 4px;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FCDD00;">
                APEXLABS
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                {firstName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu as fait ton Discovery hier.
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu te rappelles de tes blocages détectés ?
              </p>

              <div style="padding: 20px; background-color: #1a1a1a; border-left: 3px solid #FF4444; margin: 0 0 30px 0;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #FF4444;">
                  ⚠️ Tes 3 pires blocages :
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #cccccc;">
                  <li style="margin: 0 0 8px 0;">Cortisol élevé (stress chronique)</li>
                  <li style="margin: 0 0 8px 0;">Sommeil fragmenté (récupération faible)</li>
                  <li>Digestion compromise (inflammation)</li>
                </ul>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Ces problèmes se corrigent avec des <strong style="color: #FCDD00;">protocoles PRÉCIS</strong>.
              </p>

              <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Pas "mange mieux" ou "dors plus".
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Je parle de :
              </p>

              <div style="padding: 20px; background-color: #1a1a1a; border: 1px solid #FCDD0030; margin: 0 0 30px 0;">
                <ul style="margin: 0; padding-left: 20px; color: #cccccc;">
                  <li style="margin: 0 0 12px 0;">✅ Protocole Anti-Cortisol Matin (7 étapes exactes)</li>
                  <li style="margin: 0 0 12px 0;">✅ Stack Suppléments personnalisé (doses, timing, marques)</li>
                  <li style="margin: 0;">✅ Reset Digestif 14 jours (plan jour par jour)</li>
                </ul>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tout ça, c'est dans <strong style="color: #FCDD00;">Ultimate Scan</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{ultimateLink}" style="display: inline-block; padding: 16px 32px; background-color: #FCDD00; color: #000000; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 4px;">
                      Je veux les protocoles (79€)
                    </a>
                  </td>
                </tr>
              </table>

              <div style="padding: 16px; background-color: #1a1a1a; border-left: 3px solid #4A9EFF; margin: 0 0 20px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #cccccc;">
                  💡 <strong style="color: #4A9EFF;">Fun fact:</strong> Ultimate intègre tes données Apple Watch / Garmin.
                  Tu vois ta progression en temps réel (HRV, sommeil, récupération).
                </p>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #cccccc;">
                Zéro devinettes. Juste <strong style="color: #ffffff;">TES données + de la science</strong>.
              </p>

              <p style="margin: 30px 0 0 0; font-size: 14px; color: #cccccc;">
                — Achzod
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666666;">
                APEXLABS by Achzod
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## ✉️ EMAIL J+3 - SOCIAL PROOF

**Timing:** 72h après completion du Discovery

**Sujet:** ⚠️ Magroud W. avait les MÊMES problèmes que toi

**Preview:** Voici ce qu'il dit après avoir pris Ultimate Scan

**Corps (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #222222; border-radius: 4px;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FCDD00;">
                APEXLABS
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                {firstName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu connais Magroud W. ?
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                C'est un des 6 clients qui ont laissé un avis 5 étoiles.
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Il avait fait son Discovery Scan (comme toi).
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Il a vu les mêmes blocages que toi :
              </p>

              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #cccccc;">
                <li style="margin: 0 0 8px 0;">Cortisol élevé</li>
                <li style="margin: 0 0 8px 0;">Sommeil fragmenté</li>
                <li>Récupération lente</li>
              </ul>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Il a pris <strong style="color: #FCDD00;">Ultimate Scan</strong>.
              </p>

              <div style="padding: 24px; background-color: #1a1a1a; border-left: 4px solid #FCDD00; margin: 0 0 30px 0;">
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #FCDD00; font-weight: 700;">
                  💬 Voici ce qu'il dit :
                </p>
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #ffffff; font-style: italic;">
                  "J'ai fait des études de biologie et je ne peux que vous dire que ces analyses sont juste impressionnantes, la qualité de ces analyses et sa connaissance sur la biologie et le métabolisme c'est dingue. Je recommande fortement, pour moi le numéro un et loin devant les autres."
                </p>
                <p style="margin: 0; font-size: 13px; color: #cccccc; font-weight: 700;">
                  ⭐⭐⭐⭐⭐ — Magroud W., étudiant en biologie
                </p>
              </div>

              <p style="margin: 0 0 30px 0; font-size: 18px; line-height: 1.5; color: #FCDD00; font-weight: 700; text-align: center;">
                Il a upgradé. Tu upgrades ?
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{ultimateLink}" style="display: inline-block; padding: 18px 36px; background-color: #FCDD00; color: #000000; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 4px;">
                      Oui, je veux Ultimate (79€)
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; text-align: center; color: #888888;">
                PS: Si tu upgrades avant minuit, livraison garantie en 24h.
              </p>

              <p style="margin: 30px 0 0 0; font-size: 14px; color: #cccccc;">
                — Achzod
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666666;">
                APEXLABS by Achzod
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## ✉️ EMAIL J+7 - LAST CHANCE + PROMO

**Timing:** 7 jours après completion du Discovery

**Sujet:** 🚨 Dernière chance: -20€ sur Ultimate Scan

**Preview:** Code promo DISCOVERY20 expire dans 48h

**Corps (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #222222; border-radius: 4px;">

          <!-- Urgency Banner -->
          <tr>
            <td style="padding: 16px; background-color: #FF4444; text-align: center;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                ⏱️ Expire dans 48h
              </p>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FCDD00;">
                APEXLABS
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                {firstName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Ça fait 7 jours que tu as reçu ton Discovery.
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu connais tes blocages, mais tu n'as toujours pas les protocoles pour les corriger.
              </p>

              <p style="margin: 0 0 30px 0; font-size: 18px; line-height: 1.5; color: #FCDD00; font-weight: 700;">
                Je te fais une dernière offre :
              </p>

              <!-- Promo Box -->
              <div style="padding: 24px; background-color: #1a1a1a; border: 2px solid #FCDD00; margin: 0 0 30px 0; text-align: center;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #FCDD00; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  ⚡ Offre Spéciale
                </p>
                <p style="margin: 0 0 8px 0; font-size: 24px; color: #ffffff; font-weight: 700;">
                  Ultimate Scan: 59€ au lieu de 79€
                </p>
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #FCDD00;">
                  -20€ de réduction
                </p>
                <div style="padding: 12px 20px; background-color: #0a0a0a; border: 1px dashed #FCDD00; display: inline-block;">
                  <p style="margin: 0; font-size: 18px; font-family: 'Courier New', monospace; color: #FCDD00; font-weight: 700;">
                    Code: DISCOVERY20
                  </p>
                </div>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cccccc;">
                Ce que tu reçois :
              </p>

              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #cccccc;">
                <li style="margin: 0 0 8px 0;">✅ Protocoles exacts (Cortisol, Sommeil, Digestion)</li>
                <li style="margin: 0 0 8px 0;">✅ Stack Suppléments personnalisé</li>
                <li style="margin: 0 0 8px 0;">✅ Intégration Apple Watch / Garmin</li>
                <li style="margin: 0 0 8px 0;">✅ Analyse Posturale 3D</li>
                <li style="margin: 0 0 8px 0;">✅ Plan 30-60-90 jours</li>
                <li>✅ Dashboard temps réel à vie</li>
              </ul>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{ultimateLink}" style="display: inline-block; padding: 18px 36px; background-color: #FCDD00; color: #000000; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 4px;">
                      Je prends Ultimate (59€ avec DISCOVERY20)
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Countdown -->
              <div style="padding: 16px; background-color: #1a1a1a; border-left: 3px solid #FF4444; margin: 0 0 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #FF4444; font-weight: 700;">
                  ⏱️ Cette offre expire le [DATE] à minuit.
                </p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #cccccc;">
                  Après, retour au prix normal de 79€.
                </p>
              </div>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #cccccc; text-align: center;">
                À toi de jouer.
              </p>

              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #888888;">
                PS: 6 avis, tous 5 étoiles. 100% de satisfaction.<br>
                Essaie Ultimate, ou continue à essayer au hasard.
              </p>

              <p style="margin: 30px 0 0 0; font-size: 14px; color: #cccccc;">
                — Achzod
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666666;">
                APEXLABS by Achzod
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## ✉️ EMAIL BLAST - RETARGETING 229 USERS

**Timing:** À envoyer IMMÉDIATEMENT (one-time)

**Audience:** Tous les users avec Discovery complété

**Sujet:** 🎁 On a amélioré ton Discovery Scan

**Preview:** Débloquer tes protocoles Ultimate avec -20€ de réduction (expire dans 48h)

**Corps (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #222222; border-radius: 4px;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FCDD00;">
                🚀 NOUVELLE FONCTIONNALITÉ
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Salut {firstName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu as fait ton Discovery Scan il y a quelques jours.
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #cccccc;">
                Tu te rappelles de tes blocages détectés ?
              </p>

              <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 1.5; color: #FCDD00; font-weight: 700;">
                On vient de lancer une grosse mise à jour :
              </p>

              <!-- Feature Box -->
              <div style="padding: 24px; background-color: #1a1a1a; border: 2px solid #FCDD00; margin: 0 0 30px 0;">
                <p style="margin: 0 0 16px 0; font-size: 20px; color: #ffffff; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                  🆕 Ultimate Scan
                </p>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #FCDD00; text-align: center;">
                  Tout ton Discovery +
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #cccccc;">
                  <li style="margin: 0 0 10px 0;">✅ Protocoles exacts pour corriger tes blocages</li>
                  <li style="margin: 0 0 10px 0;">✅ Stack Suppléments personnalisé (doses, timing, marques)</li>
                  <li style="margin: 0 0 10px 0;">✅ Intégration Apple Watch / Garmin (HRV, récupération, sommeil)</li>
                  <li style="margin: 0 0 10px 0;">✅ Analyse Posturale 3D (upload 3 photos)</li>
                  <li style="margin: 0 0 10px 0;">✅ Plan 30-60-90 jours avec milestones</li>
                  <li style="margin: 0 0 10px 0;">✅ Dashboard temps réel à vie</li>
                  <li style="margin: 0 0 10px 0;">✅ Rapport PDF 25+ pages</li>
                  <li>✅ Support email prioritaire</li>
                </ul>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 14px; text-align: center; color: #cccccc;">
                🏆 <strong style="color: #FCDD00;">C'est le scan qu'utilisent les athlètes Elite.</strong>
              </p>

              <!-- Promo Banner -->
              <div style="padding: 20px; background-color: #FF4444; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #ffffff; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  Promo Lancement
                </p>
                <p style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">
                  59€ au lieu de 79€ (-20€)
                </p>
              </div>

              <div style="padding: 12px 20px; background-color: #0a0a0a; border: 1px dashed #FCDD00; text-align: center; margin: 0 0 30px 0;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">
                  Code promo
                </p>
                <p style="margin: 0; font-size: 20px; font-family: 'Courier New', monospace; color: #FCDD00; font-weight: 700;">
                  ULTIMATE20
                </p>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #FF4444; font-weight: 700;">
                  ⏱️ Expire dans 48h
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{ultimateLink}" style="display: inline-block; padding: 20px 40px; background-color: #FCDD00; color: #000000; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Upgrade vers Ultimate (59€)
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; text-align: center; color: #888888;">
                💰 100% déductible de ton coaching Achzod
              </p>
              <p style="margin: 0 0 20px 0; font-size: 12px; text-align: center; color: #888888;">
                🎁 Livraison en 24-48h garantie
              </p>

              <p style="margin: 0 0 8px 0; font-size: 14px; color: #888888;">
                PS: Si tu upgrades avant minuit, tu reçois ton rapport Ultimate complet en moins de 24h.
              </p>

              <p style="margin: 30px 0 0 0; font-size: 14px; color: #cccccc;">
                — Achzod<br>
                <span style="font-size: 11px; color: #666666;">Certifié ISSA, NASM, 10+ certifications</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666666;">
                APEXLABS by Achzod
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 🔧 IMPLÉMENTATION BACKEND

### Fichier: `server/emailSequence.ts` (à créer)

```typescript
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { orders } from "@shared/drizzle-schema";
import { sendEmail } from "./emailService";

// Schedule email sequence when Discovery Scan is completed
export async function startDiscoveryEmailSequence(orderId: string, userEmail: string, userName: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!order || order.productType !== 'GRATUIT') return;

  const firstName = userName.split(' ')[0] || userName;
  const discoveryLink = `${process.env.APP_URL}/discovery-scan/${order.auditId}`;
  const ultimateLink = `${process.env.APP_URL}/offers/ultimate-scan`;
  const anabolicLink = `${process.env.APP_URL}/offers/anabolic-bioscan`;

  // J+0: Immediate
  await sendDiscoveryEmail_J0(userEmail, firstName, discoveryLink, ultimateLink, anabolicLink);

  // J+1: Schedule 24h later
  setTimeout(() => {
    sendDiscoveryEmail_J1(userEmail, firstName, ultimateLink);
  }, 24 * 60 * 60 * 1000);

  // J+3: Schedule 72h later
  setTimeout(() => {
    sendDiscoveryEmail_J3(userEmail, firstName, ultimateLink);
  }, 72 * 60 * 60 * 1000);

  // J+7: Schedule 7 days later
  setTimeout(() => {
    sendDiscoveryEmail_J7(userEmail, firstName, ultimateLink);
  }, 7 * 24 * 60 * 60 * 1000);
}

// Individual email functions (implement with HTML templates above)
async function sendDiscoveryEmail_J0(email: string, firstName: string, discoveryLink: string, ultimateLink: string, anabolicLink: string) {
  await sendEmail({
    to: email,
    subject: "✅ Ton Discovery Scan est prêt",
    html: `<!-- Use HTML template from J+0 above -->`
  });
}

// ... etc for J+1, J+3, J+7
```

---

## 📊 TRACKING & ANALYTICS

### Paramètres UTM à ajouter aux liens:

```
{ultimateLink}?utm_source=email&utm_medium=sequence&utm_campaign=discovery_j0
{ultimateLink}?utm_source=email&utm_medium=sequence&utm_campaign=discovery_j1
{ultimateLink}?utm_source=email&utm_medium=sequence&utm_campaign=discovery_j3
{ultimateLink}?utm_source=email&utm_medium=sequence&utm_campaign=discovery_j7
{ultimateLink}?utm_source=email&utm_medium=blast&utm_campaign=retargeting_229
```

### Métriques à suivre:
- Taux d'ouverture de chaque email
- Taux de clic sur les CTAs
- Conversions par email (J+0 vs J+1 vs J+3 vs J+7)
- ROI de la séquence

---

## ✅ CHECKLIST IMPLÉMENTATION

- [ ] Créer les templates HTML des 5 emails
- [ ] Configurer SendPulse ou service email
- [ ] Implémenter `startDiscoveryEmailSequence()` dans le backend
- [ ] Ajouter trigger sur completion d'un Discovery Scan
- [ ] Tester la séquence avec un email test
- [ ] Envoyer email blast retargeting aux 229 users existants
- [ ] Setup tracking UTM
- [ ] Monitorer les conversions

---

## 💰 PROJECTION ROI

**Avec 5% de conversion (conservateur):**
- 229 users × 5% = 11 ventes
- 11 × 59€ (avec promo) = **649€**

**Avec 10% de conversion (optimiste):**
- 229 users × 10% = 23 ventes
- 23 × 59€ = **1,357€**

**ROI mensuel (flux continu 30 Discovery/jour à 5%):**
- 30 × 5% = 1.5 ventes/jour
- 1.5 × 79€ × 30 jours = **3,555€/mois**

---

**Fichier créé le:** 23 mars 2026
**Maintenu par:** Claude Code
**Contact:** coaching@achzodcoaching.com
