// Transformations d'élèves en coaching suivi par Achzod.
// Chaque élève listé ici a donné son accord au propriétaire pour être montré.
// Chiffres et citations repris tels quels des bilans envoyés par les élèves
// (seuls les emojis ont été retirés des citations).

export interface StudentStat {
  label: string;
  value: string;
}

export interface StudentTransformation {
  id: string;
  name: string;
  program?: string;
  duration: string;
  headline: string;
  stats: StudentStat[];
  quote?: string;
  image?: string;
  imageAlt?: string;
}

export interface InstagramTransformation {
  src: string;
  alt: string;
}

const IMG = "/images/temoignages";

export const STUDENT_TRANSFORMATIONS: StudentTransformation[] = [
  {
    id: "hafida",
    name: "Hafida G.",
    program: "Elite 12 semaines",
    duration: "14 semaines",
    headline: "91,8 → 81,7 kg",
    stats: [
      { label: "Poids", value: "−10,1 kg" },
      { label: "Tour de taille", value: "−12 cm" },
      { label: "Pantalon", value: "du 46 au 42" },
    ],
    quote: "Je remarque surtout une vraie différence au niveau des vêtements, et cela me fait énormément plaisir.",
    image: `${IMG}/hafida-avant-apres.webp`,
    imageAlt: "Hafida, photo avant et photo après 14 semaines de coaching, vue de face",
  },
  {
    id: "olivia",
    name: "Olivia B.",
    duration: "15 mois",
    headline: "89,4 → 75,6 kg",
    stats: [
      { label: "Poids", value: "−13,8 kg" },
      { label: "Performance", value: "Hyrox terminé" },
    ],
    quote:
      "Je voulais te remercier infiniment, parce que ton accompagnement m’a permis de retrouver mon énergie, de me reconnecter à mon corps, et de reprendre confiance. J’ai plus d’énergie à 30 ans que je n’en avais à 23.",
    image: `${IMG}/olivia-avant-apres.webp`,
    imageAlt: "Olivia, photo avant et photo après son coaching, vue de face en brassière de sport",
  },
  {
    id: "mehdi",
    name: "Mehdi R.",
    duration: "8 mois",
    headline: "104 → 84 kg",
    stats: [{ label: "Poids", value: "−20 kg" }],
    quote:
      "Je suis passé de 104 kg à 84 kg, ce qui représente une transformation assez importante dont je suis fier. J’ai vraiment appliqué les conseils que tu m’avais donnés et essayé de faire les choses proprement et sérieusement.",
    image: `${IMG}/mehdi-avant-apres.webp`,
    imageAlt: "Mehdi, photo avant et photo après 8 mois de coaching, torse de face",
  },
  {
    id: "karim",
    name: "Karim W.",
    program: "Essential 12 semaines",
    duration: "4 mois",
    headline: "77,3 → 66,4 kg",
    stats: [
      { label: "Poids", value: "−10,9 kg" },
      { label: "Tour de taille", value: "−11 cm" },
    ],
    quote:
      "La semaine dernière, j'ai perdu beaucoup en tour de taille et cette semaine, \"peu\" en tour de taille mais beaucoup en poids.",
    image: `${IMG}/karim-avant-apres.webp`,
    imageAlt: "Karim, photo avant et photo après 4 mois de coaching, torse de face",
  },
  {
    id: "marwa",
    name: "Marwa G.",
    duration: "16 mois",
    headline: "102,3 → environ 90 kg",
    stats: [{ label: "Poids", value: "environ −12 kg" }],
    quote:
      "Sache que je me surprends moi même et je suis assez fière de l'évolution physique mais surtout mentale",
    image: `${IMG}/marwa-avant-apres.webp`,
    imageAlt: "Marwa, photo avant et photo après son coaching, vue de face",
  },
  {
    id: "salim",
    name: "Salim D.",
    program: "Essential 12 semaines",
    duration: "16 semaines",
    headline: "91 → 83 kg",
    stats: [
      { label: "Poids", value: "−8 kg" },
      { label: "Tour de taille", value: "−6 cm" },
    ],
    quote:
      "J'ai regardé mes anciennes photos et j'ai comparé avec celles de cette semaine, bien que l'objectif final est loin d'être atteint, je vois quand même de grosses différences.",
    image: `${IMG}/salim-avant-apres.webp`,
    imageAlt: "Salim, photo avant et photo après 16 semaines de coaching, vue de face",
  },
  {
    id: "guillaume",
    name: "Guillaume P.",
    program: "Essential",
    duration: "4 mois",
    headline: "81,3 → 77,9 kg",
    stats: [
      { label: "Poids", value: "−3,4 kg" },
      { label: "Tour de taille", value: "environ −5 cm" },
    ],
    quote:
      "Je n'ai jamais vu un suivi aussi professionnel que le tien à l'heure d'aujourd'hui. Sans parler d'entraînement, tu as vraiment changé mon quotidien (sommeil, etc). Je travaille mieux, j'ai arrêté de subir mes journées de travail et j'ai désormais l'énergie de reprendre mes projets.",
    image: `${IMG}/guillaume-avant-apres.webp`,
    imageAlt: "Guillaume, photo avant et photo après 4 mois de coaching, torse de face",
  },
  {
    id: "mohamed",
    name: "Mohamed E.",
    program: "Private Lab",
    duration: "12 semaines",
    headline: "123,3 → 111,3 kg",
    stats: [{ label: "Poids", value: "−12 kg" }],
    image: `${IMG}/mohamed-avant-apres.webp`,
    imageAlt: "Mohamed, photo avant et photo après son coaching Private Lab, torse de face",
  },
];

const INSTAGRAM_ALT = "Transformation d'un élève coaché par Achzod, photos avant et après publiées sur Instagram";

export const INSTAGRAM_TRANSFORMATIONS: InstagramTransformation[] = Array.from({ length: 14 }, (_, i) => ({
  src: `${IMG}/instagram-transformation-${String(i + 1).padStart(2, "0")}.webp`,
  alt: `${INSTAGRAM_ALT} (${i + 1} sur 14)`,
}));
