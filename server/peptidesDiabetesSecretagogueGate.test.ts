import assert from 'node:assert/strict';
import test from 'node:test';
import {derivePeptidesStackPolicy} from './peptidesStackPolicy';
import {validateGeneratedPeptideStack} from './peptidesGenerationGate';
const policy = derivePeptidesStackPolicy({pep_primary_goal:'gh-antiaging',pep_conditions:['diabetes']});
const item = (name:string, status='active') => ({name,activationStatus:status,coveredAxes:status==='active'?['gh-antiaging']:[],dosage:'1 test-unit',route:'test-only'});
for (const name of ['CJC-1295 (no DAC)','CJC 1295 sans DAC','Ipamorelin','Sermorelin','Tesamorelin','GHRP-2','GHRP 6','Hexarelin','MK-677','Ibutamoren','Somatropin','HGH']) {
 test('declared diabetes requires review before automatic activation: '+name,()=>{
  assert.ok(validateGeneratedPeptideStack([item(name)],policy).some(x=>x.startsWith('SECRETAGOGUE_DIABETES_REVIEW_GATE:')));
 });
}
test('inactive phase does not count as automatic activation or active-axis coverage',()=>{
 const issues=validateGeneratedPeptideStack([item('Ipamorelin','conditional-inactive')],policy);
 assert.ok(!issues.some(x=>x.startsWith('SECRETAGOGUE_DIABETES_REVIEW_GATE:')));
 assert.ok(issues.some(x=>x.startsWith('ACTIVE_AXIS_GATE:')));
});
test('a non-GH longevity label is not a clinical clearance or secretagogue match',()=>{
 const issues=validateGeneratedPeptideStack([item('Synthetic longevity candidate')],policy,{requireExplicitAxisCoverage:true});
 assert.deepEqual(issues,[]);
});
test('skipMinimumCoverage never bypasses the diabetes safety review',()=>{
 assert.ok(validateGeneratedPeptideStack([item('Ipamorelin')],policy,{skipMinimumCoverage:true}).some(x=>x.startsWith('SECRETAGOGUE_DIABETES_REVIEW_GATE:')));
});
test('without declared diabetes this patch does not change prior stack gates',()=>{
 const p=derivePeptidesStackPolicy({pep_primary_goal:'gh-antiaging'});
 assert.equal(p.secretagogueAxisRequired,true);
 assert.ok(!validateGeneratedPeptideStack([item('Ipamorelin')],p).some(x=>x.startsWith('SECRETAGOGUE_DIABETES_REVIEW_GATE:')));
});
