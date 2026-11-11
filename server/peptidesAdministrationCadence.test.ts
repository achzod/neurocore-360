import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPeptide, estimateNeedMg } from './peptidesReportValidator';
import { calculateReserveTargetMg, estimateHighestWeeklyNeedMg } from './peptidesReservePlanning';
import { parsePeptideCadence, estimatePharmacologicalNeedMg } from './peptidesVialPlanning';

for (const [count, word] of [[1,'une'],[2,'deux'],[3,'trois'],[4,'quatre'],[5,'cinq']] as const) {
 for (const form of [`${count} administrations`, `${word} administrations`, `${count} injections`, `${count} fois`]) {
  test(`weekly cadence recognizes ${form} without mistaking weight-normalized context`, () => {
   const input={dosage:`200 mcg par administration, soit 2,17 mcg/kg pour 92 kg, ${form} par semaine`,cycleDuration:'8 semaines actives, des semaines 5 à 12, puis pause minimale de 4 semaines'};
   const active=0.2*count*8;
   assert.equal(parsePeptideCadence(input)?.administrationsPerWeek,count);
   assert.ok(Math.abs((estimateNeedMg(input)??-1)-active)<1e-9);
   assert.ok(Math.abs((estimatePharmacologicalNeedMg(input)??-1)-active)<1e-9);
   assert.ok(Math.abs(estimateHighestWeeklyNeedMg(input,active)-0.2*count)<1e-9);
   assert.ok(Math.abs(calculateReserveTargetMg(input,active)-active*1.25)<1e-9);
  });
 }
}
test('four-week twice-weekly wording retains the explicit historical quantities',()=>{
 const input={dosage:'2,5 mg par administration, soit 27,17 mcg/kg pour 92 kg, 2 administrations par semaine',cycleDuration:'4 semaines actives, des semaines 1 à 4, sans maintenance automatique'};
 assert.equal(estimateNeedMg(input),20);assert.equal(estimatePharmacologicalNeedMg(input),20);assert.equal(calculateReserveTargetMg(input,20),25);
});
test('explicit weekly total is not multiplied a second time',()=>{
 assert.equal(estimateNeedMg({dosage:'1 mg par semaine en 5 administrations par semaine',cycleDuration:'8 semaines'}),8);
});


