import type { PeptidesReport, PeptideItem, ReportSection } from "./peptidesEngine";
import {
  extractVialMg,
  extractVialQty,
} from "./peptidesReportValidator";
import {
  auditClientFacingText,
  collectClientFacingStrings,
  sanitizeClientFacingText,
} from "./clientFacingQuality";

type RepairableReport = PeptidesReport & {
  _peptauraLiveSync?: {
    country?: string;
    shippingUrl?: string;
    syncedAt?: string;
    catalogRefreshedAt?: string;
    shippingLive?: boolean;
    applied?: string[];
    failures?: string[];
    listingSnapshots?: Array<Record<string, unknown>>;
  };
};

function block(title: string, body: string): string {
  return `${title.toUpperCase()}\n${body.trim()}`;
}

function joinBlocks(...blocks: string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}

function asSentence(value: string | undefined): string {
  const cleaned = sanitizeClientFacingText(String(value || "")).replace(/[.!?:]+\s*$/g, "");
  return cleaned ? `${cleaned}.` : "";
}

function stripProjectPrefix(value: string | undefined): string {
  return String(value || "")
    .replace(/^Projet (?:theorique )?(?:de )?(?:dosage|timing|voie|duree) a (?:faire )?(?:confirmer|valider)(?: medicalement)?\s*:\s*/i, "")
    .trim();
}

function cautiousPurpose(peptide: PeptideItem): { purpose: string; rationale: string } {
  const name = peptide.name.toLowerCase();
  if (/retatrutide/.test(name)) {
    return {
      purpose: "Hypothese experimentale liee a la regulation de l'appetit et du metabolisme, a discuter avec un medecin",
      rationale: "Cette molecule a ete evoquee a cause de ton objectif de perte de masse grasse. Elle reste experimentale et non approuvee hors essai clinique. Son mecanisme ne prouve ni un benefice personnel, ni une preservation automatique du muscle, ni un rapport benefice-risque favorable pour toi.",
    };
  }
  if (/cjc/.test(name)) {
    return {
      purpose: "Hypothese experimentale autour de l'axe GH et de la recuperation, sans efficacite personnelle garantie",
      rationale: "Cette molecule a ete evoquee en lien avec tes objectifs de recuperation et de sommeil. Les promesses de hausse utile de GH, de lipolyse ou d'effet anti-age sont retirees. Le statut du produit, les donnees humaines limitees et ton bilan doivent etre examines par un medecin.",
    };
  }
  if (/ipamorelin/.test(name)) {
    return {
      purpose: "Hypothese experimentale de secretagogue de GH, a evaluer sans promesse sur le sommeil ou la composition corporelle",
      rationale: "Cette molecule a ete evoquee pour completer une discussion sur l'axe GH. Le rapport ne peut pas affirmer qu'elle sera selective, qu'elle evitera un effet hormonal indesirable ou qu'elle ameliorera ton sommeil et ta recuperation. Un medecin doit evaluer le niveau de preuve et les risques.",
    };
  }
  if (/dsip/.test(name)) {
    return {
      purpose: "Hypothese experimentale autour du sommeil, avec donnees humaines limitees et sans effet hormonal garanti",
      rationale: "Cette molecule a ete evoquee a cause de ton objectif de sommeil. Une amelioration du sommeil ou de la testostérone ne peut pas etre promise a partir du mecanisme suppose. Le produit est experimental pour cet usage et une evaluation medicale des causes du sommeil perturbe reste prioritaire.",
    };
  }
  if (/epitalon/.test(name)) {
    return {
      purpose: "Hypothese experimentale de longevite, sans benefice clinique anti-age etabli pour ton cas",
      rationale: "Cette molecule a ete evoquee pour ton interet envers la longevite. Le rapport retire les affirmations sur l'activation utile de la telomerase, le rajeunissement cellulaire ou un profil de securite exceptionnel. Les preuves humaines et le statut reglementaire doivent etre verifies avec un professionnel.",
    };
  }
  return {
    purpose: "Hypothese a discuter avec un medecin, sans efficacite ni securite garanties",
    rationale: "Cette molecule a ete evoquee a partir de ton questionnaire. Cela ne suffit pas a conclure qu'elle est adaptee. Son statut, les donnees humaines, les risques, les alternatives approuvees et ton bilan doivent etre verifies avant toute decision.",
  };
}

