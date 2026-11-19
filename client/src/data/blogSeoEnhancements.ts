// SEO on-page du blog : titles (<title>) et meta descriptions par article,
// plus le maillage interne ajouté en fin d'article. Les articles SARMs ne
// figurent volontairement dans aucune de ces tables.

export interface BlogSeoMeta {
  seoTitle: string;
  metaDescription: string;
}

export interface BlogRelatedLinks {
  heading: string;
  links: ReadonlyArray<{ slug: string; label: string }>;
}

export const BLOG_SEO_META: Record<string, BlogSeoMeta> = {
  "hrv-stress-variabilite-cardiaque": {
    seoTitle: "HRV et stress : quand une variabilité basse doit alerter",
    metaDescription: "HRV et stress : ce que mesure la variabilité cardiaque, les signaux d'épuisement à repérer et les leviers concrets pour la faire remonter avant de craquer.",
  },
  "nerf-vague-hrv-superpower": {
    seoTitle: "Nerf vague et HRV : activer le parasympathique",
    metaDescription: "Nerf vague et HRV : respiration, froid, méditation, exercice. Les techniques pour activer le parasympathique, classées par preuves, et un plan de 30 jours.",
  },
  "10-facons-ameliorer-hrv": {
    seoTitle: "Améliorer sa HRV : 10 leviers qui marchent vraiment",
    metaDescription: "Améliorer sa HRV : sommeil, respiration, exercice modéré, alcool, alimentation, froid et lien social. Dix leviers concrets pour mieux récupérer.",
  },
  "sympathique-parasympathique-equilibre": {
    seoTitle: "Sympathique et parasympathique : retrouver l'équilibre",
    metaDescription: "Système nerveux sympathique et parasympathique : repérer un déséquilibre et le corriger avec la respiration, le froid, le sommeil et la lumière du matin.",
  },
  "respiration-systeme-nerveux-autonome": {
    seoTitle: "Respiration et système nerveux : 5 protocoles utiles",
    metaDescription: "Cohérence cardiaque, 4-7-8, respiration carrée, Wim Hof : les protocoles de respiration pour calmer ou activer le système nerveux, et quand les utiliser.",
  },
  "5-facons-optimiser-sommeil-profond": {
    seoTitle: "Sommeil profond : 5 façons d'en avoir plus",
    metaDescription: "Sommeil profond : pourquoi cette phase compte pour la récupération et la mémoire, ce qui la perturbe et 5 stratégies validées pour en avoir plus.",
  },
  "chronotype-sommeil-productivite": {
    seoTitle: "Chronotype : Lion, Ours, Loup ou Dauphin ?",
    metaDescription: "Chronotype Lion, Ours, Loup ou Dauphin : comment identifier le vôtre et caler travail, entraînement et sommeil sur vos pics naturels d'énergie.",
  },
  "cafeine-sommeil-quand-arreter": {
    seoTitle: "Caféine et sommeil : à quelle heure arrêter le café",
    metaDescription: "Caféine et sommeil : avec une demi-vie de 5 à 7 h, un café à 14 h agit encore au coucher. Effet sur le sommeil profond, heure limite et dose maximale.",
  },
  "rythme-circadien-explique": {
    seoTitle: "Rythme circadien : comment le resynchroniser",
    metaDescription: "Rythme circadien : lumière, repas, exercice et hormones règlent votre horloge interne. Ce qui la dérègle et comment la resynchroniser pour mieux dormir.",
  },
  "siestes-secret-longevite": {
    seoTitle: "Sieste : durée idéale, bon horaire et bienfaits",
    metaDescription: "Sieste : 10, 20 ou 90 minutes ? Les durées qui améliorent vigilance et récupération, la fenêtre idéale, la sieste café et les erreurs qui gâchent la nuit.",
  },
  "glucides-nus-pic-glycemique": {
    seoTitle: "Glucides seuls : comment éviter le pic de glycémie",
    metaDescription: "Manger des glucides seuls fait monter puis chuter la glycémie. Protéines, fibres, lipides et ordre des aliments : comment éviter les pics et les fringales.",
  },
  "fruits-glycemie-meilleurs-choix": {
    seoTitle: "Fruits et glycémie : les meilleurs choix selon le CGM",
    metaDescription: "Fruits et glycémie : baies, agrumes, banane, mangue, raisins. Ceux qui font le moins monter le sucre selon les capteurs CGM, et comment les manger.",
  },
  "guide-ultime-glycemie": {
    seoTitle: "Glycémie : comprendre vos chiffres et la stabiliser",
    metaDescription: "Glycémie à jeun, après repas, HbA1c, variabilité : ce que signifient vos chiffres, les objectifs à viser et les leviers pour stabiliser votre glycémie.",
  },
  "iifym-macros-flexible-dieting": {
    seoTitle: "IIFYM et flexible dieting : calculer ses macros",
    metaDescription: "IIFYM et flexible dieting : pourquoi ça marche, comment calculer vos macros étape par étape, les limites réelles et la version plus rigoureuse à appliquer.",
  },
  "cafeine-glycemie-cafe-pic-sucre": {
    seoTitle: "Café et glycémie : la caféine fait-elle monter le sucre ?",
    metaDescription: "Café et glycémie : à court terme la caféine fait plutôt monter le sucre, à long terme le café protège du diabète de type 2. Mécanismes et bon usage.",
  },
  "6-regles-hrv-entrainement": {
    seoTitle: "HRV et entraînement : 6 règles pour s'en servir",
    metaDescription: "HRV et entraînement : mesurer au réveil, suivre la tendance, savoir quand pousser ou lever le pied et repérer le surentraînement à temps. Les 6 règles.",
  },
  "zone-2-cardio-longevite": {
    seoTitle: "Zone 2 : calculer et pratiquer le cardio basse intensité",
    metaDescription: "Zone 2 : mitochondries, oxydation des graisses, sensibilité à l'insuline, modèle 80/20. Comment calculer votre zone et l'intégrer à la musculation.",
  },
  "running-vs-musculation": {
    seoTitle: "Running ou musculation : lequel choisir ?",
    metaDescription: "Running ou musculation : bénéfices et limites de chacun pour le cœur, le muscle, la perte de poids et la longévité, et comment combiner les deux.",
  },
  "glucose-performance-athletique": {
    seoTitle: "Glucose et performance : bien utiliser ses glucides",
    metaDescription: "Glucose et performance : glycogène, glucides avant, pendant et après l'effort, entraînement à jeun et capteur de glucose pour mieux performer.",
  },
  "recuperation-active-passive": {
    seoTitle: "Récupération active ou passive : laquelle choisir ?",
    metaDescription: "Récupération active ou passive : ce que chacune apporte, dans quelles situations l'utiliser et comment la HRV aide à choisir au jour le jour.",
  },
  "reveil-3h-matin-metabolisme": {
    seoTitle: "Réveil à 3 h du matin : les causes métaboliques",
    metaDescription: "Réveil vers 3 h du matin : hypoglycémie nocturne, alcool, cortisol, hormones, insuline. Les causes métaboliques et les solutions pour dormir d'une traite.",
  },
  "age-metabolique-ameliorer": {
    seoTitle: "Âge métabolique : ce qu'il mesure et comment le baisser",
    metaDescription: "Âge métabolique : ce qu'il mesure vraiment, pourquoi il diffère de votre âge réel et les leviers pour le faire baisser : muscle, NEAT, sommeil et stress.",
  },
  "menopause-glycemie-explique": {
    seoTitle: "Ménopause et glycémie : ce qui change et quoi faire",
    metaDescription: "Ménopause et glycémie : la chute des œstrogènes dégrade la sensibilité à l'insuline. Les marqueurs à suivre et les leviers nutrition, sport et sommeil.",
  },
  "marqueurs-sanguins-sante": {
    seoTitle: "Analyse de sang : lire vos marqueurs sanguins",
    metaDescription: "Analyse de sang : glycémie, HbA1c, lipides, CRP, homocystéine, thyroïde, foie, reins. Comment lire vos marqueurs, et pourquoi normal n'est pas optimal.",
  },
  "hrv-guide-ultime-sante": {
    seoTitle: "HRV : le guide complet pour la mesurer et l'utiliser",
    metaDescription: "HRV : ce que mesure la variabilité de la fréquence cardiaque, comment la mesurer correctement, lire ses variations et ajuster entraînement et récupération.",
  },
  "graisse-viscerale-longevite": {
    seoTitle: "Graisse viscérale : risques, mesure et comment la perdre",
    metaDescription: "Graisse viscérale : pourquoi elle est plus dangereuse que la graisse sous-cutanée, comment la mesurer et la faire baisser par l'alimentation et le sport.",
  },
  "mouth-taping-sommeil": {
    seoTitle: "Mouth taping : bénéfices, risques et mode d'emploi",
    metaDescription: "Mouth taping pour dormir : ce que la respiration nasale apporte, les bénéfices documentés, les contre-indications et un protocole progressif pour essayer.",
  },
  "palm-cooling-performance": {
    seoTitle: "Refroidissement des paumes : plus de répétitions ?",
    metaDescription: "Refroidir les paumes entre les séries abaisse la température centrale et retarde la fatigue. Mécanisme, études de Stanford, protocole et limites.",
  },
  "sleepmaxxing-tendance-expliquee": {
    seoTitle: "Sleepmaxxing : ce qui marche et ce qui nuit au sommeil",
    metaDescription: "Sleepmaxxing : chambre fraîche, lumière du matin, magnésium, glycine, mélatonine, trackers. Ce qui aide vraiment à dormir et quand l'obsession nuit.",
  },
  "cycle-menstruel-4-phases": {
    seoTitle: "Cycle menstruel : les 4 phases et leurs effets",
    metaDescription: "Cycle menstruel : règles, phase folliculaire, ovulation, phase lutéale. Ce qui se passe à chaque phase et comment adapter entraînement et nutrition.",
  },
  "entrainement-pendant-regles": {
    seoTitle: "Sport pendant les règles : faut-il s'entraîner ?",
    metaDescription: "Faire du sport pendant les règles est possible et peut soulager les crampes. Ce que dit la science, les vraies contraintes et comment adapter la séance.",
  },
  "sommeil-femmes-differences": {
    seoTitle: "Sommeil des femmes : hormones, cycle et ménopause",
    metaDescription: "Sommeil des femmes : effet du cycle menstruel, de la grossesse, du post-partum et de la ménopause, et comment adapter son sommeil à chaque étape.",
  },
  "hormones-bilan-sanguin": {
    seoTitle: "Bilan hormonal femme : quelles hormones doser et quand",
    metaDescription: "Bilan hormonal : œstradiol, progestérone, testostérone, thyroïde, cortisol, insuline. Quoi doser, à quel moment du cycle et comment lire les résultats.",
  },
  "temps-sous-tension-mythe": {
    seoTitle: "Temps sous tension : utile pour l'hypertrophie ?",
    metaDescription: "Temps sous tension : ralentir ses répétitions ne suffit pas à prendre du muscle. Tension mécanique, recrutement des fibres et bon usage du tempo.",
  },
  "entrainement-echec-necessaire": {
    seoTitle: "Aller à l'échec en musculation : utile ou pas ?",
    metaDescription: "Aller à l'échec à chaque série pour progresser ? Ce que disent les études sur l'échec musculaire, son coût en fatigue, et quand viser plutôt 1 à 3 RIR.",
  },
  "surcharge-progressive-guide": {
    seoTitle: "Surcharge progressive : la méthode pour progresser",
    metaDescription: "Surcharge progressive : les 4 façons de l'appliquer (charge, exercices, contraction, amplitude), les répétitions efficaces et les erreurs qui font stagner.",
  },
  "causes-croissance-musculaire": {
    seoTitle: "Hypertrophie : ce qui fait vraiment grossir le muscle",
    metaDescription: "Hypertrophie musculaire : tension mécanique, stress métabolique, dommages. Ce que chaque stimulus apporte, son poids réel et comment bâtir vos séances.",
  },
  "recomposition-corporelle-possible": {
    seoTitle: "Recomposition corporelle : perdre du gras, gagner du muscle",
    metaDescription: "Recomposition corporelle : perdre du gras et prendre du muscle en même temps est possible. Protéines, volume, sommeil et calories : le protocole.",
  },
  "creatine-guide-complet": {
    seoTitle: "Créatine : effets, dosage de 3 à 5 g et risques réels",
    metaDescription: "Créatine : comment elle agit, gains de force et de masse, effets sur le cerveau, dosage de 3 à 5 g par jour, timing et mythes sur les reins et les cheveux.",
  },
  "proteines-bodybuilders-doses": {
    seoTitle: "Protéines en musculation : combien par jour viser ?",
    metaDescription: "Protéines en musculation : 1,6 g/kg suffit-il ? Les doses à viser en prise de masse, en maintien et en sèche quand on s'entraîne dur, études à l'appui.",
  },
  "memoire-musculaire-science": {
    seoTitle: "Mémoire musculaire : pourquoi le muscle revient vite",
    metaDescription: "Mémoire musculaire : les myonoyaux gagnés à l'entraînement restent des années. Mécanismes, preuves, limites et ce que ça change après une pause.",
  },
  "connexion-esprit-muscle": {
    seoTitle: "Connexion esprit-muscle : quand l'utiliser ou non",
    metaDescription: "Connexion esprit-muscle : le focus interne augmente l'activation à charge modérée mais freine la force à charge lourde. Quand l'utiliser, quand l'éviter.",
  },
  "deload-semaine-decharge": {
    seoTitle: "Deload : quand et comment faire une semaine de décharge",
    metaDescription: "Deload ou semaine de décharge : reconnaître le bon moment, quelles variables réduire, combien de temps et comment reprendre sans retomber dans la fatigue.",
  },
  "guide-seche-cutting": {
    seoTitle: "Sèche musculation : perdre du gras sans perdre de muscle",
    metaDescription: "Sèche en musculation : rythme de perte, déficit, répartition des macros, entraînement, cardio et erreurs à éviter pour garder votre muscle jusqu'au bout.",
  },
  "excentriques-croissance-musculaire": {
    seoTitle: "Phase excentrique : plus efficace pour l'hypertrophie ?",
    metaDescription: "Phase excentrique : la négative fait-elle plus grossir que la montée ? À charge égale, non. Ce que montrent les études et comment travailler les 2 phases.",
  },
  "mollets-guide-complet": {
    seoTitle: "Mollets qui ne grossissent pas : le protocole complet",
    metaDescription: "Mollets qui ne grossissent pas : fibres, amplitude, génétique. Le protocole avec plus de fréquence, plus de volume et des pauses en étirement.",
  },
  "alcool-musculation-effets": {
    seoTitle: "Alcool et musculation : l'impact réel sur vos progrès",
    metaDescription: "Alcool et musculation : synthèse protéique, testostérone, sommeil, calories. Combien de verres freinent vos progrès et comment limiter les dégâts.",
  },
  "frequence-entrainement-muscle": {
    seoTitle: "Fréquence d'entraînement : combien de fois par muscle ?",
    metaDescription: "Fréquence d'entraînement : combien de séances par semaine pour chaque muscle ? Les facteurs qui la déterminent et mes repères muscle par muscle.",
  },
  "pectoraux-guide-scientifique": {
    seoTitle: "Pectoraux : angles, exercices et volume pour progresser",
    metaDescription: "Pectoraux : faisceaux claviculaire et sternal, angle du banc, prise, étirement, volume et fréquence pour des pecs complets, au-delà du couché plat.",
  },
  "entrainement-jeun-analyse": {
    seoTitle: "Cardio à jeun : brûle-t-il vraiment plus de graisse ?",
    metaDescription: "Cardio à jeun : ce que montrent les études sur l'oxydation des graisses, l'insuline, la performance et la composition corporelle, et pour qui il a du sens.",
  },
  "potentiel-genetique-musculation": {
    seoTitle: "Potentiel génétique en musculation : excuse ou limite ?",
    metaDescription: "Potentiel génétique en musculation : cellules satellites, myostatine, fibres, insertions. Ce que la génétique décide vraiment et comment vous situer.",
  },
  "timing-nutriments-important": {
    seoTitle: "Timing des nutriments : ce qui compte vraiment",
    metaDescription: "Timing des nutriments : la fenêtre anabolique de 30 minutes est un mythe. Calories, protéines, qualité, répartition puis timing : la vraie hiérarchie.",
  },
  "frequence-repas-metabolisme": {
    seoTitle: "Fréquence des repas : 3 ou 6 repas pour le métabolisme ?",
    metaDescription: "Six petits repas accélèrent-ils le métabolisme ? Ce que montrent les études sur la fréquence des repas, la faim, la perte de gras et la prise de muscle.",
  },
  "bcaa-utiles-inutiles": {
    seoTitle: "BCAA : utiles ou argent jeté par les fenêtres ?",
    metaDescription: "BCAA : leucine, synthèse protéique, études de Wolfe et Jackman. Pourquoi ils n'apportent rien si vos protéines suffisent, et quoi acheter à la place.",
  },
  "amplitude-mouvement-croissance": {
    seoTitle: "Amplitude complète ou partielles : quoi pour le muscle ?",
    metaDescription: "Amplitude complète ou partielles pour l'hypertrophie ? Ce que montrent les études, le rôle de l'étirement sous charge et comment combiner les deux.",
  },
  "proteine-vegetale-animale": {
    seoTitle: "Protéines végétales ou animales : laquelle pour le muscle ?",
    metaDescription: "Protéines végétales ou animales pour prendre du muscle : leucine, DIAAS, digestibilité, soja. Ce que disent les études et comment s'adapter en végétalien.",
  },
  "periodisation-musculation": {
    seoTitle: "Périodisation en musculation : linéaire, ondulée, blocs",
    metaDescription: "Périodisation en musculation : linéaire, ondulée ou par blocs. Comment choisir selon votre objectif et construire un cycle de 12 semaines qui progresse.",
  },
  "fatigue-systeme-nerveux": {
    seoTitle: "SNC grillé : mythe ou vraie fatigue nerveuse ?",
    metaDescription: "SNC grillé ? La fatigue du système nerveux central existe mais se dissipe en quelques heures. Ce qui vous fatigue vraiment et quand le repos se justifie.",
  },
  "cyclage-glucides-efficace": {
    seoTitle: "Cyclage des glucides : efficace ou inutile ?",
    metaDescription: "Cyclage des glucides (carb cycling) : jours hauts et jours bas font-ils mieux qu'un apport constant ? Ce que disent les études et les cas où il a du sens.",
  },
  "resistance-accommodante-bandes-chaines": {
    seoTitle: "Bandes et chaînes : la résistance accommodante",
    metaDescription: "Résistance accommodante : bandes et chaînes font varier la charge au fil du mouvement. Principe, effets mesurés, programmation et erreurs à éviter.",
  },
  "hydratation-performance-musculaire": {
    seoTitle: "Hydratation et musculation : l'impact sur la force",
    metaDescription: "Hydratation et musculation : 2 % de déshydratation suffisent à faire baisser force et endurance. Chiffres, électrolytes et un protocole simple à suivre.",
  },
  "squats-vs-hip-thrust-fessiers": {
    seoTitle: "Squat ou hip thrust : le meilleur pour les fessiers ?",
    metaDescription: "Squat ou hip thrust pour les fessiers ? Ce que montre l'étude de Barbalho (2020), les atouts de chaque exercice et comment les combiner dans un programme.",
  },
  "cafeine-performance-guide": {
    seoTitle: "Caféine et sport : dose, timing et effets sur la force",
    metaDescription: "Caféine et sport : effets sur la force, l'endurance et la concentration, dose selon votre poids, meilleur moment pour la prendre, tolérance et précautions.",
  },
  "ischio-jambiers-squat-activation": {
    seoTitle: "Ischio-jambiers et squat : travaillent-ils vraiment ?",
    metaDescription: "Les ischio-jambiers travaillent peu au squat : études d'activation, paradoxe biomécanique, insuffisance active et exercices à ajouter pour les développer.",
  },
  "souleve-terre-jour-dos": {
    seoTitle: "Soulevé de terre : séance dos ou séance jambes ?",
    metaDescription: "Le soulevé de terre est-il un exercice de dos ? Activation musculaire, comparaison avec les tirages et où le placer dans votre programme selon l'objectif.",
  },
  "souleve-terre-dangereux": {
    seoTitle: "Soulevé de terre dangereux ? Ce que disent les données",
    metaDescription: "Taux de blessures en salle, origine de la mauvaise réputation du soulevé de terre, vrais facteurs de risque et règles pour le pratiquer sereinement.",
  },
  "dorsaux-developpe-couche-mythe": {
    seoTitle: "Dorsaux au développé couché : mythe ou vraie aide ?",
    metaDescription: "Pousser avec les dorsaux au développé couché ? Ce que montrent les données EMG, d'où vient ce mythe du powerlifting équipé et pourquoi entraîner le dos.",
  },
  "techniques-intensification-guide": {
    seoTitle: "Techniques d'intensification : drop set, rest-pause",
    metaDescription: "Drop sets, rest-pause, cluster sets, pré-fatigue, négatives : comment fonctionnent les techniques d'intensification et à quelle fréquence les utiliser.",
  },
  "hypertrophie-vs-hyperplasie": {
    seoTitle: "Hypertrophie ou hyperplasie : comment grossit le muscle",
    metaDescription: "Hypertrophie ou hyperplasie : vos fibres grossissent-elles ou se multiplient-elles ? Ce que montrent les études et ce que ça change pour l'entraînement.",
  },
  "anti-inflammatoires-gains-musculaires": {
    seoTitle: "AINS et musculation : l'ibuprofène freine-t-il le muscle ?",
    metaDescription: "Ibuprofène, naproxène, aspirine : les AINS freinent-ils la prise de muscle ? Ce que disent les études selon l'âge et la dose, et comment gérer la douleur.",
  },
  "entrainement-maison-sans-equipement": {
    seoTitle: "Musculation à la maison sans matériel : garder ses gains",
    metaDescription: "Musculation à la maison sans matériel : pompes, tractions, pistol squats, nordic curls, volume et fréquence pour garder, voire développer, votre muscle.",
  },
  "entrainer-types-fibres-musculaires": {
    seoTitle: "Fibres musculaires lentes et rapides : comment les entraîner",
    metaDescription: "Fibres de type 1, 2A et 2X : leurs différences, leur potentiel d'hypertrophie, le principe de Henneman et comment entraîner tout le spectre de fibres.",
  },
  "differences-genre-entrainement": {
    seoTitle: "Musculation femme et homme : quelles différences ?",
    metaDescription: "Musculation femme ou homme : faut-il s'entraîner autrement ? Hormones, force, gains relatifs, récupération, cycle, avec un programme type sur 4 jours.",
  },
  "squats-mauvais-genoux-mythe": {
    seoTitle: "Squat et genoux : le squat abîme-t-il vraiment les genoux ?",
    metaDescription: "Le squat abîme-t-il les genoux ? Ce que disent les études sur le cartilage, les ligaments et l'arthrose, et comment squatter sans douleur selon son corps.",
  },
  "calories-balance-energetique": {
    seoTitle: "Balance énergétique : calories, déficit et surplus",
    metaDescription: "Balance énergétique : déficit, surplus, métabolisme de base, NEAT, effet thermique des aliments. L'utiliser pour perdre du gras ou prendre du muscle.",
  },
  "variation-exercices-necessaire": {
    seoTitle: "Varier les exercices en musculation : utile ou pas ?",
    metaDescription: "Varier ses exercices ou garder les fondamentaux ? Pourquoi la confusion musculaire est un mythe, et quand et comment varier sans freiner la progression.",
  },
  "strategies-boost-metabolisme": {
    seoTitle: "Booster son métabolisme : ce qui marche vraiment",
    metaDescription: "Booster son métabolisme : masse musculaire, NEAT, protéines, musculation, sommeil. Les leviers chiffrés qui augmentent la dépense et les mythes à oublier.",
  },
  "erreurs-supplements-courantes": {
    seoTitle: "Compléments alimentaires : les erreurs les plus courantes",
    metaDescription: "Compléments alimentaires : priorités inversées, mauvais dosages, produits sans preuves, obsession du timing, qualité douteuse. Les erreurs à éviter.",
  },
  "biomecanique-croissance-musculaire": {
    seoTitle: "Biomécanique et hypertrophie : angle, levier et étirement",
    metaDescription: "Biomécanique et hypertrophie : angle, levier, étirement, tempo et morphologie changent le stimulus. Exemples concrets pour les pecs et les quadriceps.",
  },
  "top-10-supplements-preuves-scientifiques": {
    seoTitle: "Compléments efficaces : les 10 qui ont des preuves",
    metaDescription: "Créatine, vitamine D, oméga-3, magnésium, whey, caféine et quatre autres : les 10 compléments qui ont fait leurs preuves en essais cliniques, avec dosages.",
  },
  "omega-3-guide-complet-bienfaits": {
    seoTitle: "Oméga-3 : bienfaits, sources et dose selon l'objectif",
    metaDescription: "Oméga-3 EPA, DHA et ALA : bienfaits documentés, meilleures sources alimentaires, dose selon l'objectif et critères pour choisir un complément de qualité.",
  },
  "ashwagandha-guide-complet-adaptogene": {
    seoTitle: "Ashwagandha : bienfaits, dosage et contre-indications",
    metaDescription: "Ashwagandha : effets sur le cortisol, le sommeil, la force et la testostérone, extraits à choisir, dosages étudiés et contre-indications à connaître.",
  },
  "creatine-monohydrate-guide-ultime": {
    seoTitle: "Créatine monohydrate : reins, rétention d'eau et choix",
    metaDescription: "Créatine monohydrate : effets sur la force, la masse et le cerveau, vérité sur les reins et la rétention d'eau, dosage, timing et choix du produit.",
  },
  "probiotiques-sante-intestinale-guide": {
    seoTitle: "Probiotiques : quelles souches choisir et pourquoi",
    metaDescription: "Probiotiques : microbiome, souches Lactobacillus et Bifidobacterium, bénéfices démontrés, dosage en UFC et critères pour choisir selon votre objectif.",
  },
  "vitamine-d-soleil-supplementation": {
    seoTitle: "Vitamine D : carence, taux à viser et supplémentation",
    metaDescription: "Vitamine D : 40 à 80 % des Européens en manquent. Rôle, taux sanguin à viser, effets sur os, immunité, muscle et hormones, et comment se supplémenter.",
  },
  "magnesium-types-bienfaits-dosage": {
    seoTitle: "Magnésium : quelle forme choisir et quel dosage",
    metaDescription: "Magnésium citrate, bisglycinate, thréonate, malate, oxyde : quelle forme pour quel usage, signes de carence, doses pour le sommeil, le stress et le sport.",
  },
  "bcaa-eaa-recuperation-musculaire": {
    seoTitle: "BCAA ou EAA : lequel pour la récupération musculaire ?",
    metaDescription: "BCAA ou EAA : quelle différence, ce que disent les études sur la synthèse des protéines et quand ils servent vraiment face à des protéines complètes.",
  },
  "nootropiques-naturels-cognition": {
    seoTitle: "Nootropiques naturels : les mieux étudiés et leurs doses",
    metaDescription: "Nootropiques naturels : caféine et L-théanine, bacopa, Lion's Mane, rhodiola, ginkgo, Alpha-GPC. Les mieux étudiés, leurs doses et leurs précautions.",
  },
  "guide-13-vitamines-essentielles": {
    seoTitle: "Les 13 vitamines essentielles : rôles, carences, sources",
    metaDescription: "Les 13 vitamines essentielles : rôle de chacune, signes de carence, sources alimentaires, apports recommandés et cas où une supplémentation se justifie.",
  },
  "mineraux-essentiels-sante-performance": {
    seoTitle: "Minéraux essentiels : rôles, carences et absorption",
    metaDescription: "Magnésium, zinc, fer, calcium, sélénium, iode : rôle de chaque minéral, signes de carence, meilleures sources et facteurs qui aident à les absorber.",
  },
  "sureau-elderberry-immunite-antivirale": {
    seoTitle: "Sureau noir : effets sur le rhume et la grippe",
    metaDescription: "Sureau noir (elderberry) : anthocyanes, études sur la grippe et le rhume, formes, dosages et précautions. Ce que la recherche montre sur l'immunité.",
  },
  "curcuma-curcumine-inflammation-douleurs": {
    seoTitle: "Curcumine : inflammation, arthrose et absorption",
    metaDescription: "Curcuma ou curcumine : mécanismes, effets démontrés sur l'arthrose et l'inflammation, problème d'absorption, doses et choix du complément selon les études.",
  },
  "testosterone-naturelle-optimisation-masculine": {
    seoTitle: "Augmenter sa testostérone naturellement : le guide",
    metaDescription: "Augmenter sa testostérone naturellement : sommeil, poids, musculation, stress, nutrition et compléments étayés, et quand faire un bilan hormonal.",
  },
  "meilleurs-supplements-recuperation-musculaire": {
    seoTitle: "Récupération musculaire : les 10 meilleurs compléments",
    metaDescription: "Whey, créatine, oméga-3, magnésium, vitamine D, HMB, curcumine, électrolytes : les 10 compléments de récupération les mieux étayés, doses et protocole.",
  },
  "regime-cetogene-keto-supplements-essentiels": {
    seoTitle: "Régime cétogène : les compléments utiles en keto",
    metaDescription: "Régime cétogène : électrolytes, huile MCT, oméga-3, vitamine D, fibres. Les compléments utiles en keto, leurs doses et le protocole d'adaptation.",
  },
  "synbiotiques-probiotiques-prebiotiques-combines": {
    seoTitle: "Synbiotiques : probiotiques et prébiotiques associés",
    metaDescription: "Synbiotiques : l'association de probiotiques et de prébiotiques. Effets sur la digestion, l'immunité et le métabolisme, et comment choisir un bon produit.",
  },
  "supplements-sante-feminine-hormones-fertilite": {
    seoTitle: "Compléments pour femmes : hormones, fertilité, ménopause",
    metaDescription: "Fer, folates, vitamine D, magnésium, gattilier, myo-inositol : les compléments utiles aux femmes selon l'objectif et l'étape de vie, avec leurs dosages.",
  },
  "guide-debutant-supplements-routine-optimale": {
    seoTitle: "Compléments alimentaires débutant : par où commencer",
    metaDescription: "Compléments alimentaires pour débutant : bilan sanguin d'abord, puis vitamine D, oméga-3, magnésium. Timing, qualité et réévaluation d'une routine simple.",
  },
  "collagene-peau-articulations-guide-complet": {
    seoTitle: "Collagène : peau, articulations, dosage et résultats",
    metaDescription: "Collagène : types, formes de complément, effets sur la peau, les articulations, les os et les tendons, dosage, rôle de la vitamine C, délai des résultats.",
  },
  "collagene-peau-articulations-guide": {
    seoTitle: "Collagène en complément : types, efficacité et dosage",
    metaDescription: "Collagène en complément : types I, II et III, ce qu'il change vraiment pour la peau et les articulations, le bon dosage et comment choisir son produit.",
  },
  "adaptogenes-stress-fatigue-performance": {
    seoTitle: "Adaptogènes : rhodiola, ginseng, ashwagandha et stress",
    metaDescription: "Adaptogènes : ashwagandha, rhodiola, ginseng, schisandra, éleuthérocoque. Effets sur le stress et le cortisol, doses, associations et précautions.",
  },
  "acides-amines-essentiels-performance-muscle": {
    seoTitle: "EAA : acides aminés essentiels et synthèse musculaire",
    metaDescription: "Pourquoi les acides aminés essentiels (EAA) complets stimulent mieux la synthèse musculaire que les BCAA : rôle de chacun, dosages, timing, whey.",
  },
  "melatonine-sommeil-guide-complet": {
    seoTitle: "Mélatonine : dose, horaire et quand elle aide vraiment",
    metaDescription: "Mélatonine : un signal d'horloge, pas un somnifère. Quand elle aide vraiment, pourquoi les petites doses marchent mieux, quelle forme et à quelle heure.",
  },
  "electrolytes-hydratation-performance": {
    seoTitle: "Électrolytes : sodium, potassium et hydratation du sportif",
    metaDescription: "Électrolytes : rôle du sodium, du potassium et du magnésium, besoins selon l'activité, choix d'une formule et protocole avant, pendant et après l'effort.",
  },
  "fer-anemie-energie-femmes-athletes": {
    seoTitle: "Carence en fer : symptômes, ferritine et solutions",
    metaDescription: "Carence en fer : qui est à risque, les stades de la carence, la ferritine et les analyses à demander, les aliments et la supplémentation pour la corriger.",
  },
  "zinc-immunite-testosterone-sante": {
    seoTitle: "Zinc : immunité, testostérone, carence et dosage",
    metaDescription: "Zinc : rôle dans l'immunité et la testostérone, signes de carence, sources, besoins quotidiens, formes à choisir et équilibre à garder avec le cuivre.",
  },
  "coenzyme-q10-energie-coeur-anti-age": {
    seoTitle: "Coenzyme Q10 : cœur, énergie, ubiquinol ou ubiquinone",
    metaDescription: "Coenzyme Q10 : production d'énergie cellulaire, bénéfices pour le cœur, le cerveau et la performance, ubiquinone ou ubiquinol, dosages et précautions.",
  },
  "glycine-sommeil-collagene-longevite": {
    seoTitle: "Glycine : sommeil, collagène et longévité",
    metaDescription: "Glycine : rôle dans le sommeil, la synthèse du collagène et le glutathion. Ce que montrent les études, les sources alimentaires et les doses utiles.",
  },
  "spiruline-chlorelle-superaliments-detox": {
    seoTitle: "Spiruline ou chlorelle : bienfaits réels et différences",
    metaDescription: "Spiruline et chlorelle : composition, bienfaits réels, question de la vitamine B12, doses, critères de qualité et comment choisir l'une ou l'autre.",
  },
  "berberine-glycemie-metabolisme-naturel": {
    seoTitle: "Berbérine : glycémie, cholestérol, dosage et risques",
    metaDescription: "Berbérine : effets sur la glycémie comparés à la metformine, sur le cholestérol et le poids. Dosage, absorption, effets secondaires et interactions.",
  },
  "nad-nmn-niacine-longevite-energie": {
    seoTitle: "NAD+, NMN ou NR : que choisir pour la longévité ?",
    metaDescription: "NAD+ : pourquoi il baisse avec l'âge et que valent NMN, NR et niacine. Doses, synergies, effets réellement attendus et qualité des produits.",
  },
  "beta-alanine-endurance-performance-musculaire": {
    seoTitle: "Bêta-alanine : dosage, picotements et performance",
    metaDescription: "Bêta-alanine : elle augmente la carnosine et retarde l'acidose musculaire. Bénéfices prouvés, dosage, picotements, timing et associations utiles.",
  },
  "lion-mane-champignon-cerveau-cognition": {
    seoTitle: "Lion's Mane : mémoire, cerveau et dosage",
    metaDescription: "Lion's Mane (Hericium erinaceus) : effet sur le NGF, études sur la mémoire et l'humeur, formes disponibles, dosages et précautions avant d'en prendre.",
  },
  "huile-poisson-omega-3-dha-epa-guide": {
    seoTitle: "Huile de poisson : EPA, DHA et comment bien la choisir",
    metaDescription: "Huile de poisson : rôle de l'EPA et du DHA, doses selon l'objectif, formes TG, EE, rTG, krill et algue, critères de pureté pour choisir une bonne huile.",
  },
  "ashwagandha-ksm66-stress-testosterone-cortisol": {
    seoTitle: "Ashwagandha KSM-66 : cortisol, testostérone et force",
    metaDescription: "Ashwagandha KSM-66 : l'extrait le plus étudié en clinique. Effets sur le cortisol, l'anxiété, la testostérone, la force et le sommeil, dosages et limites.",
  },
  "citruline-malate-nitrique-oxyde-pump": {
    seoTitle: "Citrulline malate : pump, endurance et dosage",
    metaDescription: "Citrulline malate : pourquoi elle fait mieux que l'arginine pour le monoxyde d'azote, ce qu'elle apporte au pump et à l'endurance, et comment la doser.",
  },
  "acide-alpha-lipoique-antioxydant-glycemie": {
    seoTitle: "Acide alpha-lipoïque : glycémie et antioxydant",
    metaDescription: "Acide alpha-lipoïque : il régénère d'autres antioxydants et améliore la sensibilité à l'insuline. Formes R ou S, dosages étudiés, synergies et précautions.",
  },
  "taurine-energie-coeur-performance": {
    seoTitle: "Taurine : effets sur le cœur, l'énergie et le sport",
    metaDescription: "Taurine : un acide aminé soufré, pas un stimulant. Fonctions, effets documentés sur le cœur, les muscles et le cerveau, dosages et associations utiles.",
  },
  "vitamine-k2-mk7-os-coeur-calcium": {
    seoTitle: "Vitamine K2 MK-7 : calcium, os et artères",
    metaDescription: "Vitamine K2 MK-7 : elle oriente le calcium vers les os plutôt que vers les artères. Formes, sources, doses, association avec la vitamine D3 et précautions.",
  },
  "mots-c-ss-31-peptides-mitochondries": {
    seoTitle: "MOTS-c et SS-31 : peptides mitochondriaux et preuves",
    metaDescription: "MOTS-c et SS-31 (élamipretide) : mécanismes, AMPK, essais cliniques, approbation FDA 2025 pour le syndrome de Barth, statut antidopage et limites réelles.",
  },
  "peptides-bilan-sanguin-marqueurs-a-suivre": {
    seoTitle: "Peptides et bilan sanguin : les marqueurs à suivre",
    metaDescription: "Peptides et bilan sanguin : IGF-1, glycémie, HbA1c, lipides, foie, reins, NFS, prolactine, TSH, CRP. Les marqueurs à suivre avant, pendant et après.",
  },
  "urolithine-a-mitophagie-muscle-longevite": {
    seoTitle: "Urolithine A : bienfaits, doses étudiées et limites",
    metaDescription: "Urolithine A : mitophagie, muscle, endurance et longévité. Métabotypes, essais humains, aliments, doses étudiées et interactions, sans le marketing.",
  },
  "meilleurs-peptides-performance-sportive": {
    seoTitle: "Peptides musculation : 9 options, effets et risques",
    metaDescription: "Peptides en musculation : 9 options populaires comparées, leurs objectifs, leurs limites, leurs risques et le statut légal avant d'envisager un protocole.",
  },
  "mesaventures-de-musculation": {
    seoTitle: "Erreurs en musculation : 5 pièges qui freinent vos progrès",
    metaDescription: "Se comparer au mauvais modèle, refaire la même séance, trop d'abdos, pas assez de protéines, pas de périodisation : 5 erreurs fréquentes en musculation.",
  },
  "la-connexion-esprit-muscle": {
    seoTitle: "Focus interne ou externe : quel effet sur le muscle ?",
    metaDescription: "Focus interne ou externe : quand la connexion esprit-muscle augmente l'activation et l'hypertrophie, et quand viser la barre pour plus de force.",
  },
  "temps-sous-tension": {
    seoTitle: "TUT en musculation : la tension compte plus que le temps",
    metaDescription: "Le TUT (time under tension) fait-il grossir ? Recrutement des unités motrices, échec, charges lourdes : pourquoi la tension compte plus que la durée.",
  },
  "frequence-des-repas": {
    seoTitle: "Combien de repas par jour pour prendre du muscle ?",
    metaDescription: "Combien de repas par jour en musculation ? Fréquence des repas, composition corporelle, appétit et répartition des protéines : ce que montrent les études.",
  },
  "formation-a-la-maison": {
    seoTitle: "Salle de sport à domicile : investir et quels exercices",
    metaDescription: "Salle à domicile ou zéro matériel ? Ce qui vaut l'investissement et les exercices à faire chez soi pour le haut du corps, les jambes et les abdos.",
  },
  "entrainement-pendant-la-maladie": {
    seoTitle: "S'entraîner malade : faut-il faire sa séance ?",
    metaDescription: "S'entraîner quand on est malade : effet du sport intense et du manque de sommeil sur l'immunité, et comment adapter volume, intensité et alimentation.",
  },
  "apport-en-proteines-et-bodybuilders": {
    seoTitle: "Besoins en protéines du bodybuilder : au-delà de 1,6 g/kg",
    metaDescription: "Besoins en protéines du bodybuilder : 1,6 g/kg suffit-il ? Ce que disent les revues au-delà du résumé, et les apports en prise de masse et en sèche.",
  },
  "science-musculaire-pour-les-reducteurs": {
    seoTitle: "Muscles pennés : angle de pennation, force et masse",
    metaDescription: "Muscles pennés : pourquoi ils se contractent plus vite que leurs fibres, comment l'angle de pennation change avec l'entraînement et l'effet sur la force.",
  },
  "hormese": {
    seoTitle: "Hormèse : trouver la bonne dose d'entraînement",
    metaDescription: "Hormèse : pourquoi il existe une dose optimale d'entraînement, de nutrition et de repos. Restriction en glucides, BFR, chaud et froid : ce qui aide.",
  },
  "un-secret-de-motivation": {
    seoTitle: "Motivation à la salle : comment tenir sur la durée",
    metaDescription: "Motivation à la salle : dopamine, motivation intrinsèque et responsabilité envers les autres. Pourquoi s'entraîner pour quelqu'un aide à tenir.",
  },
  "sommeil-et-musculation": {
    seoTitle: "Sommeil et musculation : combien d'heures pour progresser",
    metaDescription: "Combien d'heures dormir pour progresser en musculation ? Effet du sommeil sur la récupération, les hormones et la force, siestes et leviers alimentaires.",
  },
  "calendrier-des-nutriments": {
    seoTitle: "Protéines et glucides avant ou après la séance ?",
    metaDescription: "Protéines et glucides avant ou après l'entraînement : le timing compte, mais après l'apport total. Qui en tire un bénéfice et en quelle quantité.",
  },
  "la-salle-daudience-des-gains": {
    seoTitle: "Quart de squat : le procès d'une mauvaise habitude",
    metaDescription: "Un procès imaginaire contre un adepte du quart de squat, jugé par des légendes de la fonte. Derrière l'humour, vos progrès dépendent de vos choix.",
  },
  "alcool-et-gains": {
    seoTitle: "Alcool et prise de muscle : synthèse, hormones, récup",
    metaDescription: "Alcool et prise de muscle : il freine la synthèse des protéines, perturbe les hormones et ralentit la récupération. Études et moyens de limiter les dégâts.",
  },
  "le-pouvoir-de-la-musculation": {
    seoTitle: "Le pouvoir de la musculation : l'histoire de Pete",
    metaDescription: "L'histoire de Pete, débutant qui découvre le bodybuilding dans un salon fitness, apprend la patience auprès d'un partenaire puis transmet à son tour.",
  },
  "un-bref-guide-de-la-coupe": {
    seoTitle: "Sèche d'été : déficit, macros, cardio et entraînement",
    metaDescription: "Sèche d'été : déficit modéré, cyclage des calories, protéines, lipides, glucides, volume d'entraînement et cardio. Les bases chiffrées pour réussir.",
  },
  "memoire-musculaire": {
    seoTitle: "Mémoire musculaire : myonoyaux et apprentissage du geste",
    metaDescription: "Pourquoi retrouve-t-on vite son muscle après un arrêt ? Apprentissage du geste, noyaux des fibres et cellules satellites : ce que dit la science.",
  },
  "genetique-et-athletes-delite": {
    seoTitle: "Génétique des athlètes d'élite : ce qui les distingue",
    metaDescription: "Pourquoi les athlètes d'élite sont-ils si doués ? Insertions musculaires, myostatine, cellules satellites, tendons, capillaires : la part de la génétique.",
  },
  "entrainement-a-jeun": {
    seoTitle: "Musculation à jeun : performance, EPOC et perte de gras",
    metaDescription: "Cardio et musculation à jeun : ce que disent les études sur l'oxydation des graisses, la performance, l'EPOC et la composition corporelle. Mode d'emploi.",
  },
  "fatigue-du-snc": {
    seoTitle: "Fatigue du SNC : définition, causes et récupération",
    metaDescription: "Fatigue du SNC : pas le coup de barre après la séance, mais une baisse de la capacité à recruter un muscle. Causes, mesure, récupération et entraînement.",
  },
  "analgesiques-et-gains": {
    seoTitle: "Anti-inflammatoires après la séance : quel effet ?",
    metaDescription: "Ibuprofène et AINS après la séance : effet sur l'inflammation, la synthèse des protéines et les cellules satellites, et pourquoi l'âge et la dose comptent.",
  },
  "science-musculaire-une-histoire": {
    seoTitle: "Contraction musculaire : de Hill à la titine",
    metaDescription: "Du modèle de Hill à la titine : comment la science explique la force excentrique, la première répétition du soulevé de terre et le rôle de l'amplitude.",
  },
  "squats-vs-poussees-de-hanche": {
    seoTitle: "Étude Barbalho : squat contre hip thrust, et ses limites",
    metaDescription: "L'étude Barbalho (2020) donnait le squat gagnant face au hip thrust pour les fessiers. Ce qu'elle montrait, ses limites et pourquoi elle a été contestée.",
  },
  "nids-de-poule": {
    seoTitle: "Blessures en musculation : adapter son programme",
    metaDescription: "Blessures en musculation : avec les années, elles s'accumulent comme des nids-de-poule. Comment adapter votre programme pour les contourner et progresser.",
  },
  "la-regle-des-3": {
    seoTitle: "Règle des 3 % : estimer son 1RM et régler ses charges",
    metaDescription: "Règle des 3 % : chaque répétition vaut environ 3 % du 1RM. Comment estimer votre 1RM, construire vos séries, ajuster vos charges, et ses limites.",
  },
  "tout-sur-la-creatine": {
    seoTitle: "Créatine : phase de charge, forme et quand la prendre",
    metaDescription: "Créatine : quelle forme choisir, faut-il une phase de charge, quand et combien en prendre, et ce que disent les études sur les reins, crampes et cheveux.",
  },
  "tout-sur-la-cafeine": {
    seoTitle: "Caféine avant l'entraînement : 3 à 6 mg/kg, effets",
    metaDescription: "Caféine avant l'entraînement : effets sur l'endurance et la force, dose efficace de 3 à 6 mg/kg, bon timing, tolérance et forme à privilégier.",
  },
  "frequence-de-formation": {
    seoTitle: "Fréquence par muscle : caler sur sa vitesse de récupération",
    metaDescription: "Taille du muscle, type de fibres et amplitude déterminent sa vitesse de récupération. Ma fréquence d'entraînement pour chaque groupe, des mollets aux pecs.",
  },
  "methodes-dintensification": {
    seoTitle: "Drop sets, rest-pause, clusters : au-delà de l'échec",
    metaDescription: "Drop sets, rest-pause, séries en cluster, négatives forcées : aller au-delà de l'échec, ce que dit la recherche et comment éviter de vous cramer.",
  },
  "dechargements": {
    seoTitle: "Décharge en musculation : signes, durée et méthode",
    metaDescription: "Décharge en musculation : pourquoi le corps en a besoin, les signes qui doivent alerter, comment la construire et combien de temps elle doit durer.",
  },
  "entrainement-thoracique-101": {
    seoTitle: "Haut et bas des pectoraux : inclinaison, prise, charges",
    metaDescription: "Haut et bas des pectoraux : largeur de prise, inclinaison du banc, barre, haltères ou machine, charges et récupération. Les pecs selon les études.",
  },
  "quantification-de-la-tension-mecanique": {
    seoTitle: "Tension mécanique : comment la mesurer et l'utiliser",
    metaDescription: "Tension mécanique, principal levier de l'hypertrophie : activation, biomécanique, amplitude, vitesse de contraction. Comment la mesurer et quoi en retenir.",
  },
  "hydratation": {
    seoTitle: "Boire à l'entraînement : combien, quand, et le sodium",
    metaDescription: "Combien boire avant et pendant l'entraînement ? Une légère déshydratation réduit force, puissance et endurance et fait monter le cortisol. Rôle du sodium.",
  },
  "la-boite-a-lunch": {
    seoTitle: "La lunch box : une leçon de responsabilité personnelle",
    metaDescription: "Trois ouvriers et leur déjeuner pour comprendre une chose simple : votre physique et votre vie dépendent surtout de ce que vous choisissez d'y mettre.",
  },
  "sadapter-a-la-resistance": {
    seoTitle: "Élastiques et chaînes : résistance variable en pratique",
    metaDescription: "Pourquoi la barre ralentit en haut du mouvement, ce qu'apportent élastiques et chaînes, charges de travail, accélération compensatoire, version maison.",
  },
  "le-livre-de-regles-du-partenaire-de-formation": {
    seoTitle: "Partenaire d'entraînement : les règles d'un bon binôme",
    metaDescription: "Partenaire d'entraînement : ponctualité, hygiène, motivation, parade, coaching mutuel et honnêteté. Les règles d'un bon binôme, études à l'appui.",
  },
  "ce-que-je-ferais-differemment": {
    seoTitle: "Musculation : ce que je ferais différemment aujourd'hui",
    metaDescription: "Apprendre avant de charger, faire du cardio, viser cinq ans plutôt que cinq jours, rééduquer ses blessures : les regrets fréquents des pratiquants.",
  },
  "quelques-physique-du-bodybuilding": {
    seoTitle: "Physique et musculation : moments de force et blocages",
    metaDescription: "Force, moments externes et internes, points de blocage : des notions simples de physique pour comprendre curl, squat et soulevé et mieux cibler un muscle.",
  },
  "soyez-excite": {
    seoTitle: "Adrénaline et force : se mettre en condition avant une série",
    metaDescription: "Pourquoi on soulève plus lourd quand on est remonté : rôle de l'adrénaline, émotions qui la déclenchent et comment s'en servir sans la gaspiller.",
  },
  "recomposition-corporelle": {
    seoTitle: "Perdre du gras sans perdre de muscle : la recomposition",
    metaDescription: "Peut-on perdre du gras sans perdre de muscle, voire en gagner ? Ce que montrent les études : protéines, entraînement, sommeil et niveau de calories.",
  },
  "ecrire-votre-propre-programme-partie-2": {
    seoTitle: "Créer son programme de musculation (2) : exercices et reps",
    metaDescription: "Créer son programme de musculation, partie 2 : spécificité, choix et ordre des exercices, plages de répétitions et fréquence, calés sur vos objectifs.",
  },
  "ecrire-votre-propre-programme-partie-1": {
    seoTitle: "Créer son programme de musculation (1) : objectifs",
    metaDescription: "Créer son programme de musculation, partie 1 : fixer des objectifs SMART et faire une auto-évaluation honnête de votre point de départ avant de commencer.",
  },
  "micronutriments": {
    seoTitle: "Micronutriments et performance : ceux qui comptent",
    metaDescription: "Vitamines B, C, E, D, sodium, magnésium, calcium, fer, zinc : lesquels comptent pour la performance et le muscle, lesquels sont inutiles en complément.",
  },
  "musculation-vs-dynamophilie": {
    seoTitle: "Musculation ou powerlifting : les vraies différences",
    metaDescription: "Musculation ou powerlifting : répétitions, temps de repos, choix des exercices, cardio et nutrition. Ce qui change vraiment entre les deux disciplines.",
  },
  "ecrire-votre-propre-programme-partie-3": {
    seoTitle: "Créer son programme (3) : variation et surcharge",
    metaDescription: "Créer son programme de musculation, partie 3 : pourquoi et à quelle fréquence varier les exercices, et les façons d'appliquer la surcharge progressive.",
  },
  "entrainement-des-mollets-101": {
    seoTitle: "Entraînement des mollets : fréquence, reps et étirement",
    metaDescription: "Pourquoi les mollets résistent à la prise de muscle et comment les entraîner : fréquence, zones de répétitions, étirement, mollets debout et assis.",
  },
  "la-taille-la-force": {
    seoTitle: "Muscle plus gros, muscle plus fort ? Le lien taille-force",
    metaDescription: "Un muscle plus gros est-il plus fort ? Adaptations nerveuses, hypertrophie, activation volontaire : ce que disent les études sur le lien taille et force.",
  },
  "inconvenient-nutritionnel": {
    seoTitle: "Mieux manger : rendre la malbouffe moins pratique",
    metaDescription: "Savoir quoi manger ne suffit pas, il faut s'y tenir. Des stratégies concrètes pour rendre la malbouffe moins pratique et les bons choix plus faciles.",
  },
  "quest-ce-que-la-broscience": {
    seoTitle: "Broscience : définition, exemples et juste milieu",
    metaDescription: "Broscience ou approche fondée sur les preuves ? Définitions, exemples (créatine, zone de combustion des graisses, périodisation) et juste milieu.",
  },
  "bcaa-pomper-ou-vider": {
    seoTitle: "BCAA et alimentation riche en protéines : utiles ?",
    metaDescription: "Les BCAA servent-ils avec une alimentation riche en protéines ? Synthèse protéique, récupération, insulinorésistance, et les rares cas où ils aident.",
  },
  "sentrainer-avec-des-masques": {
    seoTitle: "S'entraîner avec un masque : impact sur la performance",
    metaDescription: "Masque chirurgical, tissu ou FFP2 à la salle : ce que disent les études sur la respiration, l'endurance et la musculation, et comment adapter la séance.",
  },
  "mode-bete": {
    seoTitle: "Mode bête : l'humain face aux animaux, en chiffres",
    metaDescription: "Masse maigre, force, détente, vitesse de course, nage, VO2 max : comment l'humain se compare aux animaux et pourquoi le mode bête relève de l'autodérision.",
  },
  "nutrition-post-entrainement": {
    seoTitle: "Que manger après la musculation ? Nutrition post-séance",
    metaDescription: "Que manger après l'entraînement : eau et sodium, glucides selon votre fréquence de séances, protéines et vraie fenêtre anabolique, lipides et timing.",
  },
  "une-histoire-de-trois-bodybuilders": {
    seoTitle: "Trois bodybuilders, trois méthodes : qui progresse ?",
    metaDescription: "Trois débutants, un même rêve de scène, trois chemins : l'acharné sans méthode, la déçue des programmes d'influenceurs et celui qui a pris le temps.",
  },
  "etirement-et-performance": {
    seoTitle: "Étirements avant la musculation : bonne ou mauvaise idée ?",
    metaDescription: "Les étirements statiques avant la séance font baisser la force. Que faire à la place pour s'échauffer, et pourquoi l'amplitude complète aide la mobilité.",
  },
  "ischio-jambiers-et-force-de-squat": {
    seoTitle: "Ischio-jambiers : un frein à la force au squat lourd ?",
    metaDescription: "Les ischio-jambiers s'activent peu au squat selon l'EMG mais limitent les charges maximales et les séries à l'échec. Pourquoi, et comment les travailler.",
  },
  "ecrire-votre-propre-programme-partie-4": {
    seoTitle: "Créer son programme (4) : micro, méso et macrocycles",
    metaDescription: "Créer son programme de musculation, partie 4 : microcycles, mésocycles et macrocycles, ou comment organiser semaines et blocs pour progresser sur la durée.",
  },
  "yam-creatine-the-queen-of-performance-supplements-76": {
    seoTitle: "Créatine et performance : stockage, dose et protocole",
    metaDescription: "Créatine : comment elle fournit l'énergie des efforts intenses, combien le muscle en stocke, quelle dose et quel protocole choisir, et sa sécurité.",
  },
  "yam-beta-lanine--supplement-to-support-resistance-": {
    seoTitle: "Bêta-alanine et carnosine : dose et sports concernés",
    metaDescription: "Bêta-alanine : la carnosine tamponne l'acidité de l'effort intense. Mécanisme, doses de 2 à 6 g par jour, sports concernés et picotements expliqués.",
  },
  "yam-ashwagandha--valuable-lly-gainst-stress-952": {
    seoTitle: "Ashwagandha et stress : withanolides, cortisol, récup",
    metaDescription: "Ashwagandha, plante phare de l'ayurvéda : withanolides, effets sur le cortisol, le cerveau et la récupération. Ce que montrent les études contre le stress.",
  },
  "yam-guarana-properties-benefits-nd-curiosities-987": {
    seoTitle: "Guarana : caféine, effets et bienfaits démontrés",
    metaDescription: "Guarana : origine, extraits, caféine (guaranine), théophylline, théobromine et polyphénols. Ce qu'il contient, ses effets énergisants et ses bienfaits.",
  },
  "yam-essential-mino-cids-more-on-the-most-discussed-s": {
    seoTitle: "Acides aminés essentiels : besoins, ratio et qualité",
    metaDescription: "Les 9 acides aminés essentiels : besoins quotidiens, ratio essentiels et non essentiels, intérêt des formes libres et critères de qualité d'un complément.",
  },
  "yam-prebiotics-probiotics-nd-intestinal-bacterial-flo": {
    seoTitle: "Flore intestinale du sportif : prébiotiques, probiotiques",
    metaDescription: "Flore intestinale : rôle du microbiote, causes de dysbiose (antibiotiques, stress, entraînement intense) et familles de probiotiques utiles aux sportifs.",
  },
  "la-microencapsulation-dans-les-complements-alimentaires": {
    seoTitle: "Microencapsulation des compléments : principe et limites",
    metaDescription: "Microencapsulation : comment elle vise à améliorer solubilité, stabilité et absorption des actifs des compléments comme la créatine. Principe et limites.",
  },
  "yam-sports-nd-nutrition-the-importance-of-carbohydrat": {
    seoTitle: "Glucides et sport : maltodextrine, isomaltulose et dextrine",
    metaDescription: "Glucides et effort intense : dextrine cyclique, isomaltulose, maltodextrines nouvelle génération. Ce qui change pendant l'entraînement et la compétition.",
  },
  "yam-carbohydrates-why-how-many-nd-which-ones-to-take-": {
    seoTitle: "Glucides en endurance : combien et lesquels prendre",
    metaDescription: "Glucides en endurance : rôle du glycogène, quantités par jour et pendant l'effort, indice glycémique et glucides de nouvelle génération pour le sportif.",
  },
  "yam-endurance-nd-proteins--necessary-combination-9": {
    seoTitle: "Protéines et endurance : besoins du sportif",
    metaDescription: "Les sportifs d'endurance pensent glucides, mais les protéines comptent pour la récupération et la masse maigre. Besoins, sources et idées reçues.",
  },
  "yam-dehydration-nd-mineral-salts-role-nd-functions-": {
    seoTitle: "Déshydratation et sels minéraux : sodium, potassium",
    metaDescription: "Déshydratation à l'effort : répartition de l'eau, rôle du sodium, du potassium et du magnésium, osmolarité des boissons et effets sur la performance.",
  },
  "yam-cycling-nutrition-978": {
    seoTitle: "Nutrition du cycliste : avant, pendant et après la sortie",
    metaDescription: "Que manger avant, pendant et après une sortie vélo ? Hydratation, glycogène, protéines, vitamines et composition corporelle du cycliste, études à l'appui.",
  },
  "yam-athlete-nutrition-focus-on-the-tennis-player-945": {
    seoTitle: "Nutrition du joueur de tennis : glucides et hydratation",
    metaDescription: "Nutrition du joueur de tennis : glucides de 6 à 10 g/kg, lipides, hydratation de 400 à 1000 ml par heure et récupération entre efforts et longs matchs.",
  },
  "yam-athlete-nutrition-focus-on-the-sprinter-937": {
    seoTitle: "Nutrition du sprinteur : glucides, protéines, course",
    metaDescription: "Nutrition du sprinteur : puissance et système des phosphates. Glucides de 5 à 7 g/kg, protéines vers 1,6 g/kg, lipides et hydratation le jour de course.",
  },
  "yam-winter-sports-nutrition-nd-supplementation-953": {
    seoTitle: "Sports d'hiver et ski de fond : nutrition et compléments",
    metaDescription: "Sports d'hiver : froid, altitude et forte dépense. Besoins en glucides, protéines, graisses, eau, fer et vitamine D des skieurs, surtout en ski de fond.",
  },
  "yam-energy-bars-in-endurance-sports-928": {
    seoTitle: "Barres énergétiques en endurance : quand et lesquelles",
    metaDescription: "Barres énergétiques : les réserves de glucides s'épuisent en 60 à 90 minutes d'effort. Quand les prendre avant et pendant l'effort, et comment les choisir.",
  },
  "yam-is-there--best-training-for-hypertrophy-volume-vs": {
    seoTitle: "Hypertrophie : faut-il plus de volume ou plus de charge ?",
    metaDescription: "Volume élevé ou charges lourdes ? Ce que montrent les études sur le stress mécanique et métabolique, et pourquoi la planification prime sur la méthode.",
  },
  "yam-sst-method-sarcoplasmic-stimulation-training-669": {
    seoTitle: "Méthode SST : la stimulation sarcoplasmique",
    metaDescription: "Méthode SST : cibler l'hypertrophie sarcoplasmique par le stress métabolique. Protocole classique, variante à repos dégressifs et ce que dit la recherche.",
  },
  "yam-shoulder-training-the-5-best-exercises-for-deltoid": {
    seoTitle: "Épaules : les 5 meilleurs exercices pour les deltoïdes",
    metaDescription: "Les trois faisceaux du deltoïde et 5 exercices pour les travailler : oiseau, élévations latérales et frontales, développé militaire, avec la technique.",
  },
  "yam-pump-vs-cell-volumization-in-bodybuilding-30": {
    seoTitle: "Pump ou volumisation cellulaire : quelle différence ?",
    metaDescription: "Pump et volumisation cellulaire ne sont pas la même chose. Fonctionnement, intérêt du volume cellulaire et ce qui le favorise : eau, sels, créatine.",
  },
  "hypertrophie-musculaire-volume-vs-intensite": {
    seoTitle: "Volume ou intensité : combien de séries pour grossir ?",
    metaDescription: "Volume ou intensité pour l'hypertrophie : stress mécanique et métabolique, récupération, périodisation et nombre de séries par muscle selon les études.",
  },
  "yam-cross-training-what-is-it-false-myths-truth-811": {
    seoTitle: "Cross training : séance type, idées reçues et réalité",
    metaDescription: "Cross training : mouvements fonctionnels et haute intensité. Déroulé d'une séance, vrai et faux sur les blessures et la perte de poids, et l'alimentation.",
  },
  "yam-triathlon-how-to-train-practical-tips-to-get-start": {
    seoTitle: "Débuter le triathlon : entraînement et conseils pratiques",
    metaDescription: "Débuter le triathlon : nager, pédaler, courir, enchaîner les trois et gérer le stress du quotidien. Les bases et 5 conseils pour un premier triathlon.",
  },
  "yam-open-water-swimming-between-training-nutrition-nd": {
    seoTitle: "Nage en eau libre : nutrition, hydratation et course",
    metaDescription: "Nage en eau libre : froid ou chaleur, durée, glycogène, hydratation, immunité. Adapter l'alimentation à l'entraînement et en course, glucides compris.",
  },
  "yam-padel-between-fashion-training-nd-nutrition-946": {
    seoTitle: "Padel : calories dépensées et que manger avant un match",
    metaDescription: "Padel : dépense calorique, efforts aérobies et anaérobies, et comment organiser vos repas selon l'heure du match pour jouer sans lourdeur et avec énergie.",
  },
  "yam-physiology-nd-nutrition-of-ltitude-training-93": {
    seoTitle: "Entraînement en altitude : physiologie et nutrition",
    metaDescription: "Entraînement en altitude : hypoxie, EPO, fer, hydratation, glucides, protéines et lipides. Ce que l'altitude change et comment adapter son alimentation.",
  },
  "yam-how-to-deal-with-psychophysical-work-nd-emotional": {
    seoTitle: "Stress au travail : bacopa, ginseng et ginkgo",
    metaDescription: "Travail, études, pression émotionnelle : face au stress intense, trois plantes sont les plus étudiées, le bacopa, le ginseng et le ginkgo biloba.",
  },
  "yam-the-secret-of-youthfulness-for-quality-geing-97": {
    seoTitle: "Bien vieillir : nutrition et compléments anti-âge",
    metaDescription: "Bien vieillir : vieillissement intrinsèque et extrinsèque, carences en micronutriments et compléments étudiés : oméga-3, curcuma, CoQ10, collagène.",
  },
};

