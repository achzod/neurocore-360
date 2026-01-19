import { ReportData } from './types';

export const REPORT_DATA: ReportData = {
  globalScore: 6.0,
  metrics: [
    { label: "Sommeil", value: 8.5, max: 10, description: "Récupération", key: "sommeil" },
    { label: "Stress", value: 4.5, max: 10, description: "Système Nerveux", key: "stress" },
    { label: "Hormones", value: 5.7, max: 10, description: "Métabolisme", key: "hormones" },
    { label: "Digestion", value: 6.5, max: 10, description: "Absorption", key: "digestion" },
    { label: "Training", value: 4.8, max: 10, description: "Performance", key: "training" },
  ],
  sections: [
    {
      id: "intro",
      title: "Message d'ouverture",
      subtitle: "Introduction",
      content: `<p>Ton dossier est ouvert devant moi. Pas de surprises, pas de langue de bois : tu vas recevoir une analyse chirurgicale de ce qui bloque réellement ta progression.</p>
<p>Ce rapport décortique chaque système de ton corps — sommeil, stress, hormones, digestion, entraînement — et surtout comment ils s'influencent mutuellement. Ton score global de 60/100 cache une réalité plus nuancée : un sommeil solide à 85/100 d'un côté, un système nerveux à 45/100 de l'autre. Cet écart raconte une histoire. Celle d'un gars qui bosse dur mais dont le corps encaisse mal.</p>
<p>Les connexions entre ton stress élevé, ta récupération lente et tes plateaux de progression sont claires une fois qu'on sait où regarder. Tu vas comprendre pourquoi tes 4-5 séances hebdomadaires ne donnent pas les résultats qu'elles devraient. Pourquoi ton énergie flanche malgré la discipline.</p>
<p>Et surtout, quels leviers actionner — dans quel ordre — pour débloquer la machine.</p>`,
      chips: ["Analyse Chirurgicale", "Blocages Identifiés"]
    },
    {
      id: "global",
      title: "Lecture globale",
      subtitle: "Le Paradoxe",
      content: `<p>Ton corps hurle quelque chose que tu refuses d'entendre.</p>
<p>Quatre à cinq séances par semaine. Intensité haute. Musculation sérieuse. Créatine dans le shaker. Tu fais tout ce qu'on attend d'un gars qui veut prendre de la masse sèche. Et pourtant... tu stagnes. L'énergie manque. La récupération traîne. Les résultats ne suivent pas l'investissement.</p>
<p>Voilà le paradoxe qui définit ta situation à 28 ans : tu t'entraînes comme un athlète, mais ton corps récupère comme celui d'un type qui découvre la salle. Et ce décalage n'est pas un hasard. C'est un signal d'alarme physiologique que ton système nerveux t'envoie depuis des mois.</p>
<p><strong>Système nerveux : 45 sur 100.</strong> Le score le plus bas de ton bilan. Et c'est précisément ce score qui tire tout le reste vers le bas.</p>
<p>Stress élevé. Anxiété fréquente. Concentration difficile. Ce triptyque raconte une histoire que ton corps connaît par cœur : mode survie permanent. Ton système nerveux sympathique — celui qui gère la réponse au danger — tourne en surrégime. En permanence.</p>
<p>Le problème, c'est que dans cet état, ton corps ne fait pas la différence entre un lion qui te chasse et une deadline stressante. Et quand le corps perçoit un danger constant, il bloque la construction. Pourquoi investir des ressources dans la croissance musculaire si la survie immédiate n'est pas assurée ?</p>`,
      chips: ["Mode Survie", "Sympathique Dominant", "Frein Métabolique"]
    },
    {
      id: "sleep",
      title: "Sommeil & récupération",
      subtitle: "Le Pilier Fragile",
      content: `<p>Ton score sommeil affiche 85/100. Sur le papier, c'est ton meilleur pilier. Mais creusons un peu, parce que ce chiffre masque des fissures qui sabotent ta récupération sans que tu t'en rendes compte.</p>
<p>Tu dors, oui. Mais tu ne récupères pas comme tu le devrais. Le sommeil n'est pas un bloc homogène. C'est une succession de cycles. La phase N3, le sommeil lent profond, c'est là que la magie opère pour la construction musculaire. Et c'est précisément là que tes réveils nocturnes posent problème.</p>
<p>C'est pendant le N3 que ton hypophyse libère le gros pulse d'hormone de croissance (GH) de la nuit. Interromps le N3, tu tronques la libération de GH. L'hormone de croissance orchestre la synthèse protéique musculaire et la lipolyse. Un déficit chronique de GH nocturne, c'est comme essayer de construire une maison avec la moitié des matériaux.</p>
<p><strong>Lumière bleue et Caféine tardive :</strong> Le cortisol élevé en soirée bloque la montée naturelle de mélatonine. Tu te couches tard, probablement parce que tu n'arrives pas à t'endormir avant. Ce n'est pas un choix. C'est ton cortisol qui maintient ton cerveau en alerte.</p>
<p>La caféine a une demi-vie de 3 à 7 heures. Chez certains métaboliseurs lents, une tasse de café à 16h signifie encore 50% de la caféine en circulation à 23h. La caféine ne te donne pas d'énergie, elle bloque les récepteurs à adénosine (le signal de fatigue). Tu dors, mais tu ne récupères pas.</p>`,
      chips: ["GH Tronquée", "Réveils Nocturnes", "Cortisol Vespéral"]
    },
    {
      id: "digestion",
      title: "Digestion & tolérances",
      subtitle: "L'Axe Intestin-Cerveau",
      content: `<p>Ton score digestif à 65/100 raconte une histoire que tu ne vois probablement pas encore clairement. Un ventre qui gonfle après manger, c'est de la fermentation. Des bactéries qui se nourrissent de ce que ton intestin grêle n'a pas su absorber correctement.</p>
<p><strong>Le Gluten et la Zonuline :</strong> Le blé moderne contient des protéines de gluten que ton système digestif gère mal. L'exposition au gluten déclenche la libération de zonuline, qui ouvre les jonctions serrées de ton intestin. Résultat : perméabilité intestinale ("Leaky Gut"). Ton intestin devient une passoire, laissant passer des fragments alimentaires et des toxines (LPS) dans le sang, déclenchant une inflammation systémique.</p>
<p>Cette inflammation chronique dévore tes ressources et détourne la glutamine nécessaire à tes muscles. De plus, l'axe intestin-cerveau fonctionne dans les deux sens. Le stress chronique active le mode sympathique, coupant les ressources au système digestif. La motilité ralentit, la nourriture stagne et fermente.</p>
<p>Fais le calcul : si tu manges 160g de protéines mais n'en absorbes que 60% à cause d'une paroi intestinale compromise, tu perds une partie significative de tes efforts nutritionnels.</p>`,
      chips: ["Leaky Gut", "Fermentation", "Malabsorption"]
    },
    {
      id: "stress",
      title: "Stress & système nerveux",
      subtitle: "Le Goulot d'Étranglement",
      content: `<p>Ton score système nerveux à 45/100 constitue le point le plus bas de ton bilan. Ce chiffre raconte l'histoire d'un axe HPA (Hypothalamus-Hypophyse-Surrénales) en surrégime chronique.</p>
<p>Le cortisol chroniquement élevé transforme ton corps en forteresse assiégée. En temps normal, le cortisol suit un rythme : pic le matin, creux le soir. Chez toi, ce schéma est aplati : cortisol moyen-haut en permanence. Jamais le pic d'énergie matinal, jamais le calme profond du soir.</p>
<p><strong>Impact hormonal :</strong> Le cortisol et la testostérone partagent un précurseur commun, la prégnénolone. En mode survie, ton corps priorise le cortisol ("Pregnenolone Steal"), réduisant ta production de testostérone. De plus, le cortisol augmente la SHBG, qui "menotte" la testostérone libre restante.</p>
<p><strong>Stockage abdominal :</strong> Le tissu adipeux viscéral possède 4 fois plus de récepteurs au cortisol. Le stress fait stocker le gras dans le ventre. Cette graisse viscérale est elle-même inflammatoire, créant un cercle vicieux.</p>
<p>Tu n'utilises aucun outil de bascule vers le parasympathique (méditation, cohérence cardiaque). Ton corps ne reçoit jamais le signal "Danger terminé".</p>`,
      chips: ["Axe HPA", "Pregnenolone Steal", "Dominance Sympathique"]
    },
    {
      id: "hormones",
      title: "Profil hormonal",
      subtitle: "Zone Grise",
      content: `<p>Ton score hormonal à 57/100 reflète une zone grise. Pas catastrophique, mais suffisant pour expliquer la stagnation. Libido moyenne à 28 ans, récupération lente... ce sont des signaux.</p>
<p><strong>Testostérone :</strong> La "normale" labo (300-1000 ng/dL) est trompeuse. À 28 ans et sportif, viser 600-900 ng/dL est optimal. Mais ta testostérone libre (la fraction active) est probablement basse à cause de la SHBG élevée induite par le stress.</p>
<p><strong>Insuline :</strong> Le cortisol chronique crée une résistance à l'insuline. Le glucose entre difficilement dans le muscle mais facilement dans le gras. Ton objectif de prise de masse sèche se heurte à ce mur métabolique.</p>
<p><strong>Thyroïde :</strong> Le stress inhibe la conversion de T4 (stockage) en T3 (active). Tu peux avoir une TSH "normale" mais être en hypothyroïdie fonctionnelle tissulaire, expliquant la fatigue et la difficulté à sécher.</p>
<p><strong>Vitamine D :</strong> Sans supplémentation ni soleil, tu es quasi certainement carencé. Or, la Vitamine D est une pro-hormone cruciale pour la testostérone et l'immunité.</p>`,
      chips: ["Testostérone Libre", "SHBG", "Résistance Insuline"]
    },
    {
      id: "training",
      title: "Entraînement",
      subtitle: "Surcharge",
      content: `<p>Quatre à cinq séances par semaine. Intensité haute. Ton score Training plafonne pourtant à 48/100. Le problème n'est pas l'effort, c'est que tu signes des chèques que ton corps ne peut pas encaisser.</p>
<p>Tu imposes à un système nerveux épuisé (45/100) la charge d'un athlète au repos. Le muscle ne grossit pas à la salle, il grossit pendant la récupération. Ton ratio stimulus/récupération est déséquilibré. Tu creuses ta dette de récupération à chaque séance.</p>
<p>Ton épaule sensible est un signal d'alarme : inflammation chronique et réparation tissulaire incomplète. Les courbatures qui traînent au-delà de 48h sont un signe d'inflammation non résolue.</p>
<p><strong>La Solution :</strong> Le Deload. Ce n'est pas du repos, c'est du management de fatigue. Réduire le volume de 50% pendant une semaine pour laisser le système nerveux se régénérer, l'inflammation baisser et la sensibilité aux stimuli revenir.</p>`,
      chips: ["Dette de Récupération", "Inflammation", "Deload Nécessaire"]
    },
    {
      id: "nutrition",
      title: "Nutrition",
      subtitle: "Assimilation vs Ingestion",
      content: `<p>Tu manges peut-être "bien", mais combien absorbes-tu ? Avec une digestion compromise, ton absorption réelle de protéines chute drastiquement.</p>
<p><strong>Stratégie Glucides :</strong> Le matin, ton cortisol élevé réduit la sensibilité à l'insuline. Manger des glucides au réveil favorise le stockage. Concentre tes glucides <strong>autour de l'entraînement</strong> (péri-workout) où la sensibilité à l'insuline est maximale grâce aux transporteurs GLUT4.</p>
<p><strong>Gluten :</strong> Une élimination stricte de 4-6 semaines est recommandée pour réparer la paroi intestinale et calmer l'inflammation.</p>
<p><strong>Hydratation :</strong> 2.5L est insuffisant pour ton volume d'entraînement. Vise 3L + compensation des pertes sudorales. La déshydratation augmente le cortisol.</p>`,
      chips: ["Timing Glucides", "Absorption", "Élimination Gluten"]
    },
    {
      id: "supplements",
      title: "Suppléments",
      subtitle: "Combler les Failles",
      content: `<p>Ta supplémentation actuelle a des trous béants. Voici le protocole prioritaire :</p>
<ul class="list-disc pl-5 space-y-2 mt-4 text-[var(--color-text-muted)]">
  <li><strong>Magnésium Bisglycinate :</strong> 300-400mg le soir. Pour calmer le système nerveux, réduire le cortisol et améliorer le sommeil profond. Indispensable.</li>
  <li><strong>Vitamine D3 + K2 :</strong> 4000-5000 UI/jour (matin/midi). Socle hormonal et immunitaire.</li>
  <li><strong>Oméga-3 (EPA/DHA) :</strong> 2-3g/jour. Anti-inflammatoire systémique, fluidité membranaire, sensibilité à l'insuline.</li>
  <li><strong>Zinc Bisglycinate :</strong> 25-30mg/jour. Cofacteur de la testostérone et de la réparation tissulaire.</li>
  <li><strong>Ashwagandha KSM-66 :</strong> 300-600mg (soir). Adaptogène pour moduler l'axe HPA et réduire le cortisol.</li>
  <li><strong>Glycine :</strong> 3g au coucher. Pour abaisser la température corporelle et favoriser le sommeil profond.</li>
</ul>
<p class="mt-4">Pas de pré-workout stimulant (ton système nerveux est déjà trop haut). Pas de boosters de testo douteux.</p>`,
      chips: ["Magnésium", "Vitamine D3", "Zinc", "Oméga-3"]
    },
    {
      id: "revelation",
      title: "Révélation",
      subtitle: "Le Vrai Blocage",
      content: `<p>Voilà ce que personne ne t'a jamais dit. <strong>Tu ne manques pas de discipline. Tu en as trop.</strong></p>
<p>Ton système nerveux à 45/100 transforme chaque séance en agression plutôt qu'en stimulus. Le cortisol chronique dévore tes gains pendant que tu dors — ces réveils nocturnes interrompent ta production d'hormone de croissance pile au moment où ton corps devrait construire.</p>
<p>Tes ballonnements signalent une inflammation intestinale qui sabote l'absorption des protéines. Ta récupération lente n'est pas un manque d'effort. C'est ton corps qui hurle qu'il n'arrive plus à suivre. Le paradoxe est brutal : plus tu pousses, plus tu recules.</p>
<p>Ton acharnement est devenu ton frein principal. Déverrouille ton système nerveux, et tout le reste — masse, énergie, progression — suivra comme un effet domino.</p>`,
      chips: ["Trop de Discipline", "Acharnement = Frein"]
    },
    {
      id: "rootcause",
      title: "Cause racine",
      subtitle: "3 Leviers Immédiats",
      content: `<p>Tu ne manques pas de volume d'entraînement. C'est ton système nerveux à 45/100 qui verrouille chaque adaptation.</p>
<p><strong>LEVIER 1 — SOMMEIL :</strong> Couvre-feu caféine à 14h maximum. Remplace l'après-midi par du décaféiné. D'ici 7 jours : endormissement plus rapide et réveils réduits.</p>
<p><strong>LEVIER 2 — SYSTÈME NERVEUX :</strong> Respiration physiologique ("soupir cyclique") 5 minutes avant le coucher. Inspire 2 temps, expire longuement. Active le parasympathique. Ajoute 10 min de marche post-dîner pour la glycémie.</p>
<p><strong>LEVIER 3 — TRAINING :</strong> Semaine de deload immédiate. Volume divisé par deux, intensité 70%. Laisse ton SNC se régénérer. L'énergie remontera en flèche.</p>`,
      chips: ["Caféine 14h", "Respiration", "Deload"]
    },
    {
      id: "radar",
      title: "Lecture radar",
      subtitle: "La Bascule",
      content: `<p>Ton profil dessine une carte contrastée : Sommeil 85 vs Nerveux 45. L'objectif est de rééquilibrer cette asymétrie.</p>
<p><strong>Sommeil :</strong> De "quantité correcte avec coupures" à "architecture intacte". Restaurer le pic de GH nocturne.</p>
<p><strong>Nerveux :</strong> Restaurer la dominance parasympathique au repos. Cortisol bas le soir.</p>
<p><strong>Hormones :</strong> Inverser le ratio Cortisol/Testostérone. Laisser la testostérone remonter naturellement en baissant le stress.</p>
<p><strong>Digestif :</strong> Réparer la barrière. Transit régulier, absorption totale.</p>
<p>Les 30 premiers jours seront frustrants (moins de volume), mais nécessaires. À J+45, la progression deviendra exponentielle car ton corps pourra enfin utiliser ce que tu lui donnes.</p>`,
      chips: ["Rééquilibrage", "Architecture Sommeil", "Ratio T/C"]
    },
    {
      id: "potential",
      title: "Potentiel",
      subtitle: "Exploité à 35%",
      content: `<p><strong>POTENTIEL ACTUEL EXPLOITÉ : 35%</strong></p>
<p>Tu bosses, ton corps ne suit pas. Ton score nerveux agit comme un régulateur bridé sur un moteur puissant.</p>
<p><strong>Palier +20% (J+30) :</strong> Le système nerveux remonte à 55. Sommeil réparateur. Moins de rétention d'eau. Anxiété en baisse.</p>
<p><strong>Palier +40% (J+60) :</strong> Transformation visible. Système nerveux à 70. PRs à la salle. Recomposition corporelle (-3kg gras, +1kg muscle). Libido en hausse.</p>
<p><strong>Palier +60% (J+90) :</strong> Niveau Élite. Top 5% de ta tranche d'âge. Sommeil parfait. Énergie inépuisable. Composition corporelle optimale (abdos visibles, muscles denses). Hormones au top.</p>
<p>La distance entre 35% et 95% n'est pas un gouffre, c'est une série de verrous à faire sauter. Le premier s'appelle système nerveux.</p>`,
      chips: ["35% -> 95%", "Gains Exponentiels"]
    },
    {
      id: "roadmap",
      title: "Feuille de route",
      subtitle: "Séquence d'Action",
      content: `<p><strong>1. Correction Nerveuse & Sommeil :</strong> Couvre-feu digital 90min avant lit. Caféine OFF à 14h. Respiration carrée le soir. Restaurer le rythme du cortisol.</p>
<p><strong>2. Optimisation Hormonale :</strong> Bilan sanguin (Testo, Cortisol, D3, Zinc). Supplémentation immédiate (D3, Mg, Zn). Exposition solaire matinale.</p>
<p><strong>3. Reprogrammation Métabolique :</strong> Glucides autour de l'entraînement, pas le matin au réveil. Protéines + Fibres à chaque repas. Repas léger le soir.</p>
<p><strong>4. Stratégie Nutritionnelle :</strong> Élimination gluten 30 jours. Hydratation 3.5L+. Calories de maintien pour commencer, le temps de réparer.</p>
<p><strong>5. Plan Training :</strong> Deload 2 semaines. Puis fréquence 3-4x/semaine. Périodisation. Monitoring de la récupération.</p>
<p><strong>6. Routine Récupération :</strong> Marche quotidienne. Douche froide post-training (pas le soir). Zéro alcool temporairement.</p>`,
      chips: ["Séquence", "Action", "Méthode"]
    },
    {
      id: "projection",
      title: "Projection",
      subtitle: "30 / 60 / 90 Jours",
      content: `<p><strong>J+30 :</strong> Le système nerveux lâche prise. Sommeil profond, moins de réveils. Cortisol normalisé. Moins d'anxiété. Le corps dégonfle (eau/inflammation).</p>
<p><strong>J+60 :</strong> Transformation visible. Force en hausse. Recomposition corporelle (- gras, + muscle). Libido présente. Digestion silencieuse. L'entourage remarque le changement.</p>
<p><strong>J+90 :</strong> Nouveau "Set Point" biologique. Sommeil optimal, énergie stable et haute. Training rentabilisé à 100%. Mental clair et confiant. Tu ne gères plus la fatigue, tu vis la performance.</p>`,
      chips: ["J+30", "J+60", "J+90"]
    },
    {
      id: "conclusion",
      title: "Conclusion",
      subtitle: "Le Choix",
      content: `<p><strong>Forces :</strong> Discipline d'acier, Sommeil de base solide, Capital biologique intact (28 ans).</p>
<p><strong>Faiblesses :</strong> Système Nerveux en alerte (45/100), Dette de récupération, Inflammation digestive, Ratio hormonal inversé.</p>
<p><strong>Risque :</strong> Stagnation, épuisement surrénalien, andropause précoce fonctionnelle.</p>
<p><strong>Potentiel :</strong> Passer de 60/100 à 85/100 en 90 jours. Performance Top 5%.</p>
<p>Le plan est tracé. La physiologie est claire. La seule question : vas-tu exécuter ?</p>`,
      chips: ["Forces", "Risques", "Potentiel"]
    },
    {
      id: "coaching",
      title: "Coaching",
      subtitle: "Accompagnement",
      content: `<p>Tu as deux options : appliquer seul ou travailler ensemble.</p>
<p><strong>Seul :</strong> Risque d'erreur d'interprétation, pas de feedback, pas d'ajustement.</p>
<p><strong>Ensemble :</strong> Protocole ajusté chaque semaine. Exécution supervisée. Redevabilité sans complaisance.</p>
<p>Si tu es prêt à exécuter, transparent et engagé sur la durée (3 mois min), candidate sur achzodcoaching.com. Pas de promesse miracle, juste un cadre qui transforme l'information en résultats.</p>`,
      chips: ["Starter", "Essential", "Elite", "Private Lab"]
    }
  ]
};