function cleanUnsafePeptideFields(report: RepairableReport): void {
  for (const peptide of report.peptides || []) {
    const cautious = cautiousPurpose(peptide);
    peptide.purpose = cautious.purpose;
    peptide.whyThisPeptide = cautious.rationale;
    peptide.dosage = `Projet theorique de dosage a valider medicalement: ${stripProjectPrefix(peptide.dosage)}`;
    peptide.timing = `Projet de timing a confirmer: ${stripProjectPrefix(peptide.timing)}`;
    peptide.route = `Projet de voie a confirmer: ${stripProjectPrefix(peptide.route)}`;
    peptide.cycleDuration = `Projet de duree a confirmer: ${stripProjectPrefix(peptide.cycleDuration)
      .replace(/,\s*relance si besoin[^.]*\.?/gi, "")
      .replace(/\s*Peut [eê]tre r[ée]p[ée]t[ée][^.]*\.?/gi, "")}`;

    const dosageHasDescent = /descente|diminu|r[ée]duction|baisse/i.test(peptide.dosage || "");
    if (!dosageHasDescent && /descente|diminution progressive|r[ée]duction progressive/i.test(peptide.cycleDuration || "")) {
      peptide.cycleDuration = sanitizeClientFacingText(
        (peptide.cycleDuration || "")
          .replace(/\s*avec\s+(?:une\s+)?descente progressive[^,.;]*/gi, "")
          .replace(/\s*,\s*,/g, ",")
      );
    }

    const noMixing =
      "Ne melange pas plusieurs produits dans la meme seringue sans confirmation explicite d'un medecin ou d'un pharmacien qui connait les produits, les concentrations et ton dossier.";
    peptide.timing = sanitizeClientFacingText(
      (peptide.timing || "")
        .replace(/peut [eê]tre m[ée]lang[ée][^.]*m[êe]me seringue[^.]*\.?/gi, noMixing)
        .replace(/simultan[ée]ment avec/gi, "Le meme jour que")
    );

    const vialMg = extractVialMg(peptide.vialsNeeded) || extractVialMg(peptide.reconstitution);
    const solventMatch = (peptide.reconstitution || "").match(/\+\s*(\d+(?:[.,]\d+)?)\s*ml/i);
    const solventMl = solventMatch ? Number(solventMatch[1].replace(",", ".")) : null;
    const maxDoseMatch = Array.from(
      (peptide.dosage || "").matchAll(/(\d+(?:[.,]\d+)?)\s*mg/gi)
    ).map((match) => Number(match[1].replace(",", "."))).filter(Number.isFinite);
    const maxDoseMg = maxDoseMatch.length > 0 ? Math.max(...maxDoseMatch) : null;

    if (/retatrutide/i.test(peptide.name) && vialMg && solventMl && maxDoseMg) {
      const concentration = vialMg / solventMl;
      const maxVolume = maxDoseMg / concentration;
      peptide.reconstitution = sanitizeClientFacingText(
        `Controle de coherence uniquement: un vial de ${vialMg} mg avec ${solventMl} ml donne une concentration theorique de ${concentration.toFixed(2)} mg/ml. La dose maximale mentionnee dans le projet de protocole, ${maxDoseMg} mg, correspondrait mathematiquement a ${maxVolume.toFixed(2)} ml. Ce volume peut depasser la capacite d'une seringue U-100 de 1 ml. Ne fractionne pas la dose et n'utilise pas plusieurs vials de ta propre initiative. Fais valider la concentration, le volume, le materiel et la posologie par un medecin ou un pharmacien avant toute manipulation.`
      );
    } else {
      peptide.reconstitution = sanitizeClientFacingText(
        `La reconstitution ne doit pas etre improvisee a partir d'une formule generale. Le volume de solvant, la concentration finale, la stabilite, la capacite de la seringue et la compatibilite du produit doivent etre controles ensemble. Fais verifier le calcul exact de ${peptide.name} par un medecin ou un pharmacien avant toute manipulation. Ne melange pas ce produit avec un autre dans la meme seringue sans accord explicite.`
      );
    }
  }
}

function peptideIdentity(peptide: PeptideItem): string {
  return joinBlocks(
    block(peptide.name, [
      `Objectif evoque dans le rapport: ${asSentence(peptide.purpose)}`,
      `Dosage: ${asSentence(peptide.dosage)}`,
      `Timing: ${asSentence(peptide.timing)}`,
      `Duree: ${asSentence(peptide.cycleDuration)}`,
      `Quantite calculee: ${asSentence(peptide.vialsNeeded)}`,
      `Verification live: ${asSentence(peptide.priceEstimate)}`,
      `Lien catalogue: ${asSentence(peptide.purchaseUrl)}`,
      `Point de securite: ${asSentence(peptide.reconstitution)}`,
    ].join("\n"))
  );
}

function allPeptideIdentities(report: RepairableReport): string {
  return (report.peptides || []).map(peptideIdentity).join("\n\n");
}

function liveShoppingLines(report: RepairableReport): string {
  return (report.peptides || []).map((peptide, index) => [
    `${index + 1}. ${peptide.name}`,
    `Quantite calculee: ${peptide.vialsNeeded}.`,
    `Offre live retenue: ${peptide.priceEstimate}.`,
    `Page produit: ${peptide.purchaseUrl}.`,
  ].join("\n")).join("\n\n");
}

