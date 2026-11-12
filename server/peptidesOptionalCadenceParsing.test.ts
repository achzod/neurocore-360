import assert from 'node:assert/strict';
import test from 'node:test';
import {parseExplicitAdministrationsPerWeek,estimateHighestWeeklyNeedMg,calculateReserveTargetMg} from './peptidesReservePlanning';
import {estimateNeedMg} from './peptidesReportValidator';
test('one single administration is an explicit count, not an unknown count',()=>{
 for(const s of ['une seule fois par semaine','un seul jour par semaine','1 seule administration par semaine'])assert.equal(parseExplicitAdministrationsPerWeek(s),1);
});
test('negative and unknown counts remain fail-closed',()=>{
 for(const s of ['pas une seule fois par semaine','jamais une seule fois par semaine','plusieurs fois par semaine','une seule fois par semaine et plusieurs fois par semaine'])assert.ok(Number.isNaN(parseExplicitAdministrationsPerWeek(s)),s);
});
test('a documented test-dose phase is included instead of discarded',()=>{
 const p={dosage:'Semaine 1 : dose test de 1 mg. Semaines 2 à 4 : 3 mg au maximum, une seule fois par semaine et uniquement si nécessaire.',cycleDuration:'4 semaines avec quatre administrations maximales.'};
 assert.equal(estimateNeedMg(p),10);
 assert.equal(estimateHighestWeeklyNeedMg(p,10),3);
 assert.equal(calculateReserveTargetMg(p,10),13);
 assert.match(p.dosage,/au maximum/);assert.match(p.dosage,/uniquement si nécessaire/);
});
test('French decimal test-dose phases retain every documented plateau',()=>{
 const p={dosage:'Semaine 1 : dose test de 0,25 mg. Semaines 2 à 4 : 1,5 mg au maximum, une seule fois par semaine et uniquement si nécessaire.',cycleDuration:'4 semaines'};
 assert.equal(estimateNeedMg(p),4.75);
 assert.equal(estimateHighestWeeklyNeedMg(p,4.75),1.5);
 assert.equal(calculateReserveTargetMg(p,4.75),6.25);
});
test('without numeric frequency a ponctual phrase never authorizes a default count',()=>{
 assert.ok(Number.isNaN(parseExplicitAdministrationsPerWeek('dose test puis plusieurs fois par semaine selon besoin')));
 assert.equal(estimateNeedMg({dosage:'1 mg plusieurs fois par semaine',cycleDuration:'4 semaines'}),null);
});

test('avec uses the same strict arithmetic checks as plus, including later triplets',async()=>{
 const {validateU100Reconstitution,checkPeptide}=await import('./peptidesReportValidator');
 const complete='Vial de 12 mg avec 2 ml de BAC water. Pour 3 mg = 50 unités U-100, soit 0,50 ml. Pour 1,5 mg = 25 unités, soit 0,25 ml.';
 assert.deepEqual(validateU100Reconstitution(complete),[]);
 assert.equal(checkPeptide({name:'Synthetic fixture',route:'SC',reconstitution:complete,dosage:'3 mg par semaine',cycleDuration:'4 semaines'} as any).includes('calcul complet de reconstitution U-100 absent'),false);
 const bad=complete.replace('25 unités','70 unités');
 assert.ok(validateU100Reconstitution(bad).some(e=>e.includes('conversion U-100 incoherente')));
 assert.ok(validateU100Reconstitution(complete.replace('2 ml de BAC','4 ml de BAC')).some(e=>e.includes('maximum 3 ml')));
 assert.ok(validateU100Reconstitution(complete.replace('2 ml de BAC','0 ml de BAC')).some(e=>e.includes('non positif')));
 assert.ok(checkPeptide({name:'Synthetic fixture',route:'SC',reconstitution:'Vial de 12 mg avec 2 ml de BAC water. Pour 3 mg = 50 unités.',dosage:'3 mg par semaine',cycleDuration:'4 semaines'} as any).includes('calcul complet de reconstitution U-100 absent'));
});
