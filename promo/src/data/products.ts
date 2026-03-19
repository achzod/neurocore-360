export interface Product {
  id: string;
  number: string;
  name: string;
  subtitle: string;
  price: string;
  accentColor: string;
  features: string[];
  stats: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'discovery-scan',
    number: '01',
    name: 'DISCOVERY\nSCAN',
    subtitle: "L'Analyse Initiale",
    price: 'Gratuit',
    accentColor: '#FCDD00',
    features: ['10 domaines analyses', 'Score global /100', 'Identification des blocages', 'Audit section par section'],
    stats: '66 questions / 10 domaines',
  },
  {
    id: 'anabolic-bioscan',
    number: '02',
    name: 'ANABOLIC\nBIOSCAN',
    subtitle: 'Analyse Approfondie',
    price: '59\u20AC',
    accentColor: '#FCDD00',
    features: ["16 sections d'analyse", 'Profil hormonal complet', 'Axes cliniques', 'Stack supplements personnalise'],
    stats: '137 questions / 16 sections',
  },
  {
    id: 'blood-analysis',
    number: '03',
    name: 'BLOOD\nANALYSIS',
    subtitle: 'La Verite Biologique',
    price: '99\u20AC',
    accentColor: '#3B82F6',
    features: ['39 biomarqueurs', '6 panels complets', 'Ranges optimaux athletes', 'Protocoles personnalises'],
    stats: '39 biomarqueurs / 6 panels',
  },
  {
    id: 'ultimate-scan',
    number: '04',
    name: 'ULTIMATE\nSCAN',
    subtitle: "L'Analyse Complete",
    price: '79\u20AC',
    accentColor: '#FCDD00',
    features: ["18 sections d'analyse", 'Analyse photo posturale', 'Wearables connectes integres', 'Protocole 30-60-90 jours'],
    stats: '183 questions / 18 sections',
  },
  {
    id: 'formcheck',
    number: '05',
    name: 'FORM\nCHECK',
    subtitle: 'Analyse Biomecanique',
    price: '1ere analyse gratuite',
    accentColor: '#25D366',
    features: ['Score de forme 0-100', 'Detection automatique', 'Corrections prioritaires', '20+ exercices supportes'],
    stats: 'WhatsApp / 20+ exercices',
  },
];
