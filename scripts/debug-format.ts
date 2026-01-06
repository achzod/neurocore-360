import { formatTxtToDashboard } from '../server/formatDashboard';

const testTxt = `RAPPEL IMPORTANT

Tu consultes ton analyse PREMIUM.

---

 AUDIT COMPLET NEUROCORE 360 - TEST

Genere le 06/01/2026 10:00:00


EXECUTIVE SUMMARY

Thomas, voici le resume executif de ton analyse complete. Ce texte devrait apparaitre dans la section.

Score : 76/100

ANALYSE ENTRAINEMENT ET PERIODISATION

Tu t'entraines 5 a 6 fois par semaine. Cette analyse detaillee de ton entrainement montre des points positifs et des axes d'amelioration.

Score : 68/100

ANALYSE SOMMEIL ET RECUPERATION

Ton sommeil est un facteur cle. Tu dors 7 a 8 heures ce qui est correct mais perfectible.

Score : 72/100

STACK SUPPLEMENTS OPTIMISE

Voici ta stack de supplements personnalisee basee sur ton profil.

SYNTHESE ET PROCHAINES ETAPES

Pour conclure cette analyse, voici les prochaines etapes a suivre.
`;

const result = formatTxtToDashboard(testTxt);

console.log('Client:', result.clientName);
console.log('Sections count:', result.sections.length);
console.log('Global score:', result.global);
console.log('');

for (const section of result.sections) {
  console.log(`- ${section.title}: ${section.content.length} chars, score=${section.score}`);
  if (section.content.length < 50) {
    console.log(`  PROBLEM: Content too short! "${section.content.substring(0, 100)}"`);
  }
}