export const BLOG_RELATED_LINKS: Record<string, BlogRelatedLinks> = {
  "hrv-stress-variabilite-cardiaque": {
    heading: "À lire aussi",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "6-regles-hrv-entrainement", label: "HRV et entraînement : 6 règles pour s'en servir" },
      { slug: "10-facons-ameliorer-hrv", label: "Améliorer sa HRV : 10 leviers qui marchent vraiment" },
    ],
  },
  "nerf-vague-hrv-superpower": {
    heading: "À lire aussi",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "10-facons-ameliorer-hrv", label: "Améliorer sa HRV : 10 leviers qui marchent vraiment" },
      { slug: "sympathique-parasympathique-equilibre", label: "Sympathique et parasympathique : retrouver l'équilibre" },
    ],
  },
  "10-facons-ameliorer-hrv": {
    heading: "À lire aussi",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "hrv-stress-variabilite-cardiaque", label: "HRV et stress : quand une variabilité basse doit alerter" },
      { slug: "6-regles-hrv-entrainement", label: "HRV et entraînement : 6 règles pour s'en servir" },
    ],
  },
  "sympathique-parasympathique-equilibre": {
    heading: "À lire aussi",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "respiration-systeme-nerveux-autonome", label: "Respiration et système nerveux : 5 protocoles utiles" },
      { slug: "nerf-vague-hrv-superpower", label: "Nerf vague et HRV : activer le parasympathique" },
    ],
  },
  "respiration-systeme-nerveux-autonome": {
    heading: "À lire aussi",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "sympathique-parasympathique-equilibre", label: "Sympathique et parasympathique : retrouver l'équilibre" },
      { slug: "hrv-stress-variabilite-cardiaque", label: "HRV et stress : quand une variabilité basse doit alerter" },
    ],
  },
  "5-facons-optimiser-sommeil-profond": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "cafeine-sommeil-quand-arreter", label: "Caféine et sommeil : à quelle heure arrêter le café" },
      { slug: "sleepmaxxing-tendance-expliquee", label: "Sleepmaxxing : ce qui marche et ce qui nuit au sommeil" },
    ],
  },
  "chronotype-sommeil-productivite": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "rythme-circadien-explique", label: "Rythme circadien : comment le resynchroniser" },
      { slug: "cafeine-sommeil-quand-arreter", label: "Caféine et sommeil : à quelle heure arrêter le café" },
    ],
  },
  "cafeine-sommeil-quand-arreter": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "5-facons-optimiser-sommeil-profond", label: "Sommeil profond : 5 façons d'en avoir plus" },
      { slug: "melatonine-sommeil-guide-complet", label: "Mélatonine : dose, horaire et quand elle aide vraiment" },
    ],
  },
  "rythme-circadien-explique": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "melatonine-sommeil-guide-complet", label: "Mélatonine : dose, horaire et quand elle aide vraiment" },
      { slug: "sommeil-femmes-differences", label: "Sommeil des femmes : hormones, cycle et ménopause" },
    ],
  },
  "siestes-secret-longevite": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "melatonine-sommeil-guide-complet", label: "Mélatonine : dose, horaire et quand elle aide vraiment" },
      { slug: "cafeine-sommeil-quand-arreter", label: "Caféine et sommeil : à quelle heure arrêter le café" },
    ],
  },
  "glucides-nus-pic-glycemique": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "cafeine-glycemie-cafe-pic-sucre", label: "Café et glycémie : la caféine fait-elle monter le sucre ?" },
      { slug: "fruits-glycemie-meilleurs-choix", label: "Fruits et glycémie : les meilleurs choix selon le CGM" },
    ],
  },
  "fruits-glycemie-meilleurs-choix": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "cafeine-glycemie-cafe-pic-sucre", label: "Café et glycémie : la caféine fait-elle monter le sucre ?" },
      { slug: "glucides-nus-pic-glycemique", label: "Glucides seuls : comment éviter le pic de glycémie" },
    ],
  },
  "guide-ultime-glycemie": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "glucides-nus-pic-glycemique", label: "Glucides seuls : comment éviter le pic de glycémie" },
      { slug: "fruits-glycemie-meilleurs-choix", label: "Fruits et glycémie : les meilleurs choix selon le CGM" },
      { slug: "berberine-glycemie-metabolisme-naturel", label: "Berbérine : glycémie, cholestérol, dosage et risques" },
      { slug: "menopause-glycemie-explique", label: "Ménopause et glycémie : ce qui change et quoi faire" },
      { slug: "cafeine-glycemie-cafe-pic-sucre", label: "Café et glycémie : la caféine fait-elle monter le sucre ?" },
      { slug: "acide-alpha-lipoique-antioxydant-glycemie", label: "Acide alpha-lipoïque : glycémie et antioxydant" },
      { slug: "glucose-performance-athletique", label: "Glucose et performance : bien utiliser ses glucides" },
      { slug: "reveil-3h-matin-metabolisme", label: "Réveil à 3 h du matin : les causes métaboliques" },
    ],
  },
  "iifym-macros-flexible-dieting": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "un-bref-guide-de-la-coupe", label: "Sèche d'été : déficit, macros, cardio et entraînement" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
    ],
  },
  "cafeine-glycemie-cafe-pic-sucre": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "glucides-nus-pic-glycemique", label: "Glucides seuls : comment éviter le pic de glycémie" },
      { slug: "fruits-glycemie-meilleurs-choix", label: "Fruits et glycémie : les meilleurs choix selon le CGM" },
    ],
  },
  "6-regles-hrv-entrainement": {
    heading: "À lire aussi",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "hrv-stress-variabilite-cardiaque", label: "HRV et stress : quand une variabilité basse doit alerter" },
      { slug: "10-facons-ameliorer-hrv", label: "Améliorer sa HRV : 10 leviers qui marchent vraiment" },
    ],
  },
  "zone-2-cardio-longevite": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "hrv-guide-ultime-sante", label: "HRV : le guide complet pour la mesurer et l'utiliser" },
      { slug: "running-vs-musculation", label: "Running ou musculation : lequel choisir ?" },
      { slug: "graisse-viscerale-longevite", label: "Graisse viscérale : risques, mesure et comment la perdre" },
    ],
  },
  "running-vs-musculation": {
    heading: "À lire aussi",
    links: [
      { slug: "zone-2-cardio-longevite", label: "Zone 2 : calculer et pratiquer le cardio basse intensité" },
      { slug: "recomposition-corporelle-possible", label: "Recomposition corporelle : perdre du gras, gagner du muscle" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
    ],
  },
  "glucose-performance-athletique": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "entrainement-jeun-analyse", label: "Cardio à jeun : brûle-t-il vraiment plus de graisse ?" },
    ],
  },
  "recuperation-active-passive": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "6-regles-hrv-entrainement", label: "HRV et entraînement : 6 règles pour s'en servir" },
      { slug: "deload-semaine-decharge", label: "Deload : quand et comment faire une semaine de décharge" },
    ],
  },
  "reveil-3h-matin-metabolisme": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "menopause-glycemie-explique", label: "Ménopause et glycémie : ce qui change et quoi faire" },
      { slug: "cafeine-glycemie-cafe-pic-sucre", label: "Café et glycémie : la caféine fait-elle monter le sucre ?" },
    ],
  },
  "age-metabolique-ameliorer": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "graisse-viscerale-longevite", label: "Graisse viscérale : risques, mesure et comment la perdre" },
      { slug: "strategies-boost-metabolisme", label: "Booster son métabolisme : ce qui marche vraiment" },
    ],
  },
  "menopause-glycemie-explique": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "glucose-performance-athletique", label: "Glucose et performance : bien utiliser ses glucides" },
      { slug: "cafeine-glycemie-cafe-pic-sucre", label: "Café et glycémie : la caféine fait-elle monter le sucre ?" },
    ],
  },
  "marqueurs-sanguins-sante": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "hormones-bilan-sanguin", label: "Bilan hormonal femme : quelles hormones doser et quand" },
      { slug: "testosterone-basse-lire-son-bilan-sanguin", label: "Testostérone basse : lire son bilan sanguin" },
    ],
  },
  "hrv-guide-ultime-sante": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "6-regles-hrv-entrainement", label: "HRV et entraînement : 6 règles pour s'en servir" },
      { slug: "hrv-stress-variabilite-cardiaque", label: "HRV et stress : quand une variabilité basse doit alerter" },
      { slug: "10-facons-ameliorer-hrv", label: "Améliorer sa HRV : 10 leviers qui marchent vraiment" },
      { slug: "respiration-systeme-nerveux-autonome", label: "Respiration et système nerveux : 5 protocoles utiles" },
      { slug: "nerf-vague-hrv-superpower", label: "Nerf vague et HRV : activer le parasympathique" },
      { slug: "sympathique-parasympathique-equilibre", label: "Sympathique et parasympathique : retrouver l'équilibre" },
    ],
  },
  "graisse-viscerale-longevite": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "age-metabolique-ameliorer", label: "Âge métabolique : ce qu'il mesure et comment le baisser" },
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
    ],
  },
  "mouth-taping-sommeil": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "melatonine-sommeil-guide-complet", label: "Mélatonine : dose, horaire et quand elle aide vraiment" },
      { slug: "sleepmaxxing-tendance-expliquee", label: "Sleepmaxxing : ce qui marche et ce qui nuit au sommeil" },
    ],
  },
  "palm-cooling-performance": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "techniques-intensification-guide", label: "Techniques d'intensification : drop set, rest-pause" },
      { slug: "fatigue-du-snc", label: "Fatigue du SNC : définition, causes et récupération" },
    ],
  },
  "sleepmaxxing-tendance-expliquee": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "5-facons-optimiser-sommeil-profond", label: "Sommeil profond : 5 façons d'en avoir plus" },
      { slug: "melatonine-sommeil-guide-complet", label: "Mélatonine : dose, horaire et quand elle aide vraiment" },
    ],
  },
  "cycle-menstruel-4-phases": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "hormones-bilan-sanguin", label: "Bilan hormonal femme : quelles hormones doser et quand" },
      { slug: "entrainement-pendant-regles", label: "Sport pendant les règles : faut-il s'entraîner ?" },
      { slug: "sommeil-femmes-differences", label: "Sommeil des femmes : hormones, cycle et ménopause" },
    ],
  },
  "entrainement-pendant-regles": {
    heading: "À lire aussi",
    links: [
      { slug: "cycle-menstruel-4-phases", label: "Cycle menstruel : les 4 phases et leurs effets" },
      { slug: "differences-genre-entrainement", label: "Musculation femme et homme : quelles différences ?" },
      { slug: "fer-anemie-energie-femmes-athletes", label: "Carence en fer : symptômes, ferritine et solutions" },
    ],
  },
  "sommeil-femmes-differences": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "5-facons-optimiser-sommeil-profond", label: "Sommeil profond : 5 façons d'en avoir plus" },
      { slug: "rythme-circadien-explique", label: "Rythme circadien : comment le resynchroniser" },
    ],
  },
  "hormones-bilan-sanguin": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "testosterone-basse-lire-son-bilan-sanguin", label: "Testostérone basse : lire son bilan sanguin" },
      { slug: "testosterone-naturelle-optimisation-masculine", label: "Augmenter sa testostérone naturellement : le guide" },
    ],
  },
  "temps-sous-tension-mythe": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "temps-sous-tension", label: "TUT en musculation : la tension compte plus que le temps" },
      { slug: "causes-croissance-musculaire", label: "Hypertrophie : ce qui fait vraiment grossir le muscle" },
    ],
  },
  "entrainement-echec-necessaire": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "methodes-dintensification", label: "Drop sets, rest-pause, clusters : au-delà de l'échec" },
      { slug: "variation-exercices-necessaire", label: "Varier les exercices en musculation : utile ou pas ?" },
    ],
  },
  "surcharge-progressive-guide": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ecrire-votre-propre-programme-partie-3", label: "Créer son programme (3) : variation et surcharge" },
      { slug: "temps-sous-tension-mythe", label: "Temps sous tension : utile pour l'hypertrophie ?" },
    ],
  },
  "causes-croissance-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "hypertrophie-musculaire-volume-vs-intensite", label: "Volume ou intensité : combien de séries pour grossir ?" },
      { slug: "temps-sous-tension-mythe", label: "Temps sous tension : utile pour l'hypertrophie ?" },
    ],
  },
  "recomposition-corporelle-possible": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "recomposition-corporelle", label: "Perdre du gras sans perdre de muscle : la recomposition" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
    ],
  },
  "creatine-guide-complet": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "creatine-monohydrate-guide-ultime", label: "Créatine monohydrate : reins, rétention d'eau et choix" },
      { slug: "tout-sur-la-creatine", label: "Créatine : phase de charge, forme et quand la prendre" },
      { slug: "yam-creatine-the-queen-of-performance-supplements-76", label: "Créatine et performance : stockage, dose et protocole" },
      { slug: "beta-alanine-endurance-performance-musculaire", label: "Bêta-alanine : dosage, picotements et performance" },
      { slug: "tout-sur-la-cafeine", label: "Caféine avant l'entraînement : 3 à 6 mg/kg, effets" },
      { slug: "cafeine-performance-guide", label: "Caféine et sport : dose, timing et effets sur la force" },
      { slug: "yam-essential-mino-cids-more-on-the-most-discussed-s", label: "Acides aminés essentiels : besoins, ratio et qualité" },
      { slug: "citruline-malate-nitrique-oxyde-pump", label: "Citrulline malate : pump, endurance et dosage" },
      { slug: "yam-beta-lanine--supplement-to-support-resistance-", label: "Bêta-alanine et carnosine : dose et sports concernés" },
      { slug: "acides-amines-essentiels-performance-muscle", label: "EAA : acides aminés essentiels et synthèse musculaire" },
      { slug: "bcaa-pomper-ou-vider", label: "BCAA et alimentation riche en protéines : utiles ?" },
      { slug: "bcaa-eaa-recuperation-musculaire", label: "BCAA ou EAA : lequel pour la récupération musculaire ?" },
      { slug: "bcaa-utiles-inutiles", label: "BCAA : utiles ou argent jeté par les fenêtres ?" },
    ],
  },
  "proteines-bodybuilders-doses": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "apport-en-proteines-et-bodybuilders", label: "Besoins en protéines du bodybuilder : au-delà de 1,6 g/kg" },
      { slug: "yam-endurance-nd-proteins--necessary-combination-9", label: "Protéines et endurance : besoins du sportif" },
      { slug: "calendrier-des-nutriments", label: "Protéines et glucides avant ou après la séance ?" },
      { slug: "proteine-vegetale-animale", label: "Protéines végétales ou animales : laquelle pour le muscle ?" },
      { slug: "nutrition-post-entrainement", label: "Que manger après la musculation ? Nutrition post-séance" },
      { slug: "timing-nutriments-important", label: "Timing des nutriments : ce qui compte vraiment" },
    ],
  },
  "memoire-musculaire-science": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "memoire-musculaire", label: "Mémoire musculaire : myonoyaux et apprentissage du geste" },
      { slug: "entrainement-des-mollets-101", label: "Entraînement des mollets : fréquence, reps et étirement" },
    ],
  },
  "connexion-esprit-muscle": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "la-connexion-esprit-muscle", label: "Focus interne ou externe : quel effet sur le muscle ?" },
      { slug: "amplitude-mouvement-croissance", label: "Amplitude complète ou partielles : quoi pour le muscle ?" },
    ],
  },
  "deload-semaine-decharge": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "dechargements", label: "Décharge en musculation : signes, durée et méthode" },
      { slug: "frequence-entrainement-muscle", label: "Fréquence d'entraînement : combien de fois par muscle ?" },
    ],
  },
  "guide-seche-cutting": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "un-bref-guide-de-la-coupe", label: "Sèche d'été : déficit, macros, cardio et entraînement" },
      { slug: "recomposition-corporelle", label: "Perdre du gras sans perdre de muscle : la recomposition" },
      { slug: "recomposition-corporelle-possible", label: "Recomposition corporelle : perdre du gras, gagner du muscle" },
      { slug: "entrainement-a-jeun", label: "Musculation à jeun : performance, EPOC et perte de gras" },
      { slug: "entrainement-jeun-analyse", label: "Cardio à jeun : brûle-t-il vraiment plus de graisse ?" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
      { slug: "frequence-repas-metabolisme", label: "Fréquence des repas : 3 ou 6 repas pour le métabolisme ?" },
      { slug: "frequence-des-repas", label: "Combien de repas par jour pour prendre du muscle ?" },
      { slug: "cyclage-glucides-efficace", label: "Cyclage des glucides : efficace ou inutile ?" },
      { slug: "iifym-macros-flexible-dieting", label: "IIFYM et flexible dieting : calculer ses macros" },
      { slug: "alcool-musculation-effets", label: "Alcool et musculation : l'impact réel sur vos progrès" },
      { slug: "strategies-boost-metabolisme", label: "Booster son métabolisme : ce qui marche vraiment" },
      { slug: "alcool-et-gains", label: "Alcool et prise de muscle : synthèse, hormones, récup" },
      { slug: "inconvenient-nutritionnel", label: "Mieux manger : rendre la malbouffe moins pratique" },
    ],
  },
  "excentriques-croissance-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "yam-is-there--best-training-for-hypertrophy-volume-vs", label: "Hypertrophie : faut-il plus de volume ou plus de charge ?" },
      { slug: "hypertrophie-vs-hyperplasie", label: "Hypertrophie ou hyperplasie : comment grossit le muscle" },
    ],
  },
  "mollets-guide-complet": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "entrainement-des-mollets-101", label: "Entraînement des mollets : fréquence, reps et étirement" },
      { slug: "frequence-entrainement-muscle", label: "Fréquence d'entraînement : combien de fois par muscle ?" },
    ],
  },
  "alcool-musculation-effets": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "alcool-et-gains", label: "Alcool et prise de muscle : synthèse, hormones, récup" },
      { slug: "frequence-repas-metabolisme", label: "Fréquence des repas : 3 ou 6 repas pour le métabolisme ?" },
    ],
  },
  "frequence-entrainement-muscle": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "frequence-de-formation", label: "Fréquence par muscle : caler sur sa vitesse de récupération" },
      { slug: "entrainement-des-mollets-101", label: "Entraînement des mollets : fréquence, reps et étirement" },
    ],
  },
  "pectoraux-guide-scientifique": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "entrainement-thoracique-101", label: "Haut et bas des pectoraux : inclinaison, prise, charges" },
      { slug: "biomecanique-croissance-musculaire", label: "Biomécanique et hypertrophie : angle, levier et étirement" },
    ],
  },
  "entrainement-jeun-analyse": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "entrainement-a-jeun", label: "Musculation à jeun : performance, EPOC et perte de gras" },
      { slug: "recomposition-corporelle", label: "Perdre du gras sans perdre de muscle : la recomposition" },
    ],
  },
  "potentiel-genetique-musculation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "genetique-et-athletes-delite", label: "Génétique des athlètes d'élite : ce qui les distingue" },
      { slug: "entrainer-types-fibres-musculaires", label: "Fibres musculaires lentes et rapides : comment les entraîner" },
    ],
  },
  "timing-nutriments-important": {
    heading: "À lire aussi",
    links: [
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
      { slug: "calendrier-des-nutriments", label: "Protéines et glucides avant ou après la séance ?" },
      { slug: "nutrition-post-entrainement", label: "Que manger après la musculation ? Nutrition post-séance" },
    ],
  },
  "frequence-repas-metabolisme": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "frequence-des-repas", label: "Combien de repas par jour pour prendre du muscle ?" },
      { slug: "recomposition-corporelle", label: "Perdre du gras sans perdre de muscle : la recomposition" },
    ],
  },
  "bcaa-utiles-inutiles": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "bcaa-pomper-ou-vider", label: "BCAA et alimentation riche en protéines : utiles ?" },
      { slug: "bcaa-eaa-recuperation-musculaire", label: "BCAA ou EAA : lequel pour la récupération musculaire ?" },
    ],
  },
  "amplitude-mouvement-croissance": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "biomecanique-croissance-musculaire", label: "Biomécanique et hypertrophie : angle, levier et étirement" },
      { slug: "science-musculaire-une-histoire", label: "Contraction musculaire : de Hill à la titine" },
    ],
  },
  "proteine-vegetale-animale": {
    heading: "À lire aussi",
    links: [
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
      { slug: "apport-en-proteines-et-bodybuilders", label: "Besoins en protéines du bodybuilder : au-delà de 1,6 g/kg" },
      { slug: "yam-endurance-nd-proteins--necessary-combination-9", label: "Protéines et endurance : besoins du sportif" },
    ],
  },
  "periodisation-musculation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "hypertrophie-musculaire-volume-vs-intensite", label: "Volume ou intensité : combien de séries pour grossir ?" },
      { slug: "ecrire-votre-propre-programme-partie-4", label: "Créer son programme (4) : micro, méso et macrocycles" },
    ],
  },
  "fatigue-systeme-nerveux": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "fatigue-du-snc", label: "Fatigue du SNC : définition, causes et récupération" },
      { slug: "deload-semaine-decharge", label: "Deload : quand et comment faire une semaine de décharge" },
    ],
  },
  "cyclage-glucides-efficace": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "un-bref-guide-de-la-coupe", label: "Sèche d'été : déficit, macros, cardio et entraînement" },
      { slug: "frequence-repas-metabolisme", label: "Fréquence des repas : 3 ou 6 repas pour le métabolisme ?" },
    ],
  },
  "resistance-accommodante-bandes-chaines": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "sadapter-a-la-resistance", label: "Élastiques et chaînes : résistance variable en pratique" },
      { slug: "courbe-de-resistance-choisir-exercices", label: "Courbe de résistance : choisir ses exercices" },
    ],
  },
  "hydratation-performance-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "electrolytes-hydratation-performance", label: "Électrolytes : sodium, potassium et hydratation du sportif" },
      { slug: "hydratation", label: "Boire à l'entraînement : combien, quand, et le sodium" },
      { slug: "yam-dehydration-nd-mineral-salts-role-nd-functions-", label: "Déshydratation et sels minéraux : sodium, potassium" },
    ],
  },
  "squats-vs-hip-thrust-fessiers": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "squats-vs-poussees-de-hanche", label: "Étude Barbalho : squat contre hip thrust, et ses limites" },
      { slug: "ischio-jambiers-squat-activation", label: "Ischio-jambiers et squat : travaillent-ils vraiment ?" },
    ],
  },
  "cafeine-performance-guide": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "tout-sur-la-cafeine", label: "Caféine avant l'entraînement : 3 à 6 mg/kg, effets" },
      { slug: "cafeine-sommeil-quand-arreter", label: "Caféine et sommeil : à quelle heure arrêter le café" },
    ],
  },
  "ischio-jambiers-squat-activation": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "ischio-jambiers-et-force-de-squat", label: "Ischio-jambiers : un frein à la force au squat lourd ?" },
      { slug: "squat-erreurs-execution-corrections", label: "Squat : 5 erreurs d'exécution et corrections" },
    ],
  },
  "souleve-terre-jour-dos": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "souleve-de-terre-erreurs-execution", label: "Soulevé de terre : 6 erreurs d'exécution" },
      { slug: "souleve-terre-dangereux", label: "Soulevé de terre dangereux ? Ce que disent les données" },
    ],
  },
  "souleve-terre-dangereux": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "souleve-terre-jour-dos", label: "Soulevé de terre : séance dos ou séance jambes ?" },
      { slug: "souleve-de-terre-erreurs-execution", label: "Soulevé de terre : 6 erreurs d'exécution" },
    ],
  },
  "dorsaux-developpe-couche-mythe": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "developpe-couche-erreurs-epaules", label: "Développé couché : erreurs qui abîment l'épaule" },
      { slug: "tirage-rowing-dos-erreurs-execution", label: "Tirage et rowing : 6 erreurs qui volent le dos" },
    ],
  },
  "techniques-intensification-guide": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "methodes-dintensification", label: "Drop sets, rest-pause, clusters : au-delà de l'échec" },
      { slug: "entrainement-echec-necessaire", label: "Aller à l'échec en musculation : utile ou pas ?" },
    ],
  },
  "hypertrophie-vs-hyperplasie": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "causes-croissance-musculaire", label: "Hypertrophie : ce qui fait vraiment grossir le muscle" },
      { slug: "hypertrophie-musculaire-volume-vs-intensite", label: "Volume ou intensité : combien de séries pour grossir ?" },
    ],
  },
  "anti-inflammatoires-gains-musculaires": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "analgesiques-et-gains", label: "Anti-inflammatoires après la séance : quel effet ?" },
      { slug: "douleurs-musculation-technique-epaule-genou-dos", label: "Douleurs en musculation : épaule, genou, dos" },
    ],
  },
  "entrainement-maison-sans-equipement": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "formation-a-la-maison", label: "Salle de sport à domicile : investir et quels exercices" },
      { slug: "surcharge-progressive-guide", label: "Surcharge progressive : la méthode pour progresser" },
    ],
  },
  "entrainer-types-fibres-musculaires": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "potentiel-genetique-musculation", label: "Potentiel génétique en musculation : excuse ou limite ?" },
      { slug: "frequence-de-formation", label: "Fréquence par muscle : caler sur sa vitesse de récupération" },
    ],
  },
  "differences-genre-entrainement": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "cycle-menstruel-4-phases", label: "Cycle menstruel : les 4 phases et leurs effets" },
      { slug: "entrainement-pendant-regles", label: "Sport pendant les règles : faut-il s'entraîner ?" },
    ],
  },
  "squats-mauvais-genoux-mythe": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "squat-erreurs-execution-corrections", label: "Squat : 5 erreurs d'exécution et corrections" },
      { slug: "ischio-jambiers-et-force-de-squat", label: "Ischio-jambiers : un frein à la force au squat lourd ?" },
    ],
  },
  "calories-balance-energetique": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "recomposition-corporelle", label: "Perdre du gras sans perdre de muscle : la recomposition" },
      { slug: "strategies-boost-metabolisme", label: "Booster son métabolisme : ce qui marche vraiment" },
    ],
  },
  "variation-exercices-necessaire": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ecrire-votre-propre-programme-partie-3", label: "Créer son programme (3) : variation et surcharge" },
      { slug: "periodisation-musculation", label: "Périodisation en musculation : linéaire, ondulée, blocs" },
    ],
  },
  "strategies-boost-metabolisme": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
      { slug: "frequence-repas-metabolisme", label: "Fréquence des repas : 3 ou 6 repas pour le métabolisme ?" },
    ],
  },
  "erreurs-supplements-courantes": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "guide-debutant-supplements-routine-optimale", label: "Compléments alimentaires débutant : par où commencer" },
      { slug: "la-microencapsulation-dans-les-complements-alimentaires", label: "Microencapsulation des compléments : principe et limites" },
    ],
  },
  "biomecanique-croissance-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "quantification-de-la-tension-mecanique", label: "Tension mécanique : comment la mesurer et l'utiliser" },
      { slug: "pectoraux-guide-scientifique", label: "Pectoraux : angles, exercices et volume pour progresser" },
    ],
  },
  "top-10-supplements-preuves-scientifiques": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "meilleurs-supplements-recuperation-musculaire", label: "Récupération musculaire : les 10 meilleurs compléments" },
      { slug: "omega-3-guide-complet-bienfaits", label: "Oméga-3 : bienfaits, sources et dose selon l'objectif" },
      { slug: "huile-poisson-omega-3-dha-epa-guide", label: "Huile de poisson : EPA, DHA et comment bien la choisir" },
      { slug: "erreurs-supplements-courantes", label: "Compléments alimentaires : les erreurs les plus courantes" },
      { slug: "guide-debutant-supplements-routine-optimale", label: "Compléments alimentaires débutant : par où commencer" },
      { slug: "collagene-peau-articulations-guide-complet", label: "Collagène : peau, articulations, dosage et résultats" },
      { slug: "supplements-sante-feminine-hormones-fertilite", label: "Compléments pour femmes : hormones, fertilité, ménopause" },
      { slug: "la-microencapsulation-dans-les-complements-alimentaires", label: "Microencapsulation des compléments : principe et limites" },
      { slug: "yam-the-secret-of-youthfulness-for-quality-geing-97", label: "Bien vieillir : nutrition et compléments anti-âge" },
      { slug: "regime-cetogene-keto-supplements-essentiels", label: "Régime cétogène : les compléments utiles en keto" },
      { slug: "magnesium-types-bienfaits-dosage", label: "Magnésium : quelle forme choisir et quel dosage" },
      { slug: "zinc-immunite-testosterone-sante", label: "Zinc : immunité, testostérone, carence et dosage" },
      { slug: "sureau-elderberry-immunite-antivirale", label: "Sureau noir : effets sur le rhume et la grippe" },
      { slug: "probiotiques-sante-intestinale-guide", label: "Probiotiques : quelles souches choisir et pourquoi" },
    ],
  },
  "omega-3-guide-complet-bienfaits": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "huile-poisson-omega-3-dha-epa-guide", label: "Huile de poisson : EPA, DHA et comment bien la choisir" },
      { slug: "magnesium-types-bienfaits-dosage", label: "Magnésium : quelle forme choisir et quel dosage" },
    ],
  },
  "ashwagandha-guide-complet-adaptogene": {
    heading: "À lire aussi",
    links: [
      { slug: "adaptogenes-stress-fatigue-performance", label: "Adaptogènes : rhodiola, ginseng, ashwagandha et stress" },
      { slug: "ashwagandha-ksm66-stress-testosterone-cortisol", label: "Ashwagandha KSM-66 : cortisol, testostérone et force" },
      { slug: "yam-ashwagandha--valuable-lly-gainst-stress-952", label: "Ashwagandha et stress : withanolides, cortisol, récup" },
    ],
  },
  "creatine-monohydrate-guide-ultime": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "tout-sur-la-creatine", label: "Créatine : phase de charge, forme et quand la prendre" },
      { slug: "yam-creatine-the-queen-of-performance-supplements-76", label: "Créatine et performance : stockage, dose et protocole" },
    ],
  },
  "probiotiques-sante-intestinale-guide": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "yam-prebiotics-probiotics-nd-intestinal-bacterial-flo", label: "Flore intestinale du sportif : prébiotiques, probiotiques" },
      { slug: "synbiotiques-probiotiques-prebiotiques-combines", label: "Synbiotiques : probiotiques et prébiotiques associés" },
    ],
  },
  "vitamine-d-soleil-supplementation": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "fer-anemie-energie-femmes-athletes", label: "Carence en fer : symptômes, ferritine et solutions" },
      { slug: "testosterone-basse-lire-son-bilan-sanguin", label: "Testostérone basse : lire son bilan sanguin" },
    ],
  },
  "magnesium-types-bienfaits-dosage": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "zinc-immunite-testosterone-sante", label: "Zinc : immunité, testostérone, carence et dosage" },
      { slug: "omega-3-guide-complet-bienfaits", label: "Oméga-3 : bienfaits, sources et dose selon l'objectif" },
    ],
  },
  "bcaa-eaa-recuperation-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "acides-amines-essentiels-performance-muscle", label: "EAA : acides aminés essentiels et synthèse musculaire" },
      { slug: "yam-essential-mino-cids-more-on-the-most-discussed-s", label: "Acides aminés essentiels : besoins, ratio et qualité" },
    ],
  },
  "nootropiques-naturels-cognition": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "lion-mane-champignon-cerveau-cognition", label: "Lion's Mane : mémoire, cerveau et dosage" },
      { slug: "adaptogenes-stress-fatigue-performance", label: "Adaptogènes : rhodiola, ginseng, ashwagandha et stress" },
    ],
  },
  "guide-13-vitamines-essentielles": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "mineraux-essentiels-sante-performance", label: "Minéraux essentiels : rôles, carences et absorption" },
      { slug: "zinc-immunite-testosterone-sante", label: "Zinc : immunité, testostérone, carence et dosage" },
    ],
  },
  "mineraux-essentiels-sante-performance": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "guide-13-vitamines-essentielles", label: "Les 13 vitamines essentielles : rôles, carences, sources" },
      { slug: "micronutriments", label: "Micronutriments et performance : ceux qui comptent" },
    ],
  },
  "sureau-elderberry-immunite-antivirale": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "zinc-immunite-testosterone-sante", label: "Zinc : immunité, testostérone, carence et dosage" },
      { slug: "vitamine-d-soleil-supplementation", label: "Vitamine D : carence, taux à viser et supplémentation" },
    ],
  },
  "curcuma-curcumine-inflammation-douleurs": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "meilleurs-supplements-recuperation-musculaire", label: "Récupération musculaire : les 10 meilleurs compléments" },
      { slug: "urolithine-a-mitophagie-muscle-longevite", label: "Urolithine A : bienfaits, doses étudiées et limites" },
    ],
  },
  "testosterone-naturelle-optimisation-masculine": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "testosterone-basse-lire-son-bilan-sanguin", label: "Testostérone basse : lire son bilan sanguin" },
      { slug: "hormones-bilan-sanguin", label: "Bilan hormonal femme : quelles hormones doser et quand" },
    ],
  },
  "meilleurs-supplements-recuperation-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "omega-3-guide-complet-bienfaits", label: "Oméga-3 : bienfaits, sources et dose selon l'objectif" },
      { slug: "curcuma-curcumine-inflammation-douleurs", label: "Curcumine : inflammation, arthrose et absorption" },
    ],
  },
  "regime-cetogene-keto-supplements-essentiels": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "electrolytes-hydratation-performance", label: "Électrolytes : sodium, potassium et hydratation du sportif" },
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
    ],
  },
  "synbiotiques-probiotiques-prebiotiques-combines": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "yam-prebiotics-probiotics-nd-intestinal-bacterial-flo", label: "Flore intestinale du sportif : prébiotiques, probiotiques" },
      { slug: "probiotiques-sante-intestinale-guide", label: "Probiotiques : quelles souches choisir et pourquoi" },
    ],
  },
  "supplements-sante-feminine-hormones-fertilite": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "fer-anemie-energie-femmes-athletes", label: "Carence en fer : symptômes, ferritine et solutions" },
      { slug: "cycle-menstruel-4-phases", label: "Cycle menstruel : les 4 phases et leurs effets" },
    ],
  },
  "guide-debutant-supplements-routine-optimale": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "erreurs-supplements-courantes", label: "Compléments alimentaires : les erreurs les plus courantes" },
      { slug: "supplements-sante-feminine-hormones-fertilite", label: "Compléments pour femmes : hormones, fertilité, ménopause" },
    ],
  },
  "collagene-peau-articulations-guide-complet": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "glycine-sommeil-collagene-longevite", label: "Glycine : sommeil, collagène et longévité" },
      { slug: "ghk-cu-peptide-cuivre-peau-cheveux", label: "GHK-Cu : peptide de cuivre, peau et cheveux" },
    ],
  },
  "adaptogenes-stress-fatigue-performance": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "yam-how-to-deal-with-psychophysical-work-nd-emotional", label: "Stress au travail : bacopa, ginseng et ginkgo" },
      { slug: "yam-ashwagandha--valuable-lly-gainst-stress-952", label: "Ashwagandha et stress : withanolides, cortisol, récup" },
      { slug: "ashwagandha-ksm66-stress-testosterone-cortisol", label: "Ashwagandha KSM-66 : cortisol, testostérone et force" },
      { slug: "ashwagandha-guide-complet-adaptogene", label: "Ashwagandha : bienfaits, dosage et contre-indications" },
    ],
  },
  "acides-amines-essentiels-performance-muscle": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "bcaa-eaa-recuperation-musculaire", label: "BCAA ou EAA : lequel pour la récupération musculaire ?" },
      { slug: "yam-essential-mino-cids-more-on-the-most-discussed-s", label: "Acides aminés essentiels : besoins, ratio et qualité" },
    ],
  },
  "melatonine-sommeil-guide-complet": {
    heading: "À lire aussi",
    links: [
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
      { slug: "siestes-secret-longevite", label: "Sieste : durée idéale, bon horaire et bienfaits" },
      { slug: "sleepmaxxing-tendance-expliquee", label: "Sleepmaxxing : ce qui marche et ce qui nuit au sommeil" },
    ],
  },
  "electrolytes-hydratation-performance": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-dehydration-nd-mineral-salts-role-nd-functions-", label: "Déshydratation et sels minéraux : sodium, potassium" },
      { slug: "hydratation", label: "Boire à l'entraînement : combien, quand, et le sodium" },
      { slug: "hydratation-performance-musculaire", label: "Hydratation et musculation : l'impact sur la force" },
    ],
  },
  "fer-anemie-energie-femmes-athletes": {
    heading: "À lire aussi",
    links: [
      { slug: "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas", label: "Bilan sanguin : 15 marqueurs oubliés" },
      { slug: "vitamine-d-soleil-supplementation", label: "Vitamine D : carence, taux à viser et supplémentation" },
      { slug: "marqueurs-sanguins-sante", label: "Analyse de sang : lire vos marqueurs sanguins" },
    ],
  },
  "zinc-immunite-testosterone-sante": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "magnesium-types-bienfaits-dosage", label: "Magnésium : quelle forme choisir et quel dosage" },
      { slug: "guide-13-vitamines-essentielles", label: "Les 13 vitamines essentielles : rôles, carences, sources" },
    ],
  },
  "coenzyme-q10-energie-coeur-anti-age": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "taurine-energie-coeur-performance", label: "Taurine : effets sur le cœur, l'énergie et le sport" },
      { slug: "nad-nmn-niacine-longevite-energie", label: "NAD+, NMN ou NR : que choisir pour la longévité ?" },
    ],
  },
  "glycine-sommeil-collagene-longevite": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "collagene-peau-articulations-guide-complet", label: "Collagène : peau, articulations, dosage et résultats" },
      { slug: "yam-the-secret-of-youthfulness-for-quality-geing-97", label: "Bien vieillir : nutrition et compléments anti-âge" },
    ],
  },
  "spiruline-chlorelle-superaliments-detox": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "guide-13-vitamines-essentielles", label: "Les 13 vitamines essentielles : rôles, carences, sources" },
      { slug: "omega-3-guide-complet-bienfaits", label: "Oméga-3 : bienfaits, sources et dose selon l'objectif" },
    ],
  },
  "berberine-glycemie-metabolisme-naturel": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "acide-alpha-lipoique-antioxydant-glycemie", label: "Acide alpha-lipoïque : glycémie et antioxydant" },
      { slug: "cafeine-glycemie-cafe-pic-sucre", label: "Café et glycémie : la caféine fait-elle monter le sucre ?" },
    ],
  },
  "nad-nmn-niacine-longevite-energie": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "yam-the-secret-of-youthfulness-for-quality-geing-97", label: "Bien vieillir : nutrition et compléments anti-âge" },
      { slug: "coenzyme-q10-energie-coeur-anti-age", label: "Coenzyme Q10 : cœur, énergie, ubiquinol ou ubiquinone" },
    ],
  },
  "beta-alanine-endurance-performance-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "yam-beta-lanine--supplement-to-support-resistance-", label: "Bêta-alanine et carnosine : dose et sports concernés" },
      { slug: "citruline-malate-nitrique-oxyde-pump", label: "Citrulline malate : pump, endurance et dosage" },
    ],
  },
  "lion-mane-champignon-cerveau-cognition": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "nootropiques-naturels-cognition", label: "Nootropiques naturels : les mieux étudiés et leurs doses" },
      { slug: "yam-how-to-deal-with-psychophysical-work-nd-emotional", label: "Stress au travail : bacopa, ginseng et ginkgo" },
    ],
  },
  "huile-poisson-omega-3-dha-epa-guide": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "omega-3-guide-complet-bienfaits", label: "Oméga-3 : bienfaits, sources et dose selon l'objectif" },
      { slug: "meilleurs-supplements-recuperation-musculaire", label: "Récupération musculaire : les 10 meilleurs compléments" },
    ],
  },
  "ashwagandha-ksm66-stress-testosterone-cortisol": {
    heading: "À lire aussi",
    links: [
      { slug: "adaptogenes-stress-fatigue-performance", label: "Adaptogènes : rhodiola, ginseng, ashwagandha et stress" },
      { slug: "ashwagandha-guide-complet-adaptogene", label: "Ashwagandha : bienfaits, dosage et contre-indications" },
      { slug: "yam-ashwagandha--valuable-lly-gainst-stress-952", label: "Ashwagandha et stress : withanolides, cortisol, récup" },
    ],
  },
  "citruline-malate-nitrique-oxyde-pump": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "beta-alanine-endurance-performance-musculaire", label: "Bêta-alanine : dosage, picotements et performance" },
      { slug: "tout-sur-la-cafeine", label: "Caféine avant l'entraînement : 3 à 6 mg/kg, effets" },
    ],
  },
  "acide-alpha-lipoique-antioxydant-glycemie": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-ultime-glycemie", label: "Glycémie : comprendre vos chiffres et la stabiliser" },
      { slug: "berberine-glycemie-metabolisme-naturel", label: "Berbérine : glycémie, cholestérol, dosage et risques" },
      { slug: "menopause-glycemie-explique", label: "Ménopause et glycémie : ce qui change et quoi faire" },
    ],
  },
  "taurine-energie-coeur-performance": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "coenzyme-q10-energie-coeur-anti-age", label: "Coenzyme Q10 : cœur, énergie, ubiquinol ou ubiquinone" },
      { slug: "beta-alanine-endurance-performance-musculaire", label: "Bêta-alanine : dosage, picotements et performance" },
    ],
  },
  "vitamine-k2-mk7-os-coeur-calcium": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "vitamine-d-soleil-supplementation", label: "Vitamine D : carence, taux à viser et supplémentation" },
      { slug: "mineraux-essentiels-sante-performance", label: "Minéraux essentiels : rôles, carences et absorption" },
    ],
  },
  "peptides-guide-complet": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "retatrutide-ce-quon-sait-vraiment-2026", label: "Rétatrutide : efficacité, risques et statut en 2026" },
      { slug: "meilleurs-peptides-performance-sportive", label: "Peptides musculation : 9 options, effets et risques" },
    ],
  },
  "glp-1-semaglutide-tirzepatide-preserver-muscle": {
    heading: "À lire aussi",
    links: [
      { slug: "retatrutide-ce-quon-sait-vraiment-2026", label: "Rétatrutide : efficacité, risques et statut en 2026" },
    ],
  },
  "bilan-sanguin-marqueurs-que-medecin-ne-demande-pas": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "hormones-bilan-sanguin", label: "Bilan hormonal femme : quelles hormones doser et quand" },
      { slug: "testosterone-naturelle-optimisation-masculine", label: "Augmenter sa testostérone naturellement : le guide" },
      { slug: "age-metabolique-ameliorer", label: "Âge métabolique : ce qu'il mesure et comment le baisser" },
    ],
  },
  "stagnation-musculation-pourquoi-vous-stagnez": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "fatigue-du-snc", label: "Fatigue du SNC : définition, causes et récupération" },
      { slug: "yam-is-there--best-training-for-hypertrophy-volume-vs", label: "Hypertrophie : faut-il plus de volume ou plus de charge ?" },
      { slug: "hypertrophie-musculaire-volume-vs-intensite", label: "Volume ou intensité : combien de séries pour grossir ?" },
      { slug: "ecrire-votre-propre-programme-partie-3", label: "Créer son programme (3) : variation et surcharge" },
      { slug: "hormese", label: "Hormèse : trouver la bonne dose d'entraînement" },
      { slug: "mesaventures-de-musculation", label: "Erreurs en musculation : 5 pièges qui freinent vos progrès" },
      { slug: "etirement-et-performance", label: "Étirements avant la musculation : bonne ou mauvaise idée ?" },
      { slug: "ecrire-votre-propre-programme-partie-2", label: "Créer son programme de musculation (2) : exercices et reps" },
      { slug: "entrainement-maison-sans-equipement", label: "Musculation à la maison sans matériel : garder ses gains" },
      { slug: "differences-genre-entrainement", label: "Musculation femme et homme : quelles différences ?" },
      { slug: "temps-sous-tension", label: "TUT en musculation : la tension compte plus que le temps" },
      { slug: "le-pouvoir-de-la-musculation", label: "Le pouvoir de la musculation : l'histoire de Pete" },
    ],
  },
  "biomecanique-musculation-guide-complet": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "biomecanique-croissance-musculaire", label: "Biomécanique et hypertrophie : angle, levier et étirement" },
      { slug: "quelques-physique-du-bodybuilding", label: "Physique et musculation : moments de force et blocages" },
      { slug: "science-musculaire-pour-les-reducteurs", label: "Muscles pennés : angle de pennation, force et masse" },
      { slug: "sadapter-a-la-resistance", label: "Élastiques et chaînes : résistance variable en pratique" },
      { slug: "resistance-accommodante-bandes-chaines", label: "Bandes et chaînes : la résistance accommodante" },
      { slug: "souleve-terre-dangereux", label: "Soulevé de terre dangereux ? Ce que disent les données" },
      { slug: "souleve-terre-jour-dos", label: "Soulevé de terre : séance dos ou séance jambes ?" },
      { slug: "ischio-jambiers-et-force-de-squat", label: "Ischio-jambiers : un frein à la force au squat lourd ?" },
      { slug: "dorsaux-developpe-couche-mythe", label: "Dorsaux au développé couché : mythe ou vraie aide ?" },
      { slug: "quantification-de-la-tension-mecanique", label: "Tension mécanique : comment la mesurer et l'utiliser" },
      { slug: "science-musculaire-une-histoire", label: "Contraction musculaire : de Hill à la titine" },
      { slug: "squats-vs-poussees-de-hanche", label: "Étude Barbalho : squat contre hip thrust, et ses limites" },
      { slug: "yam-shoulder-training-the-5-best-exercises-for-deltoid", label: "Épaules : les 5 meilleurs exercices pour les deltoïdes" },
      { slug: "pectoraux-guide-scientifique", label: "Pectoraux : angles, exercices et volume pour progresser" },
      { slug: "entrainement-thoracique-101", label: "Haut et bas des pectoraux : inclinaison, prise, charges" },
      { slug: "nids-de-poule", label: "Blessures en musculation : adapter son programme" },
      { slug: "connexion-esprit-muscle", label: "Connexion esprit-muscle : quand l'utiliser ou non" },
      { slug: "la-connexion-esprit-muscle", label: "Focus interne ou externe : quel effet sur le muscle ?" },
    ],
  },
  "meilleurs-peptides-performance-sportive": {
    heading: "À lire aussi",
    links: [
      { slug: "peptides-guide-complet", label: "Peptides : guide complet, statut légal et risques" },
      { slug: "peptides-bilan-sanguin-marqueurs-a-suivre", label: "Peptides et bilan sanguin : les marqueurs à suivre" },
      { slug: "meme-peptide-resultats-differents", label: "Même peptide, résultats différents : pourquoi" },
    ],
  },
  "mesaventures-de-musculation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ce-que-je-ferais-differemment", label: "Musculation : ce que je ferais différemment aujourd'hui" },
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
    ],
  },
  "la-connexion-esprit-muscle": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "connexion-esprit-muscle", label: "Connexion esprit-muscle : quand l'utiliser ou non" },
      { slug: "amplitude-mouvement-croissance", label: "Amplitude complète ou partielles : quoi pour le muscle ?" },
    ],
  },
  "temps-sous-tension": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "temps-sous-tension-mythe", label: "Temps sous tension : utile pour l'hypertrophie ?" },
      { slug: "causes-croissance-musculaire", label: "Hypertrophie : ce qui fait vraiment grossir le muscle" },
    ],
  },
  "frequence-des-repas": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "frequence-repas-metabolisme", label: "Fréquence des repas : 3 ou 6 repas pour le métabolisme ?" },
      { slug: "recomposition-corporelle-possible", label: "Recomposition corporelle : perdre du gras, gagner du muscle" },
    ],
  },
  "formation-a-la-maison": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "entrainement-maison-sans-equipement", label: "Musculation à la maison sans matériel : garder ses gains" },
      { slug: "ecrire-votre-propre-programme-partie-2", label: "Créer son programme de musculation (2) : exercices et reps" },
    ],
  },
  "entrainement-pendant-la-maladie": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "sentrainer-avec-des-masques", label: "S'entraîner avec un masque : impact sur la performance" },
      { slug: "sommeil-et-musculation", label: "Sommeil et musculation : combien d'heures pour progresser" },
    ],
  },
  "apport-en-proteines-et-bodybuilders": {
    heading: "À lire aussi",
    links: [
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
      { slug: "yam-endurance-nd-proteins--necessary-combination-9", label: "Protéines et endurance : besoins du sportif" },
      { slug: "calendrier-des-nutriments", label: "Protéines et glucides avant ou après la séance ?" },
    ],
  },
  "science-musculaire-pour-les-reducteurs": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "biomecanique-croissance-musculaire", label: "Biomécanique et hypertrophie : angle, levier et étirement" },
      { slug: "pectoraux-guide-scientifique", label: "Pectoraux : angles, exercices et volume pour progresser" },
    ],
  },
  "un-secret-de-motivation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "le-livre-de-regles-du-partenaire-de-formation", label: "Partenaire d'entraînement : les règles d'un bon binôme" },
      { slug: "une-histoire-de-trois-bodybuilders", label: "Trois bodybuilders, trois méthodes : qui progresse ?" },
    ],
  },
  "sommeil-et-musculation": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "cafeine-sommeil-quand-arreter", label: "Caféine et sommeil : à quelle heure arrêter le café" },
      { slug: "melatonine-sommeil-guide-complet", label: "Mélatonine : dose, horaire et quand elle aide vraiment" },
      { slug: "sommeil-femmes-differences", label: "Sommeil des femmes : hormones, cycle et ménopause" },
      { slug: "siestes-secret-longevite", label: "Sieste : durée idéale, bon horaire et bienfaits" },
      { slug: "5-facons-optimiser-sommeil-profond", label: "Sommeil profond : 5 façons d'en avoir plus" },
      { slug: "rythme-circadien-explique", label: "Rythme circadien : comment le resynchroniser" },
      { slug: "chronotype-sommeil-productivite", label: "Chronotype : Lion, Ours, Loup ou Dauphin ?" },
      { slug: "sleepmaxxing-tendance-expliquee", label: "Sleepmaxxing : ce qui marche et ce qui nuit au sommeil" },
      { slug: "mouth-taping-sommeil", label: "Mouth taping : bénéfices, risques et mode d'emploi" },
    ],
  },
  "calendrier-des-nutriments": {
    heading: "À lire aussi",
    links: [
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
      { slug: "nutrition-post-entrainement", label: "Que manger après la musculation ? Nutrition post-séance" },
    ],
  },
  "la-salle-daudience-des-gains": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "squat-erreurs-execution-corrections", label: "Squat : 5 erreurs d'exécution et corrections" },
      { slug: "amplitude-mouvement-croissance", label: "Amplitude complète ou partielles : quoi pour le muscle ?" },
    ],
  },
  "alcool-et-gains": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "alcool-musculation-effets", label: "Alcool et musculation : l'impact réel sur vos progrès" },
      { slug: "frequence-des-repas", label: "Combien de repas par jour pour prendre du muscle ?" },
    ],
  },
  "le-pouvoir-de-la-musculation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "le-livre-de-regles-du-partenaire-de-formation", label: "Partenaire d'entraînement : les règles d'un bon binôme" },
      { slug: "une-histoire-de-trois-bodybuilders", label: "Trois bodybuilders, trois méthodes : qui progresse ?" },
    ],
  },
  "un-bref-guide-de-la-coupe": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
      { slug: "iifym-macros-flexible-dieting", label: "IIFYM et flexible dieting : calculer ses macros" },
    ],
  },
  "memoire-musculaire": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "memoire-musculaire-science", label: "Mémoire musculaire : pourquoi le muscle revient vite" },
      { slug: "surcharge-progressive-guide", label: "Surcharge progressive : la méthode pour progresser" },
    ],
  },
  "genetique-et-athletes-delite": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "potentiel-genetique-musculation", label: "Potentiel génétique en musculation : excuse ou limite ?" },
      { slug: "frequence-entrainement-muscle", label: "Fréquence d'entraînement : combien de fois par muscle ?" },
    ],
  },
  "entrainement-a-jeun": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "entrainement-jeun-analyse", label: "Cardio à jeun : brûle-t-il vraiment plus de graisse ?" },
      { slug: "recomposition-corporelle", label: "Perdre du gras sans perdre de muscle : la recomposition" },
    ],
  },
  "fatigue-du-snc": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "fatigue-systeme-nerveux", label: "SNC grillé : mythe ou vraie fatigue nerveuse ?" },
      { slug: "deload-semaine-decharge", label: "Deload : quand et comment faire une semaine de décharge" },
    ],
  },
  "analgesiques-et-gains": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "anti-inflammatoires-gains-musculaires", label: "AINS et musculation : l'ibuprofène freine-t-il le muscle ?" },
    ],
  },
  "science-musculaire-une-histoire": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "amplitude-mouvement-croissance", label: "Amplitude complète ou partielles : quoi pour le muscle ?" },
      { slug: "excentriques-croissance-musculaire", label: "Phase excentrique : plus efficace pour l'hypertrophie ?" },
    ],
  },
  "squats-vs-poussees-de-hanche": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "squats-vs-hip-thrust-fessiers", label: "Squat ou hip thrust : le meilleur pour les fessiers ?" },
      { slug: "squat-erreurs-execution-corrections", label: "Squat : 5 erreurs d'exécution et corrections" },
    ],
  },
  "nids-de-poule": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "douleurs-musculation-technique-epaule-genou-dos", label: "Douleurs en musculation : épaule, genou, dos" },
      { slug: "morphologie-bras-de-levier-adapter-exercices", label: "Morphologie et bras de levier : vos exercices" },
    ],
  },
  "la-regle-des-3": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "surcharge-progressive-guide", label: "Surcharge progressive : la méthode pour progresser" },
      { slug: "periodisation-musculation", label: "Périodisation en musculation : linéaire, ondulée, blocs" },
    ],
  },
  "tout-sur-la-creatine": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "creatine-monohydrate-guide-ultime", label: "Créatine monohydrate : reins, rétention d'eau et choix" },
      { slug: "yam-creatine-the-queen-of-performance-supplements-76", label: "Créatine et performance : stockage, dose et protocole" },
    ],
  },
  "tout-sur-la-cafeine": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "cafeine-performance-guide", label: "Caféine et sport : dose, timing et effets sur la force" },
      { slug: "tout-sur-la-creatine", label: "Créatine : phase de charge, forme et quand la prendre" },
    ],
  },
  "frequence-de-formation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "frequence-entrainement-muscle", label: "Fréquence d'entraînement : combien de fois par muscle ?" },
      { slug: "entrainement-des-mollets-101", label: "Entraînement des mollets : fréquence, reps et étirement" },
    ],
  },
  "methodes-dintensification": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "techniques-intensification-guide", label: "Techniques d'intensification : drop set, rest-pause" },
      { slug: "entrainement-echec-necessaire", label: "Aller à l'échec en musculation : utile ou pas ?" },
    ],
  },
  "dechargements": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "deload-semaine-decharge", label: "Deload : quand et comment faire une semaine de décharge" },
      { slug: "periodisation-musculation", label: "Périodisation en musculation : linéaire, ondulée, blocs" },
    ],
  },
  "entrainement-thoracique-101": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "pectoraux-guide-scientifique", label: "Pectoraux : angles, exercices et volume pour progresser" },
      { slug: "courbe-de-resistance-choisir-exercices", label: "Courbe de résistance : choisir ses exercices" },
    ],
  },
  "quantification-de-la-tension-mecanique": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "biomecanique-croissance-musculaire", label: "Biomécanique et hypertrophie : angle, levier et étirement" },
      { slug: "science-musculaire-une-histoire", label: "Contraction musculaire : de Hill à la titine" },
    ],
  },
  "hydratation": {
    heading: "À lire aussi",
    links: [
      { slug: "electrolytes-hydratation-performance", label: "Électrolytes : sodium, potassium et hydratation du sportif" },
      { slug: "yam-dehydration-nd-mineral-salts-role-nd-functions-", label: "Déshydratation et sels minéraux : sodium, potassium" },
      { slug: "hydratation-performance-musculaire", label: "Hydratation et musculation : l'impact sur la force" },
    ],
  },
  "la-boite-a-lunch": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "inconvenient-nutritionnel", label: "Mieux manger : rendre la malbouffe moins pratique" },
      { slug: "un-secret-de-motivation", label: "Motivation à la salle : comment tenir sur la durée" },
    ],
  },
  "sadapter-a-la-resistance": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "resistance-accommodante-bandes-chaines", label: "Bandes et chaînes : la résistance accommodante" },
      { slug: "courbe-de-resistance-choisir-exercices", label: "Courbe de résistance : choisir ses exercices" },
    ],
  },
  "le-livre-de-regles-du-partenaire-de-formation": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "un-secret-de-motivation", label: "Motivation à la salle : comment tenir sur la durée" },
      { slug: "soyez-excite", label: "Adrénaline et force : se mettre en condition avant une série" },
    ],
  },
  "ce-que-je-ferais-differemment": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "une-histoire-de-trois-bodybuilders", label: "Trois bodybuilders, trois méthodes : qui progresse ?" },
      { slug: "entrainement-echec-necessaire", label: "Aller à l'échec en musculation : utile ou pas ?" },
    ],
  },
  "quelques-physique-du-bodybuilding": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "souleve-de-terre-erreurs-execution", label: "Soulevé de terre : 6 erreurs d'exécution" },
      { slug: "souleve-terre-jour-dos", label: "Soulevé de terre : séance dos ou séance jambes ?" },
    ],
  },
  "soyez-excite": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "entrainement-echec-necessaire", label: "Aller à l'échec en musculation : utile ou pas ?" },
      { slug: "un-secret-de-motivation", label: "Motivation à la salle : comment tenir sur la durée" },
    ],
  },
  "recomposition-corporelle": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "recomposition-corporelle-possible", label: "Recomposition corporelle : perdre du gras, gagner du muscle" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
    ],
  },
  "ecrire-votre-propre-programme-partie-2": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ecrire-votre-propre-programme-partie-3", label: "Créer son programme (3) : variation et surcharge" },
      { slug: "ecrire-votre-propre-programme-partie-1", label: "Créer son programme de musculation (1) : objectifs" },
    ],
  },
  "ecrire-votre-propre-programme-partie-1": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ecrire-votre-propre-programme-partie-2", label: "Créer son programme de musculation (2) : exercices et reps" },
      { slug: "ecrire-votre-propre-programme-partie-3", label: "Créer son programme (3) : variation et surcharge" },
    ],
  },
  "micronutriments": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "mineraux-essentiels-sante-performance", label: "Minéraux essentiels : rôles, carences et absorption" },
      { slug: "guide-13-vitamines-essentielles", label: "Les 13 vitamines essentielles : rôles, carences, sources" },
    ],
  },
  "musculation-vs-dynamophilie": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "differences-genre-entrainement", label: "Musculation femme et homme : quelles différences ?" },
      { slug: "ecrire-votre-propre-programme-partie-2", label: "Créer son programme de musculation (2) : exercices et reps" },
    ],
  },
  "ecrire-votre-propre-programme-partie-3": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ecrire-votre-propre-programme-partie-2", label: "Créer son programme de musculation (2) : exercices et reps" },
      { slug: "ecrire-votre-propre-programme-partie-1", label: "Créer son programme de musculation (1) : objectifs" },
    ],
  },
  "entrainement-des-mollets-101": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "mollets-guide-complet", label: "Mollets qui ne grossissent pas : le protocole complet" },
    ],
  },
  "la-taille-la-force": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "causes-croissance-musculaire", label: "Hypertrophie : ce qui fait vraiment grossir le muscle" },
      { slug: "musculation-vs-dynamophilie", label: "Musculation ou powerlifting : les vraies différences" },
    ],
  },
  "inconvenient-nutritionnel": {
    heading: "À lire aussi",
    links: [
      { slug: "guide-seche-cutting", label: "Sèche musculation : perdre du gras sans perdre de muscle" },
      { slug: "la-boite-a-lunch", label: "La lunch box : une leçon de responsabilité personnelle" },
      { slug: "calories-balance-energetique", label: "Balance énergétique : calories, déficit et surplus" },
    ],
  },
  "quest-ce-que-la-broscience": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "periodisation-musculation", label: "Périodisation en musculation : linéaire, ondulée, blocs" },
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
    ],
  },
  "bcaa-pomper-ou-vider": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "bcaa-utiles-inutiles", label: "BCAA : utiles ou argent jeté par les fenêtres ?" },
      { slug: "bcaa-eaa-recuperation-musculaire", label: "BCAA ou EAA : lequel pour la récupération musculaire ?" },
    ],
  },
  "sentrainer-avec-des-masques": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "entrainement-pendant-la-maladie", label: "S'entraîner malade : faut-il faire sa séance ?" },
      { slug: "respiration-systeme-nerveux-autonome", label: "Respiration et système nerveux : 5 protocoles utiles" },
    ],
  },
  "mode-bete": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "genetique-et-athletes-delite", label: "Génétique des athlètes d'élite : ce qui les distingue" },
      { slug: "la-taille-la-force", label: "Muscle plus gros, muscle plus fort ? Le lien taille-force" },
    ],
  },
  "nutrition-post-entrainement": {
    heading: "À lire aussi",
    links: [
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
      { slug: "calendrier-des-nutriments", label: "Protéines et glucides avant ou après la séance ?" },
      { slug: "timing-nutriments-important", label: "Timing des nutriments : ce qui compte vraiment" },
    ],
  },
  "une-histoire-de-trois-bodybuilders": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "ce-que-je-ferais-differemment", label: "Musculation : ce que je ferais différemment aujourd'hui" },
      { slug: "surcharge-progressive-guide", label: "Surcharge progressive : la méthode pour progresser" },
    ],
  },
  "etirement-et-performance": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "amplitude-mouvement-croissance", label: "Amplitude complète ou partielles : quoi pour le muscle ?" },
      { slug: "recuperation-active-passive", label: "Récupération active ou passive : laquelle choisir ?" },
    ],
  },
  "ischio-jambiers-et-force-de-squat": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "ischio-jambiers-squat-activation", label: "Ischio-jambiers et squat : travaillent-ils vraiment ?" },
      { slug: "squats-mauvais-genoux-mythe", label: "Squat et genoux : le squat abîme-t-il vraiment les genoux ?" },
    ],
  },
  "yam-creatine-the-queen-of-performance-supplements-76": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "creatine-monohydrate-guide-ultime", label: "Créatine monohydrate : reins, rétention d'eau et choix" },
      { slug: "tout-sur-la-creatine", label: "Créatine : phase de charge, forme et quand la prendre" },
    ],
  },
  "yam-beta-lanine--supplement-to-support-resistance-": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "beta-alanine-endurance-performance-musculaire", label: "Bêta-alanine : dosage, picotements et performance" },
      { slug: "yam-creatine-the-queen-of-performance-supplements-76", label: "Créatine et performance : stockage, dose et protocole" },
    ],
  },
  "yam-ashwagandha--valuable-lly-gainst-stress-952": {
    heading: "À lire aussi",
    links: [
      { slug: "adaptogenes-stress-fatigue-performance", label: "Adaptogènes : rhodiola, ginseng, ashwagandha et stress" },
      { slug: "ashwagandha-ksm66-stress-testosterone-cortisol", label: "Ashwagandha KSM-66 : cortisol, testostérone et force" },
      { slug: "ashwagandha-guide-complet-adaptogene", label: "Ashwagandha : bienfaits, dosage et contre-indications" },
    ],
  },
  "yam-guarana-properties-benefits-nd-curiosities-987": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "tout-sur-la-cafeine", label: "Caféine avant l'entraînement : 3 à 6 mg/kg, effets" },
      { slug: "cafeine-performance-guide", label: "Caféine et sport : dose, timing et effets sur la force" },
    ],
  },
  "yam-essential-mino-cids-more-on-the-most-discussed-s": {
    heading: "À lire aussi",
    links: [
      { slug: "creatine-guide-complet", label: "Créatine : effets, dosage de 3 à 5 g et risques réels" },
      { slug: "acides-amines-essentiels-performance-muscle", label: "EAA : acides aminés essentiels et synthèse musculaire" },
      { slug: "bcaa-eaa-recuperation-musculaire", label: "BCAA ou EAA : lequel pour la récupération musculaire ?" },
    ],
  },
  "yam-prebiotics-probiotics-nd-intestinal-bacterial-flo": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "synbiotiques-probiotiques-prebiotiques-combines", label: "Synbiotiques : probiotiques et prébiotiques associés" },
      { slug: "probiotiques-sante-intestinale-guide", label: "Probiotiques : quelles souches choisir et pourquoi" },
    ],
  },
  "la-microencapsulation-dans-les-complements-alimentaires": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "erreurs-supplements-courantes", label: "Compléments alimentaires : les erreurs les plus courantes" },
      { slug: "guide-debutant-supplements-routine-optimale", label: "Compléments alimentaires débutant : par où commencer" },
    ],
  },
  "yam-sports-nd-nutrition-the-importance-of-carbohydrat": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-athlete-nutrition-focus-on-the-sprinter-937", label: "Nutrition du sprinteur : glucides, protéines, course" },
      { slug: "yam-athlete-nutrition-focus-on-the-tennis-player-945", label: "Nutrition du joueur de tennis : glucides et hydratation" },
    ],
  },
  "yam-carbohydrates-why-how-many-nd-which-ones-to-take-": {
    heading: "Les articles de ce dossier",
    links: [
      { slug: "glucose-performance-athletique", label: "Glucose et performance : bien utiliser ses glucides" },
      { slug: "yam-energy-bars-in-endurance-sports-928", label: "Barres énergétiques en endurance : quand et lesquelles" },
      { slug: "yam-sports-nd-nutrition-the-importance-of-carbohydrat", label: "Glucides et sport : maltodextrine, isomaltulose et dextrine" },
      { slug: "yam-cycling-nutrition-978", label: "Nutrition du cycliste : avant, pendant et après la sortie" },
      { slug: "yam-athlete-nutrition-focus-on-the-sprinter-937", label: "Nutrition du sprinteur : glucides, protéines, course" },
      { slug: "yam-athlete-nutrition-focus-on-the-tennis-player-945", label: "Nutrition du joueur de tennis : glucides et hydratation" },
      { slug: "yam-physiology-nd-nutrition-of-ltitude-training-93", label: "Entraînement en altitude : physiologie et nutrition" },
      { slug: "yam-winter-sports-nutrition-nd-supplementation-953", label: "Sports d'hiver et ski de fond : nutrition et compléments" },
      { slug: "yam-open-water-swimming-between-training-nutrition-nd", label: "Nage en eau libre : nutrition, hydratation et course" },
      { slug: "yam-padel-between-fashion-training-nd-nutrition-946", label: "Padel : calories dépensées et que manger avant un match" },
      { slug: "yam-triathlon-how-to-train-practical-tips-to-get-start", label: "Débuter le triathlon : entraînement et conseils pratiques" },
      { slug: "yam-cross-training-what-is-it-false-myths-truth-811", label: "Cross training : séance type, idées reçues et réalité" },
    ],
  },
  "yam-endurance-nd-proteins--necessary-combination-9": {
    heading: "À lire aussi",
    links: [
      { slug: "proteines-bodybuilders-doses", label: "Protéines en musculation : combien par jour viser ?" },
      { slug: "apport-en-proteines-et-bodybuilders", label: "Besoins en protéines du bodybuilder : au-delà de 1,6 g/kg" },
      { slug: "calendrier-des-nutriments", label: "Protéines et glucides avant ou après la séance ?" },
    ],
  },
  "yam-dehydration-nd-mineral-salts-role-nd-functions-": {
    heading: "À lire aussi",
    links: [
      { slug: "electrolytes-hydratation-performance", label: "Électrolytes : sodium, potassium et hydratation du sportif" },
      { slug: "hydratation", label: "Boire à l'entraînement : combien, quand, et le sodium" },
      { slug: "hydratation-performance-musculaire", label: "Hydratation et musculation : l'impact sur la force" },
    ],
  },
  "yam-cycling-nutrition-978": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-physiology-nd-nutrition-of-ltitude-training-93", label: "Entraînement en altitude : physiologie et nutrition" },
      { slug: "yam-athlete-nutrition-focus-on-the-tennis-player-945", label: "Nutrition du joueur de tennis : glucides et hydratation" },
    ],
  },
  "yam-athlete-nutrition-focus-on-the-tennis-player-945": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-athlete-nutrition-focus-on-the-sprinter-937", label: "Nutrition du sprinteur : glucides, protéines, course" },
      { slug: "yam-open-water-swimming-between-training-nutrition-nd", label: "Nage en eau libre : nutrition, hydratation et course" },
    ],
  },
  "yam-athlete-nutrition-focus-on-the-sprinter-937": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-open-water-swimming-between-training-nutrition-nd", label: "Nage en eau libre : nutrition, hydratation et course" },
      { slug: "yam-athlete-nutrition-focus-on-the-tennis-player-945", label: "Nutrition du joueur de tennis : glucides et hydratation" },
    ],
  },
  "yam-winter-sports-nutrition-nd-supplementation-953": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-physiology-nd-nutrition-of-ltitude-training-93", label: "Entraînement en altitude : physiologie et nutrition" },
      { slug: "yam-open-water-swimming-between-training-nutrition-nd", label: "Nage en eau libre : nutrition, hydratation et course" },
    ],
  },
  "yam-energy-bars-in-endurance-sports-928": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-winter-sports-nutrition-nd-supplementation-953", label: "Sports d'hiver et ski de fond : nutrition et compléments" },
      { slug: "yam-cycling-nutrition-978", label: "Nutrition du cycliste : avant, pendant et après la sortie" },
    ],
  },
  "yam-is-there--best-training-for-hypertrophy-volume-vs": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "hypertrophie-musculaire-volume-vs-intensite", label: "Volume ou intensité : combien de séries pour grossir ?" },
      { slug: "causes-croissance-musculaire", label: "Hypertrophie : ce qui fait vraiment grossir le muscle" },
    ],
  },
  "yam-sst-method-sarcoplasmic-stimulation-training-669": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "yam-is-there--best-training-for-hypertrophy-volume-vs", label: "Hypertrophie : faut-il plus de volume ou plus de charge ?" },
      { slug: "yam-pump-vs-cell-volumization-in-bodybuilding-30", label: "Pump ou volumisation cellulaire : quelle différence ?" },
    ],
  },
  "yam-shoulder-training-the-5-best-exercises-for-deltoid": {
    heading: "À lire aussi",
    links: [
      { slug: "biomecanique-musculation-guide-complet", label: "Biomécanique en musculation : le guide complet" },
      { slug: "developpe-couche-erreurs-epaules", label: "Développé couché : erreurs qui abîment l'épaule" },
      { slug: "pectoraux-guide-scientifique", label: "Pectoraux : angles, exercices et volume pour progresser" },
    ],
  },
  "yam-pump-vs-cell-volumization-in-bodybuilding-30": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "yam-is-there--best-training-for-hypertrophy-volume-vs", label: "Hypertrophie : faut-il plus de volume ou plus de charge ?" },
      { slug: "hypertrophie-musculaire-volume-vs-intensite", label: "Volume ou intensité : combien de séries pour grossir ?" },
    ],
  },
  "hypertrophie-musculaire-volume-vs-intensite": {
    heading: "À lire aussi",
    links: [
      { slug: "stagnation-musculation-pourquoi-vous-stagnez", label: "Stagnation en musculation : 9 causes" },
      { slug: "yam-is-there--best-training-for-hypertrophy-volume-vs", label: "Hypertrophie : faut-il plus de volume ou plus de charge ?" },
      { slug: "causes-croissance-musculaire", label: "Hypertrophie : ce qui fait vraiment grossir le muscle" },
    ],
  },
  "yam-cross-training-what-is-it-false-myths-truth-811": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "zone-2-cardio-longevite", label: "Zone 2 : calculer et pratiquer le cardio basse intensité" },
      { slug: "running-vs-musculation", label: "Running ou musculation : lequel choisir ?" },
    ],
  },
  "yam-triathlon-how-to-train-practical-tips-to-get-start": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-cycling-nutrition-978", label: "Nutrition du cycliste : avant, pendant et après la sortie" },
      { slug: "yam-open-water-swimming-between-training-nutrition-nd", label: "Nage en eau libre : nutrition, hydratation et course" },
    ],
  },
  "yam-open-water-swimming-between-training-nutrition-nd": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-athlete-nutrition-focus-on-the-sprinter-937", label: "Nutrition du sprinteur : glucides, protéines, course" },
      { slug: "yam-physiology-nd-nutrition-of-ltitude-training-93", label: "Entraînement en altitude : physiologie et nutrition" },
    ],
  },
  "yam-padel-between-fashion-training-nd-nutrition-946": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-athlete-nutrition-focus-on-the-tennis-player-945", label: "Nutrition du joueur de tennis : glucides et hydratation" },
      { slug: "yam-cycling-nutrition-978", label: "Nutrition du cycliste : avant, pendant et après la sortie" },
    ],
  },
  "yam-physiology-nd-nutrition-of-ltitude-training-93": {
    heading: "À lire aussi",
    links: [
      { slug: "yam-carbohydrates-why-how-many-nd-which-ones-to-take-", label: "Glucides en endurance : combien et lesquels prendre" },
      { slug: "yam-winter-sports-nutrition-nd-supplementation-953", label: "Sports d'hiver et ski de fond : nutrition et compléments" },
      { slug: "yam-athlete-nutrition-focus-on-the-sprinter-937", label: "Nutrition du sprinteur : glucides, protéines, course" },
    ],
  },
  "yam-how-to-deal-with-psychophysical-work-nd-emotional": {
    heading: "À lire aussi",
    links: [
      { slug: "adaptogenes-stress-fatigue-performance", label: "Adaptogènes : rhodiola, ginseng, ashwagandha et stress" },
      { slug: "yam-ashwagandha--valuable-lly-gainst-stress-952", label: "Ashwagandha et stress : withanolides, cortisol, récup" },
      { slug: "ashwagandha-ksm66-stress-testosterone-cortisol", label: "Ashwagandha KSM-66 : cortisol, testostérone et force" },
    ],
  },
  "yam-the-secret-of-youthfulness-for-quality-geing-97": {
    heading: "À lire aussi",
    links: [
      { slug: "top-10-supplements-preuves-scientifiques", label: "Compléments efficaces : les 10 qui ont des preuves" },
      { slug: "nad-nmn-niacine-longevite-energie", label: "NAD+, NMN ou NR : que choisir pour la longévité ?" },
      { slug: "glycine-sommeil-collagene-longevite", label: "Glycine : sommeil, collagène et longévité" },
    ],
  },
};
