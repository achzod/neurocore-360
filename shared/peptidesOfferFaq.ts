export type PeptidesOfferFaqEntry = {
  question: string;
  answer: string;
};

export const PEPTIDES_OFFER_FAQ: readonly PeptidesOfferFaqEntry[] = [
  {
    question: "Pourquoi 399€ ?",
    answer: "Le contenu varie selon le tier. Solo (199€) : le protocole personnalise + l'acces source. Coached (299€) : tout Solo + 1 bilan sanguin + 30 jours de support ecrit. Tracked (399€) : tout Coached + 1 bilan supplementaire + 90 jours de support + 1 reecriture si evolution. Et dans les 3 tiers, le montant paye est integralement deduit de ton coaching Essential, Elite ou Private Lab 8 ou 12 semaines (crédit valable 8 semaines).",
  },
  {
    question: "C'est quoi la source premium ?",
    answer: "Un marketplace avec 74 peptides a prix laboratoire, 13 fournisseurs certifies COA, testes par labo independant. Les prix sont 60-90% moins chers que les revendeurs classiques que tu trouves sur Google. C'est la source que j'utilise personnellement depuis plusieurs annees.",
  },
  {
    question: "C'est legal ?",
    answer: "Les peptides de recherche ne sont pas approuves pour usage humain et sont vendus a des fins de recherche uniquement. Ce protocole est informatif et educatif. Tu es responsable de te renseigner sur la legislation de ton pays avant tout achat ou usage.",
  },
  {
    question: "Combien de bilans sanguins sont inclus ?",
    answer: "Solo n'inclut aucun bilan. Coached inclut 1 bilan au choix, baseline ou mi-cycle. Tracked inclut 2 bilans : une baseline avant le cycle puis un controle mi-cycle pour comparer les marqueurs cibles.",
  },
  {
    question: "Comment je reconstitue mes peptides ?",
    answer: "Le guide calcule dans ton rapport te donne: vial Xmg + Yml BAC water = Zmcg/ml, tire N unites par injection. Chaque molecule a sa fiche avec concentration cible, volume BAC water recommande, et calcul seringue adapte a ton dosage exact.",
  },
  {
    question: "Combien de molecules vais-je recevoir ?",
    answer: "Entre 2 et 5 selon ton profil et tes objectifs. Le principe: minimum effective dose, pas de surcharge. Chaque molecule est justifiee par rapport a ton objectif principal. Un stack surchargee augmente couts, risques et complexite sans ameliorer les resultats.",
  },
  {
    question: "Faut-il de l'experience avec les peptides ?",
    answer: "Non. Le questionnaire de 35 questions evalue ton niveau et adapte le protocole en consequence. Si tu es debutant, les molecules sont choisies pour leur profil tolerance/efficacite favorable, et les dosages sont conservatives. Le guide ne presuppose aucune experience.",
  },
  {
    question: "Quel est le delai de livraison ?",
    answer: "48h apres paiement, par email. Tu recois le rapport protocole complet, le guide de reconstitution calcule, le calendrier hebdomadaire, la liste de courses avec liens directs et les guides injection et securite. Selon la formule choisie, tu recois zero, un ou deux credits Blood Analysis.",
  },
  {
    question: "Je peux combiner avec un coaching ?",
    answer: "Oui. Si tu prends un coaching Achzod, ton coach integre ton protocole peptides dans ton suivi personnalise (nutrition, entrainement, supplementation). Les deux se completent parfaitement.",
  },
  {
    question: "Je peux revenir pour un autre cycle ?",
    answer: "Oui. Un protocole update pour un deuxieme cycle (ajustements selon tes bilans mi-cycle) sera disponible a 99€. La source premium reste accessible indefiniment via les liens de ton rapport.",
  },
];