function close(actual: number | null, expected: number) {
 assert.ok(actual != null && Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9, String(actual) + ' != ' + expected);
}
function checkFixed(dosage: string, weekly: number, active = weekly * 8) {
 const input = {dosage, cycleDuration:'8 semaines'};
 close(estimateNeedMg(input), active);
 close(estimatePharmacologicalNeedMg(input), active);
 close(estimateHighestWeeklyNeedMg(input,active),weekly);
 close(calculateReserveTargetMg(input,active), active + Math.max(active * .25,weekly));
}
for (const [count,word] of [[1,'une'],[2,'deux'],[3,'trois'],[4,'quatre'],[5,'cinq'],[6,'six'],[7,'sept']] as const) {
 for (const form of [String(count),word]) {
  test('F2 aligned weekly count '+form,()=>{
   const input={dosage:'200 mcg par administration, '+form+' administrations par semaine',cycleDuration:'8 semaines'};
   assert.equal(parsePeptideCadence(input)?.administrationsPerWeek,count);
   checkFixed(input.dosage,.2*count);
  });
 }
}
for (const separator of [' par ','/','/ ']) {
 test('F1 weekly total '+separator,()=>checkFixed('1 mg'+separator+'semaine en 5 administrations par semaine',1));
 for(const [count,word] of [[1,'une'],[2,'deux'],[3,'trois']] as const) {
  for(const form of [String(count),word]) {
   test('F3 daily per-administration '+separator+form,()=>{
    const dosage='200 mcg par administration, '+form+' administrations'+separator+'jour';
    assert.equal(parsePeptideCadence({dosage,cycleDuration:'8 semaines'})?.administrationsPerWeek,count*7);
    checkFixed(dosage,.2*count*7);
   });
   test('F3 daily total not doubled '+separator+form,()=>checkFixed('600 mcg'+separator+'jour en '+form+' administrations par jour',4.2));
  }
 }
}
test('F1 per-administration dose wins over later explanatory totals',()=>{
 checkFixed('200 mcg par administration, 3 administrations par jour, soit 600 mcg par jour',4.2);
 checkFixed('200 mcg par administration, 5 administrations par semaine, soit 1 mg par semaine',1);
});
for(const dosage of [
 '2,17 mcg/kg pour 92 kg, 5 administrations par semaine',
 '27,17 mcg/kg pour 92 kg, 5 administrations par semaine',
 '200 mcg par administration, pas 2 administrations par semaine mais 5 administrations par semaine',
 '200 mcg par administration, pas 5 administrations par semaine',
 '200 mcg par administration, 1 administration par semaine, puis 5 administrations par semaine',
 '200 mcg par administration, 2 administrations par jour, 5 jours par semaine',
 '200 mcg par administration, 0 administrations par semaine',
 '200 mcg par administration, 20 administrations par semaine',
 '200 mcg par administration, quinze administrations par semaine',
 '200 mcg par administration, 2 administrations par semaine puis quinze administrations par semaine',
 '200 mcg par administration, dix-sept administrations par semaine',
 '200 mcg par administration, 2.5 administrations par semaine',
 '200 mcg par administration, ne pas depasser 5 administrations par semaine',
]) {
 test('fail closed: '+dosage,()=>{
  const input={dosage,cycleDuration:'8 semaines'};
  assert.equal(estimateNeedMg(input),null);
  assert.ok(checkPeptide(input).some(issue=>/cadence explicite|dose absolue absente/.test(issue)));
  assert.equal(estimatePharmacologicalNeedMg(input),null);
  assert.ok(Number.isNaN(estimateHighestWeeklyNeedMg(input,8)));
  assert.ok(Number.isNaN(calculateReserveTargetMg(input,8)));
 });
}
test('consistent daily and weekly redundant counts remain usable',()=>checkFixed('200 mcg par administration, 1 administration par jour, soit 7 administrations par semaine',1.4));
test('weight context preceding absolute dose is harmless',()=>checkFixed('2,17 mcg/kg pour 92 kg, 200 mcg par administration, 5 administrations par semaine',1));

for (const dosage of ['1 mg/semaine','1 mg par semaine','600 mcg/jour','600 mcg par jour']) {
 test('total alone is aggregated '+dosage,()=>checkFixed(dosage,dosage.startsWith('1')?1:4.2));
}

test('legacy titration and pause estimators preserve totals and explicit need override',()=>{
 const cases = [
  {dosage:'0,5 mg par semaine (semaines 1 à 4), puis 1 mg par semaine (semaines 5 à 8), puis 1,625 mg par semaine (semaines 9 à 12)',cycleDuration:'12 semaines',need:12.5},
  {dosage:'100 mcg une fois par jour pendant chaque semaine active.',cycleDuration:'12 semaines actives, 4 semaines de pause, puis 12 semaines actives.',need:16.8},
  {dosage:'Semaines 1 à 4: 2,5 mg une fois par semaine. Semaines 5 à 14: 5 mg une fois par semaine. Semaines 15 et 16: 2,5 mg une fois par semaine. Semaines 17 et 18: 1,25 mg une fois par semaine, puis arrêt.',cycleDuration:'18 semaines au total',need:67.5},
 ];
 for(const input of cases){
  close(estimateNeedMg(input),input.need);
  // Engine supplies its historical phase-aware total; do not reinterpret it as a fixed first dose.
  close(estimatePharmacologicalNeedMg({...input,pharmacologicalNeedMg:input.need}),input.need);
 }
});
for(const count of [8,14]){
 test('legacy vial count range remains aligned '+count,()=>checkFixed('200 mcg par administration, '+count+' administrations par semaine',.2*count));
}
