import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePeptidesReleaseHashGate, hashPeptidesReport } from "./peptidesReleaseHashGate";
const fixture = () => ({peptides:[{name:"Existing molecule",dosage:"historical dose",vialsNeeded:"historical quantity",priceEstimate:"historical price"}],_peptauraLiveSync:{availableVendors:["Lumira","Retalux"],blockedVendors:["YPC"],listingSnapshots:[{supplier:"Lumira",dosage:"historical strength",requestedVials:2,totalPriceUsd:100,available:true,url:"https://www.peptaura.com/product/existing-offer"}]}});
function gate(a:unknown,b:unknown){return evaluatePeptidesReleaseHashGate({approvalExpected:true,approvedHash:hashPeptidesReport(a),currentReport:a,refreshedReport:b});}
test("available vendor ordering alone is metadata-only and never persistable",()=>{const a=fixture(),b=structuredClone(a);b._peptauraLiveSync.availableVendors.reverse();const r=gate(a,b);assert.equal(r.ok,true);assert.equal(r.persistRefreshed,false);assert.notEqual(r.currentHash,r.refreshedHash);assert.equal(r.currentContentHash,r.refreshedContentHash);});
for(const [name,mutate] of [
 ["clinical dose",(b:ReturnType<typeof fixture>)=>{b.peptides[0].dosage="different";}],
 ["purchase quantity",(b:ReturnType<typeof fixture>)=>{b._peptauraLiveSync.listingSnapshots[0].requestedVials=3;}],
 ["purchase price",(b:ReturnType<typeof fixture>)=>{b._peptauraLiveSync.listingSnapshots[0].totalPriceUsd=101;}],
 ["selected source URL",(b:ReturnType<typeof fixture>)=>{b._peptauraLiveSync.listingSnapshots[0].url="https://www.peptaura.com/product/different-offer";}],
 ["available membership",(b:ReturnType<typeof fixture>)=>{b._peptauraLiveSync.availableVendors.pop();}],
 ["blocked membership",(b:ReturnType<typeof fixture>)=>{b._peptauraLiveSync.blockedVendors.push("Lumira");}],
] as const){test(name+" still blocks even with reordered vendor metadata",()=>{const a=fixture(),b=structuredClone(a);b._peptauraLiveSync.availableVendors.reverse();mutate(b);const r=gate(a,b);assert.equal(r.ok,false);assert.equal(r.reason,"REFRESH_MUTATES_APPROVED_REPORT");assert.equal(r.persistRefreshed,false);});}
test("raw approved artifact mismatch still blocks",()=>{const a=fixture(),b=structuredClone(a);b._peptauraLiveSync.availableVendors.reverse();const r=evaluatePeptidesReleaseHashGate({approvalExpected:true,approvedHash:hashPeptidesReport(a),currentReport:b,refreshedReport:b});assert.equal(r.reason,"CURRENT_REPORT_HASH_MISMATCH");assert.equal(r.persistRefreshed,false);});