function buildSections(report: RepairableReport, firstName: string): ReportSection[] {
  const sync = report._peptauraLiveSync || {};
  const country = sync.country || "ton pays";
  const shippingUrl = sync.shippingUrl || `https://www.peptaura.com/shipping?country=${encodeURIComponent(country)}`;
  const syncedAt = sync.syncedAt
    ? new Date(sync.syncedAt).toLocaleString("fr-FR", { timeZone: "Asia/Dubai" })
    : "au moment de la verification";
  const catalogAt = sync.catalogRefreshedAt
    ? new Date(sync.catalogRefreshedAt).toLocaleString("fr-FR", { timeZone: "Asia/Dubai" })
    : "au moment de la verification";
  const peptideNames = (report.peptides || []).map((peptide) => peptide.name).join(", ");
  const identities = allPeptideIdentities(report);
  const shopping = liveShoppingLines(report);

  const medicalGate = `${firstName}, ce rapport est un document de preparation a une discussion medicale. Il ne remplace ni un diagnostic, ni une prescription, ni une formation pratique. Plusieurs molecules citees ici sont experimentales ou non approuvees pour cet usage, avec des donnees humaines encore limitees. Avant tout achat ou toute utilisation, demande a ton medecin ou a ton pharmacien de verifier la molecule, la dose, la concentration, tes allergies, tes traitements et tes analyses. Sans validation explicite, tu ne commences pas.`;

  const sectionContent: Record<string, { title: string; content: string }> = {
    "profil-synthese": {
      title: "Synthese de ton profil et priorites",
      content: joinBlocks(
        block("Ce que ton questionnaire permet d'affirmer", `${firstName}, ton objectif prioritaire est une perte de masse grasse avec maintien de la masse musculaire. Tu veux aussi travailler le sommeil, la recuperation et certains marqueurs hormonaux. Tu as indique une apprehension vis-a-vis des injections, une allergie a la penicilline et au rhume des foins, un historique de MK-677 et de SARMs, ainsi qu'aucun peptide en cours. Ces informations servent a identifier les points a controler. Elles ne suffisent pas a conclure qu'une molecule est adaptee ou sans risque pour toi.`),
        block("Priorite avant le stack", "A 23 ans, le premier levier reste un bilan medical propre, une strategie nutritionnelle tenable, un sommeil mesure sur plusieurs semaines et un programme d'entrainement coherent. Une baisse de testostérone ressentie ne se diagnostique pas sur des sensations seules. Une fatigue, un sommeil instable ou une recomposition difficile peuvent avoir plusieurs causes. Il faut distinguer ce qui releve du mode de vie, d'un probleme medical, d'un effet residuel de produits utilises auparavant ou d'une attente trop agressive sur le rythme de perte de gras."),
        block("Points personnels a signaler", "Mentionne au professionnel de sante ton allergie a la penicilline, tes symptomes allergiques saisonniers, ton historique de produits de performance, tes supplements actuels et ton apprehension face aux injections. Une allergie a la penicilline ne permet pas de conclure qu'un produit injectable est automatiquement compatible. Les excipients, le solvant, le risque de contamination et la provenance du produit comptent aussi. Ton inconfort avec les aiguilles justifie une vraie demonstration par un professionnel, pas une simple lecture en ligne."),
        block("Objectif realiste", "Le bon resultat n'est pas de suivre le plus gros stack possible. Le bon resultat est de choisir le minimum d'interventions, de fixer des criteres d'arret, de suivre des marqueurs objectifs et de pouvoir attribuer un effet ou un probleme a une seule modification. Si plusieurs produits commencent en meme temps, l'interpretation devient vite impossible. Une approche sequentielle, encadree et documentee est plus lisible qu'un demarrage simultane."),
        block("Regle de decision", medicalGate),
      ),
    },
    rationale: {
      title: "Lecture critique des molecules proposees",
      content: joinBlocks(
        block("Comment lire cette selection", `Le rapport initial a retenu ${peptideNames}. Cette liste doit etre lue comme une serie d'hypotheses a discuter, pas comme une ordonnance. Une molecule peut sembler coherente avec un objectif sur le papier tout en etant inadaptee a ton age, a tes antecedents, a tes analyses ou a ton niveau de risque acceptable. Le benefice attendu, la qualite des preuves humaines, le statut reglementaire, les effets indesirables et les alternatives approuvees doivent etre examines separement.`),
        block("Niveau de preuve", "Une association mecanistique ne garantit pas un benefice clinique. Le fait qu'une molecule agisse sur une voie liee a la faim, au sommeil, a l'IGF-1 ou a la secretion de GH ne prouve pas qu'elle ameliorera ton resultat personnel, ni que le rapport benefice-risque est favorable. Les promesses absolues, les comparaisons du type plus puissant ou plus propre et les delais de resultat garantis sont retires. Pour les molecules experimentales, l'incertitude fait partie de la decision et doit etre dite clairement."),
        block("Empilement et attribution", "Le stack comporte plusieurs axes a la fois: appetit et metabolisme, secretion de GH, sommeil et longevite. Plus le nombre de produits augmente, plus le suivi devient difficile. Un effet digestif, une fatigue, une reaction locale, une variation de glycemie ou un changement du sommeil ne peuvent plus etre attribues proprement. Demande au professionnel qui te suit s'il faut abandonner certaines hypotheses, commencer une seule intervention ou privilegier une option approuvee avec un suivi connu."),
        block("Fiches de controle", identities),
        block("Decision finale", medicalGate),
      ),
    },
    "bilan-sanguin": {
      title: "Tes 2 credits Blood Analysis et le bilan medical",
      content: joinBlocks(
        block("Ce que tu as achete", "Ton paiement Peptides Engine inclut 2 credits Blood Analysis. Tu peux les utiliser quand tu veux. L'usage le plus logique est un premier credit avant la mise en place de recommandations, puis le second environ 2 a 3 mois apres leur mise en place. Les credits couvrent l'analyse APEXLABS de tes resultats. Ils ne paient pas automatiquement le prelevement du laboratoire et ne remplacent pas une consultation medicale."),
        block("Premier credit", "Le premier bilan sert a disposer d'une base avant toute modification. Montre au medecin ou a l'endocrinologue tes objectifs, tes antecedents de MK-677 et de SARMs, tes supplements, tes allergies et la liste des molecules evoquees dans ce rapport. Laisse le professionnel choisir les marqueurs utiles selon ton examen, ton histoire et les recommandations applicables. Ne commande pas aveuglement une longue liste de tests uniquement parce qu'elle apparait dans un rapport."),
        block("Deuxieme credit", "Le second bilan est idealement utilise 2 a 3 mois apres la mise en place des recommandations validees. Il sert a comparer les marqueurs dans des conditions aussi proches que possible: meme laboratoire si possible, horaire similaire, conditions de jeune identiques et contexte d'entrainement note. Si un symptome apparait avant cette fenetre, le suivi ne doit pas attendre le deuxieme credit. Tu contactes le professionnel de sante sans delai."),
        block("Axes a discuter avec le medecin", "Selon ton contexte, le professionnel peut envisager une evaluation metabolique, hepatique, renale, lipidique, thyroidienne, hematologique et hormonale. Pour un axe hormonal masculin, l'interpretation depend notamment de l'heure du prelevement, des symptomes, de mesures repetees et du contexte clinique. Pour un axe GH ou IGF-1, un chiffre isole ne suffit pas non plus. Le choix exact des marqueurs, leur timing et leur interpretation appartiennent au professionnel qui connait ton dossier."),
        block("Utilisation pratique", "Quand ton PDF est pret, connecte-toi sur https://apexlabs.achzodcoaching.com/blood-dashboard avec l'adresse utilisee pour la commande. Envoie un PDF lisible et complet. Garde une copie du compte rendu du laboratoire et note la date, l'heure, le jeune, la derniere seance et tout traitement ou supplement pris. Cette trace rend la comparaison du deuxieme credit beaucoup plus utile."),
        block("Limite claire", medicalGate),
      ),
    },
    "guide-peptaura": {
      title: "Verification du catalogue Peptaura",
      content: joinBlocks(
        block("Nature de la plateforme", "Peptaura est une place de marche qui agrege des offres de fournisseurs. Une fiche presente sur la plateforme n'est pas une validation medicale, une autorisation de mise sur le marche ou une garantie pharmaceutique. Un COA fourni par un vendeur ne suffit pas, a lui seul, a prouver l'identite, la sterilite, la concentration ou la conservation d'un produit recu."),
        block("Controle live effectue", `Le catalogue a ete recrawle le ${catalogAt}. Les pages produit et les prix selectionnes ont ete relus le ${syncedAt}. Le pays de livraison utilise pour le filtre est ${country}. La page de controle est ${shippingUrl}. Les noms de fournisseurs, les stocks, les dosages proposes, les tailles de boite, les prix et les conditions de livraison peuvent changer apres cette verification.`),
        block("Avant tout paiement", "Ouvre chaque lien de la liste de courses et compare le nom exact, le dosage par vial, la taille de boite, le nombre de vials recus, le prix total, le fournisseur et le statut de stock. Verifie ensuite la livraison vers ton pays sur la page shipping. Si un seul element differe du rapport, ne substitue pas automatiquement un autre dosage ou un autre produit. Une difference de concentration change les calculs et impose une nouvelle validation."),
        block("Qualite et tracabilite", "Demande les informations de lot et les documents disponibles, puis examine leur coherence avec un professionnel qualifie. Regarde le nom du laboratoire d'analyse, la date, le numero de lot, les methodes utilisees et l'independance du test. La purete chimique ne couvre pas necessairement la sterilite, les endotoxines, l'identite du contenu ou les conditions de transport. Ne transforme jamais un document commercial en garantie de securite."),
        block("Aucune fausse promesse", "Le rapport ne presente aucun fournisseur comme une source personnelle, medicale ou garantie. Il ne promet pas un delai de livraison, une absence de controle douanier ou une qualite constante. Peptaura reste la seule source cataloguee par ce rapport. Aucun vendeur de secours non audite n'est recommande."),
        block("Decision", medicalGate),
      ),
    },
    "reconstitution-guide": {
      title: "Reconstitution: controles obligatoires",
      content: joinBlocks(
        block("Pourquoi cette partie a ete corrigee", "Une reconstitution ne se resume pas a ajouter un volume standard dans tous les vials. Le calcul depend de la quantite reelle du produit, du volume de solvant, de la concentration finale, de la stabilite, des instructions du fabricant, du materiel et de la dose validee. Une erreur d'un facteur dix peut venir d'une confusion entre mg, mcg, ml et unites U-100."),
        block("Ce que tu ne dois pas improviser", "Ne choisis pas le volume de solvant pour obtenir un chiffre pratique sans verifier les instructions du produit. Ne suppose pas qu'un vial accepte n'importe quel volume. Ne reutilise pas une seringue. Ne partage pas de materiel. Ne melange pas plusieurs produits dans la meme seringue sans confirmation explicite d'un medecin ou d'un pharmacien. Ne fractionne pas une dose en plusieurs injections pour contourner la capacite du materiel sans validation."),
        block("Controle en quatre valeurs", "Avant toute manipulation, le professionnel doit confirmer quatre valeurs ecrites: la quantite contenue dans le vial, le volume de solvant a ajouter, la concentration finale obtenue et le volume correspondant a la dose prescrite. Ces quatre valeurs doivent etre accompagnees de leur unite. Le resultat est ensuite compare a la capacite reelle de la seringue. Si une valeur manque ou si deux sources se contredisent, tu t'arretes."),
        block("Controle par molecule", (report.peptides || []).map((peptide) => `${peptide.name}: ${peptide.reconstitution}`).join("\n\n")),
        block("Hygiene et formation", "Demande une demonstration pratique a un medecin, un pharmacien ou un infirmier autorise. La formation doit couvrir le materiel sterile, la desinfection, le stockage, l'elimination des aiguilles et la conduite a tenir en cas de contamination ou d'erreur. Une video ou un texte ne permet pas de verifier ta technique. Ton apprehension face aux injections est une raison supplementaire pour ne pas apprendre seul."),
        block("Stop immediat", "Si la solution change d'aspect, si le vial est endommage, si la provenance ou le lot ne correspond pas, si la chaine de conservation est inconnue ou si le calcul exige un volume incoherent, tu n'utilises pas le produit. Tu demandes une verification au pharmacien et au fournisseur, puis tu conserves les preuves de lot et de commande."),
        block("Cadre medical", medicalGate),
      ),
    },
    "guide-injection": {
      title: "Injection: formation et securite",
      content: joinBlocks(
        block("Pas de fausse reassurance", "Une aiguille fine ne rend pas une injection sans risque. Une mauvaise technique peut provoquer une blessure, une infection, une erreur de dose, une reaction locale ou une exposition accidentelle. Le rapport ne te promet pas une injection indolore et ne pretend pas que tu ne peux pas atteindre une structure sensible. Ton anxiete est legitime et doit etre prise en compte dans la decision."),
        block("Formation en presentiel", "Avant la premiere injection, demande une demonstration a un professionnel autorise. Il doit verifier le type de seringue, la compatibilite du volume, la lecture des graduations, le site adapte, la rotation des zones, l'hygiene des mains, la preparation d'un espace propre et l'elimination du materiel. Fais-lui regarder ton geste complet jusqu'a ce que chaque etape soit comprise."),
        block("Materiel a usage unique", "Utilise uniquement du materiel sterile, intact et a usage unique provenant d'un circuit fiable. Une aiguille ou une seringue utilisee ne se remet jamais dans un vial. Ne partage aucun materiel et ne conserve pas une seringue pre-remplie sans instruction medicale et pharmaceutique explicite. Une boite pour objets piquants et tranchants doit etre disponible avant de commencer."),
        block("Pas de melange improvise", "Ne mets pas CJC-1295, Ipamorelin, DSIP ou un autre produit ensemble dans la meme seringue sur la seule base de ce rapport. La compatibilite physicochimique, la stabilite, la concentration et la tracabilite doivent etre confirmees pour les produits exacts. En cas de doute, chaque produit reste separe et tu attends l'avis du professionnel."),
        block("Apres le geste", "Note la date, l'heure, le produit, le lot, la concentration, le volume et le site. Surveille la zone sans banaliser une reaction. Une douleur croissante, une zone chaude qui s'etend, un ecoulement, une fievre, un malaise ou une reaction allergique demandent un avis medical. Une difficulte respiratoire, un gonflement du visage ou une perte de connaissance relèvent d'une urgence."),
        block("Erreur ou doute", "Si tu penses avoir mal lu une graduation, utilise le mauvais produit, contamine le materiel ou injecte un volume different de celui valide, ne tente pas de corriger avec une deuxieme dose. Garde les emballages et contacte immediatement un professionnel de sante ou un centre antipoison selon la situation."),
        block("Condition de depart", medicalGate),
      ),
    },
    "protocole-pratique": {
      title: "Projet de protocole a faire valider",
      content: joinBlocks(
        block("Statut de ce planning", "Ce planning organise les informations du rapport pour faciliter la discussion avec ton medecin ou ton pharmacien. Il ne te donne pas le feu vert pour commencer. Les doses, les jours, la duree, les pauses, le nombre de produits simultanes et les criteres d'arret doivent etre corriges ou confirmes par ecrit avant toute utilisation."),
        block("Projet par molecule", identities),
        block("Semaine type de discussion", "Lundi: revue du sommeil, de l'appetit, du poids et des symptomes, sans changement automatique de dose.\nMardi: entrainement et recuperation notes dans le journal.\nMercredi: verification de toute reaction locale ou digestive et contact medical si elle persiste.\nJeudi: aucun rattrapage et aucun doublement apres un oubli.\nVendredi: controle du materiel, des lots et du stockage avant le week-end.\nSamedi: jour de repos ou d'entrainement selon ton programme, avec hydratation et alimentation stables.\nDimanche: bilan hebdomadaire ecrit. Toute modification reste suspendue tant qu'elle n'est pas validee."),
        block("Une modification a la fois", "Ne monte pas une dose, n'ajoute pas une molecule et ne change pas ton alimentation de facon majeure la meme semaine. Si plusieurs variables changent ensemble, un effet secondaire ou une amelioration devient impossible a attribuer. Le journal doit indiquer les symptomes, le sommeil, l'appetit, le poids, le tour de taille, l'entrainement et tout changement de supplement ou de medicament."),
        block("Oubli et rattrapage", "Le rapport ne donne pas de regle universelle de rattrapage. La conduite depend du produit, de sa pharmacologie, du temps ecoule, de la dose validee et de ton etat. Ne double jamais une dose de ta propre initiative. Demande une instruction ecrite au prescripteur ou au pharmacien pour chaque molecule avant le debut."),
        block("Arret", "Les criteres d'arret doivent etre definis avant le depart: symptome nouveau important, reaction allergique, douleur persistante, vomissements ou diarrhee avec deshydratation, malaise, confusion, glycemie anormale si elle est suivie, produit ou lot douteux, resultat biologique preoccupant ou demande du professionnel. Une descente progressive ne doit pas apparaitre dans la duree du cycle si elle n'est pas detaillee et medicalement validee dans le dosage."),
        block("Validation", medicalGate),
      ),
    },
    "shopping-list": {
      title: "Liste de courses verifiee en direct",
      content: joinBlocks(
        block("Horodatage", `Les offres ont ete relues le ${syncedAt} et le crawl catalogue date du ${catalogAt}. Le filtre pays utilise est ${country}. Les prix sont des instantanes, pas des promesses. Ouvre chaque lien avant de payer et recontrole la page shipping: ${shippingUrl}.`),
        block("Produits et quantites", shopping),
        block("Lecture des quantites", "La quantite indiquee correspond au calcul du projet de dosage et au format de vial retenu. Elle ne vaut pas validation de la posologie. Si le fournisseur propose une boite, la ligne de prix distingue le nombre de boites achetees et le nombre de vials recus. Une offre qui impose plus de 20% de surstock par rapport au besoin calcule est rejetee. Une autre concentration impose un nouveau calcul."),
        block("Avant de commander", "Compare le nom exact, le dosage, la taille de boite, le fournisseur, le prix total et le pays livre. Fais une capture de la fiche, du lot et des conditions de livraison. Ne remplace jamais une molecule par un blend, une variante avec DAC, une autre forme ou une autre concentration sans nouvelle validation. N'ajoute pas de produit parce qu'il est moins cher ou disponible."),
        block("Materiel", "Le materiel injectable, le solvant et le collecteur d'aiguilles doivent venir d'un circuit fiable et etre adaptes au produit exact. La presence d'un accessoire sur une place de marche ne prouve pas qu'il est adapte. Demande au pharmacien de verifier le choix et la capacite. Ne commande pas le materiel avant d'avoir une posologie et une concentration validees."),
        block("Blocage", "Si le stock change, si le fournisseur n'expedie plus vers ton pays, si le dosage exact disparait ou si le prix semble incoherent, tu ne choisis pas l'offre la plus proche. Tu suspends l'achat et tu demandes une nouvelle verification du catalogue et du calcul."),
        block("Cadre medical", medicalGate),
      ),
    },
    "hygiene-conservation": {
      title: "Hygiene, stockage et tracabilite",
      content: joinBlocks(
        block("Trois risques differents", "La qualite chimique, la sterilite et la bonne conservation sont trois sujets distincts. Un pourcentage de purete ne prouve pas l'absence de bacteries, d'endotoxines ou d'erreur de concentration. Un produit peut aussi etre altere par un transport, une temperature ou une duree de stockage inadaptes. Le rapport ne fixe donc pas une duree universelle de conservation apres reconstitution."),
        block("Instructions du produit", "Lis les informations du fabricant et demande au pharmacien de confirmer la conservation du lot exact, avant et apres reconstitution. Note la temperature, la protection contre la lumiere, la date d'ouverture, la date de reconstitution et la duree maximale admise. Si les instructions manquent, se contredisent ou ne sont pas credibles, le produit ne doit pas etre utilise."),
        block("Frigo partage", "Dans un frigo partage, le produit doit rester dans un contenant ferme, propre, identifie et inaccessible aux autres personnes. Evite la porte du refrigerateur, les variations de temperature et tout contact avec des aliments ou des surfaces sales. Un contenant discret ne doit jamais supprimer l'etiquette, le lot, la concentration ou la date. La securite des autres personnes passe avant la discretion."),
        block("Asepsie", "Prepare une surface propre, lave et seche tes mains, puis suis exactement la technique montree par le professionnel. Ne touche pas les parties steriles. Un bouchon desinfecte ne rend pas sterile une aiguille deja utilisee. Chaque entree dans un vial se fait avec du materiel neuf selon les instructions validees. Si un doute de contamination existe, le vial est mis de cote."),
        block("Aspect et integrite", "Avant chaque utilisation, controle l'etiquette, le lot, l'integrite du vial et l'aspect de la solution. Une fuite, un bouchon endommage, une particule inattendue, un changement de couleur, une opacite ou une conservation inconnue imposent l'arret. Ne tente pas de filtrer, rechauffer, secouer ou corriger une solution suspecte."),
        block("Elimination", "Les aiguilles et objets piquants vont immediatement dans un collecteur adapte, jamais dans une poubelle ordinaire ou un sac recycle. Demande a la pharmacie la filiere locale de retour. Garde les enfants, les proches et les animaux a distance du materiel et des produits."),
        block("Verification", medicalGate),
      ),
    },
    "securite-surveillance": {
      title: "Securite, surveillance et criteres d'arret",
      content: joinBlocks(
        block("Avant de commencer", "Fais verifier ton historique medical, tes allergies, tes antecedents familiaux, tes medicaments, tes supplements et tes produits de performance passes. Les symptomes digestifs, le risque d'hypoglycemie, la fonction renale et hepatique, les antecedents pancreatiques ou biliaires, le contexte thyroidien et les objectifs hormonaux doivent etre examines selon la molecule envisagee. Une reponse negative dans un questionnaire ne remplace pas un interrogatoire medical."),
        block("Statut des molecules", "Retatrutide reste une molecule experimentale et non approuvee hors essai clinique au moment de cette verification. Plusieurs autres molecules du stack ne disposent pas d'une autorisation standard pour l'usage propose et leurs donnees humaines sont limitees. La vente comme produit de recherche ne signifie pas qu'un usage humain est legal, approuve ou sur. Le cadre varie selon le pays et doit etre verifie."),
        block("Signaux urgents", "Une difficulte respiratoire, un gonflement du visage ou de la gorge, une perte de connaissance, une confusion importante, une douleur thoracique, des signes neurologiques soudains ou une douleur abdominale intense demandent une prise en charge urgente. Ne te contente pas d'envoyer un email et ne tente pas de corriger la situation avec une autre dose."),
        block("Signaux a evaluer rapidement", "Des vomissements persistants, une diarrhee importante, une impossibilite de boire, une douleur abdominale qui ne cede pas, une fievre, une zone d'injection chaude qui s'etend, un ecoulement, des palpitations, des vertiges repetes ou un changement marque de l'humeur demandent un avis medical rapide. Le caractere attendu d'un effet ne doit jamais etre suppose a distance."),
        block("Journal", "Note chaque jour le sommeil, l'appetit, les symptomes digestifs, l'hydratation, les selles, l'entrainement, les douleurs, toute reaction locale et tout changement de traitement. Note aussi le produit, le lot, la concentration et le volume lorsqu'un professionnel a valide une administration. Ce journal permet de dater un probleme et d'eviter des souvenirs reconstruits."),
        block("Pas d'ajustement automatique", "Ne monte pas une dose parce qu'un effet attendu n'apparait pas vite. Ne reduis pas puis ne remonte pas au hasard. Ne recommence pas un cycle court pour traiter un rebond sans evaluation medicale. Toute adaptation doit tenir compte du produit, de la dose deja prise, du delai, des symptomes et des analyses."),
        block("Regle finale", medicalGate),
      ),
    },
    "nutrition-protocole": {
      title: "Nutrition et entrainement pendant le suivi",
      content: joinBlocks(
        block("Objectif prioritaire", "Pour perdre du gras en preservant le muscle, vise une baisse progressive et mesurable, pas une restriction brutale. Une molecule qui reduit l'appetit peut aussi rendre plus difficile l'apport de proteines, de fibres, de liquides et de micronutriments. Le suivi doit donc regarder la qualite de l'alimentation, la force a l'entrainement, la recuperation et les symptomes digestifs, pas seulement le poids."),
        block("Proteines", "Ton apport proteique doit etre adapte a ton poids, a ton niveau d'entrainement, a ton apport calorique total et a ta tolerance. Une fourchette peut etre discutee avec un dieteticien ou un professionnel qualifie, puis repartie sur la journee avec des sources variees. Le rapport ne transforme pas un chiffre unique en obligation universelle. Si l'appetit chute au point de rendre l'alimentation insuffisante, cela doit etre signale."),
        block("Deficit calorique", "Commence par estimer ton apport reel sur une a deux semaines. Ajuste ensuite par petites etapes pour obtenir une tendance durable. Un deficit trop agressif augmente le risque de fatigue, de baisse de performance, de faim rebond, de perte musculaire et d'abandon. Le tour de taille, les photos standardisees, la moyenne du poids et les performances donnent une lecture plus solide qu'une pesee isolee."),
        block("Glucides et lipides", "Les glucides peuvent etre places autour de l'entrainement selon ta tolerance et ton volume de travail. Il n'est pas necessaire d'interdire automatiquement le gluten ou de croire qu'un aliment bloque directement une voie hormonale de facon utile en pratique. Les lipides alimentaires restent importants. Priorise des aliments peu transformes, des legumes, des fruits, des feculents adaptes, des sources de proteines et des graisses de qualite."),
        block("Hydratation et digestion", "Surveille la soif, les urines, la constipation, les nausees et la capacite a manger normalement. Une simple recommandation de boire davantage ne suffit pas si des vomissements, une diarrhee ou une douleur abdominale persistent. Dans ce cas, stoppe toute escalade et demande un avis medical. Les fibres augmentent progressivement pour eviter d'aggraver l'inconfort."),
        block("Entrainement", "Garde un programme stable pendant la phase d'observation. Trois a quatre seances d'hypertrophie peuvent etre compatibles avec ton objectif si la recuperation suit. Evite d'ajouter simultanement beaucoup de cardio, une forte restriction calorique et plusieurs produits. Une baisse nette de force, des malaises ou une fatigue inhabituelle doivent faire revoir le plan."),
        block("Supplements", "La creatine, les vitamines, les mineraux et les autres supplements doivent etre inclus dans la liste remise au professionnel. Naturel ne signifie pas sans interaction ni sans doublon. Verifie les doses cumulees, surtout lorsque plusieurs complexes contiennent les memes micronutriments. Ne compte pas sur un supplement pour corriger un effet secondaire."),
        block("Lien avec le suivi", medicalGate),
      ),
    },
    "checklist-demarrage": {
      title: "Checklist avant toute decision",
      content: joinBlocks(
        block("1. Consultation", "Tu as montre le rapport complet a un medecin ou a un pharmacien. Le professionnel connait ton age, ton historique de MK-677 et de SARMs, tes allergies, tes supplements, tes objectifs et les produits exacts envisages. Les contre-indications et les alternatives approuvees ont ete discutees."),
        block("2. Bilan initial", "Tu as utilise ou planifie ton premier credit Blood Analysis avant la mise en place des recommandations. Les marqueurs ont ete choisis par un professionnel selon ton dossier. Les conditions du prelevement sont notees et le PDF complet est conserve pour la comparaison."),
        block("3. Decision molecule par molecule", "Chaque produit a une justification, un niveau de preuve compris, une dose validee, une duree validee, des criteres d'arret et une conduite ecrite en cas d'oubli. Aucun blend, aucune substitution et aucun ajout de derniere minute ne sont acceptes."),
        block("4. Verification live", `Tu as rouvert les pages produit et la page shipping ${shippingUrl}. Le nom, le dosage, le fournisseur, la taille de boite, le nombre de vials, le lot disponible, le prix total et le pays livre correspondent exactement aux lignes du rapport. Toute difference bloque l'achat.`),
        block("5. Reconstitution", "Le volume de solvant, la concentration finale, le volume correspondant a la dose et la capacite du materiel sont ecrits avec leurs unites. Un professionnel a refait le calcul. Aucun melange dans la meme seringue n'est prevu sans confirmation explicite."),
        block("6. Formation", "Un professionnel autorise t'a montre la manipulation avec le materiel exact. Tu disposes de materiel sterile a usage unique, d'un collecteur d'aiguilles et d'un stockage sur. Ton anxiete face au geste a ete prise au serieux."),
        block("7. Journal et urgence", "Ton journal est pret avec les produits, lots, dates, symptomes et mesures. Tu sais qui appeler en cas de question et quels signes imposent une urgence. Tu ne comptes pas sur un email pour une situation aigue."),
        block("8. Deuxieme credit", "Tu as prevu le deuxieme credit Blood Analysis environ 2 a 3 mois apres la mise en place des recommandations, sauf si un symptome ou le professionnel impose un controle plus tot."),
        block("Feu vert", "S'il manque une seule case, tu ne commences pas. " + medicalGate),
      ),
    },
    "effets-secondaires": {
      title: "Effets indesirables et conduite a tenir",
      content: joinBlocks(
        block("Ne pas classer trop vite un effet comme normal", "Un effet frequent n'est pas automatiquement benin pour toi. Son intensite, sa duree, les autres symptomes, ton hydratation, tes traitements et la dose comptent. Le rapport retire les promesses de type tu vas sentir, c'est positif ou cela disparaitra. Un professionnel doit evaluer un symptome persistant ou inquietant."),
        block("Digestif et metabolique", "Nausees, vomissements, diarrhee, constipation, perte d'appetit importante, faiblesse, vertiges ou douleur abdominale doivent etre notes. Une impossibilite de boire, des signes de deshydratation, une douleur abdominale intense ou persistante, une confusion ou un malaise demandent une evaluation rapide. Ne monte pas une dose pour respecter un calendrier si la tolerance n'est pas bonne."),
        block("Reaction locale et infection", "Une rougeur, une douleur ou un gonflement se surveillent. Une zone chaude qui s'etend, une douleur croissante, un ecoulement, une strie rouge, une fievre ou un malaise peuvent signaler une complication. Le lot, le produit, le site, le materiel et l'heure doivent etre conserves dans le journal pour aider l'evaluation."),
        block("Allergie", "Ton allergie a la penicilline ne permet ni de predire ni d'exclure une reaction a un produit, un excipient ou un contaminant. Urticaire generalise, gonflement du visage ou de la gorge, difficulte respiratoire, voix modifiee, sensation de malaise intense ou perte de connaissance sont des signes d'urgence."),
        block("Sommeil, humeur et neurologie", "Somnolence, insomnie, reves intenses, agitation, anxiete, baisse de l'humeur ou symptome neurologique nouveau ne doivent pas etre presentes comme une preuve que le produit fonctionne. Note le debut, la duree et les autres changements. Un symptome marque ou dangereux impose l'arret et une evaluation."),
        block("Hormonal et retention", "Une variation de poids, une retention d'eau, des palpitations, des maux de tete ou un changement de performance n'identifient pas a eux seuls une voie hormonale. N'interprete pas ces signes comme une hausse utile de GH ou de testostérone. Les symptomes et les analyses doivent etre lus ensemble par un professionnel."),
        block("Apres un effet", "Ne reprends pas le produit pour tester une seconde fois apres une reaction importante. Ne masque pas le symptome avec un autre produit. Garde le vial, l'emballage, le lot, les captures de la fiche et le journal. Contacte le professionnel qui suit le dossier ou les services d'urgence selon la gravite."),
        block("Cadre", medicalGate),
      ),
    },
    faq: {
      title: "Questions frequentes, reponses corrigees",
      content: joinBlocks(
        block("Puis-je commencer des reception du colis", "Non. La reception ne remplace pas la validation medicale, le bilan initial, la verification du lot, le controle de concentration et la formation pratique. Tant que ces points ne sont pas termines, le produit reste non utilise."),
        block("Puis-je melanger plusieurs peptides", "Pas sur la base de ce rapport. Ne melange pas plusieurs produits dans la meme seringue sans confirmation explicite d'un medecin ou d'un pharmacien pour les produits, concentrations et lots exacts. Une habitude lue en ligne ne prouve pas la compatibilite."),
        block("Que faire en cas d'oubli", "Ne double pas une dose et n'invente pas un rattrapage. Demande avant le debut une regle ecrite pour chaque produit. Si l'oubli arrive sans consigne disponible, contacte le professionnel ou le pharmacien et attends sa reponse."),
        block("Puis-je voyager avec les produits", "Les regles de transport, de douane, de prescription, de temperature et de securite varient selon le pays, la molecule et le statut du produit. Verifie les regles officielles avant le depart. Ne suppose pas qu'un produit de recherche passe sans probleme en cabine ou en soute."),
        block("Un COA garantit-il le produit", "Non. Un COA peut apporter une information, mais sa valeur depend du laboratoire, de la methode, de la date, du lot et de la chaine de tracabilite. La purete annoncee ne prouve pas necessairement la sterilite, l'absence d'endotoxines, la concentration ou l'identite du contenu recu."),
        block("Les produits sont-ils approuves", "Plusieurs molecules de ce stack sont experimentales ou non approuvees pour l'usage propose. Retatrutide reste en developpement clinique au moment de cette verification. La mention produit de recherche ne donne pas une autorisation d'usage humain. Verifie le cadre local avec un professionnel qualifie."),
        block("Combien de temps avant un resultat", "Le rapport ne garantit aucun delai ni aucun resultat. Une variation d'appetit, de sommeil, de poids ou de performance peut avoir plusieurs causes. Le suivi utilise des mesures standardisees et des criteres decides avant le debut, puis revoit le plan si le rapport benefice-risque n'est pas favorable."),
        block("Le calcul de Retatrutide depasse 1 ml", "C'est un signal de blocage, pas une invitation a fractionner. Si la concentration theorique conduit a un volume superieur a la capacite du materiel, le medecin ou le pharmacien doit revoir la concentration, la dose, le format ou la decision d'utiliser le produit. Ne prends pas deux vials pour fabriquer seul une dose."),
        block("Comment utiliser mes credits Blood Analysis", "Utilise idealement le premier credit avant les recommandations et le second environ 2 a 3 mois apres leur mise en place. Tu gardes la liberte de les utiliser plus tard. Un symptome ou une demande medicale peut justifier un controle plus precoce sans attendre le deuxieme credit."),
        block("Regle commune", medicalGate),
      ),
    },
    "disclaimer-support": {
      title: "Support, limites et prochaines etapes",
      content: joinBlocks(
        block("Ce que le rapport fait", "Le rapport structure ton questionnaire, les hypotheses de molecules, les calculs de quantite et un instantane live du catalogue. Il met en evidence les incoherences de dose, de volume, de prix ou de stock qui doivent bloquer la suite. Il t'aide a preparer des questions precises pour un medecin ou un pharmacien."),
        block("Ce que le rapport ne fait pas", "Il ne diagnostique pas, ne prescrit pas, ne forme pas a l'injection et ne garantit pas un fournisseur. Il ne peut pas certifier le contenu d'un vial, la sterilite, la qualite d'un lot, la legalite d'un achat ou l'absence d'interaction. Il ne remplace pas une prise en charge urgente."),
        block("Support commande", "Pour une question de paiement, de suivi, de produit manquant ou de remboursement sur Peptaura, utilise le support officiel de la plateforme: https://www.peptaura.com/contact. Garde le numero de commande, le fournisseur, les captures de la fiche et les informations de lot. Aucun fournisseur alternatif non audite n'est recommande dans ce rapport."),
        block("Support APEXLABS", "Pour une incoherence dans le rapport, un prix qui a change ou une question sur tes 2 credits Blood Analysis, ecris a coaching@achzodcoaching.com. Pour un symptome, une erreur de dose, une reaction ou une question clinique urgente, contacte un professionnel de sante ou les services d'urgence adaptes. N'attends pas une reponse commerciale."),
        block("Prochaine etape", "Commence par le premier credit Blood Analysis et la consultation. Apporte le PDF de resultats, ce rapport, la liste de tes supplements et ton historique de produits. Demande une decision molecule par molecule, des alternatives approuvees, des criteres d'arret et des instructions ecrites. Le deuxieme credit reste disponible pour une comparaison environ 2 a 3 mois apres la mise en place des recommandations."),
        block("Derniere regle", medicalGate),
      ),
    },
  };

  const sectionOrder = [
    "profil-synthese",
    "rationale",
    "bilan-sanguin",
    "guide-peptaura",
    "reconstitution-guide",
    "guide-injection",
    "protocole-pratique",
    "shopping-list",
    "hygiene-conservation",
    "securite-surveillance",
    "nutrition-protocole",
    "checklist-demarrage",
    "effets-secondaires",
    "faq",
    "disclaimer-support",
  ];

  return sectionOrder.map((id) => ({
    id,
    title: sectionContent[id].title,
    content: sanitizeClientFacingText(sectionContent[id].content),
  }));
}

