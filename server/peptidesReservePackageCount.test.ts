import assert from "node:assert/strict";
import test from "node:test";
import {calculateReservePackageCount, calculateReserveTargetMg} from "./peptidesReservePlanning";
const oral={dosage:"12,5 mg par jour par voie orale",cycleDuration:"8 semaines actives"};
test("whole packages cover active course plus reserve, not active minimum",()=>{assert.equal(calculateReserveTargetMg(oral,700),875);assert.equal(calculateReservePackageCount(oral,700,375),3);assert.equal(3*375,1125);assert.ok(2*375<875);});
test("exact reserve boundary does not force an extra package",()=>{assert.equal(calculateReservePackageCount({dosage:"1 mg par semaine",cycleDuration:"8 semaines"},8,5),2);});
test("one-week course retains one full week reserve",()=>{assert.equal(calculateReservePackageCount({dosage:"1 mg par semaine",cycleDuration:"1 semaine"},1,1),2);});
for(const [need,size] of [[NaN,375],[0,375],[-1,375],[700,0],[700,NaN],[700,-1]])test("invalid package planning fails closed "+need+"/"+size,()=>assert.throws(()=>calculateReservePackageCount(oral,need,size),/UNCALCULABLE/));
test("explicit contradictory cadence cannot create a usable package count",()=>assert.throws(()=>calculateReservePackageCount({dosage:"200 mcg, 2 administrations par semaine et 5 administrations par semaine",cycleDuration:"8 semaines"},8,5),/UNCALCULABLE/));