export function repairPeptidesReportContent(
  sourceReport: PeptidesReport,
  responses: Record<string, unknown>,
  tier?: string | null
): PeptidesReport {
  const report = sourceReport as RepairableReport;
  const firstName = String(
    report.clientName
    || responses.pep_name
    || responses.prenom
    || responses.firstName
    || "Profil"
  ).trim().split(/\s+/)[0];

  report.clientName = sanitizeClientFacingText(firstName);
  if (tier) report.tier = sanitizeClientFacingText(tier);

  cleanUnsafePeptideFields(report);
  report.sections = buildSections(report, firstName);
  report.shoppingList = sanitizeClientFacingText(liveShoppingLines(report));

  const totalChars = report.sections.reduce((sum, section) => sum + section.content.length, 0);
  if (totalChars < 30_000) {
    throw new Error(`QUALITY: rapport repare trop court (${totalChars} caracteres)`);
  }

  const styleAudit = auditClientFacingText(collectClientFacingStrings(report).join("\n"));
  if (!styleAudit.ok) {
    throw new Error(
      `QUALITY: style client invalide apres reparation, dashes=${styleAudit.forbiddenDashes}, vouvoiement=${styleAudit.vouvoiement.join(",")}, style=${styleAudit.roboticPhrases.join(",")}`
    );
  }

  return report;
}
