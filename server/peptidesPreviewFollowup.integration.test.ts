import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

// This executes the actual orchestration against a deterministic DB/provider
// adapter. It proves ordering/interleavings, not PostgreSQL's implementation.
async function harness(options: {afterLock?: string; crash?: boolean; failure450?: boolean} = {}) {
  let fixed = new Date("2026-11-14T12:00:00Z").getTime();
  class ClockDate extends Date { constructor(value: string | number = fixed) { super(value); } static now() { return fixed; } }
  const state = {enabled:true,paid:false,unsub:false,locked:false,sends:0,claims:[] as any[],events:[] as string[],released:0};
  const captured = new ClockDate(ClockDate.now()-48*3600000).toISOString();
  const query = async(sql:string,p:any[]=[]) => {
    state.events.push(sql.trim().slice(0,35));
    if(sql.includes("SELECT bp.id")) return {rows:p[3]>0?[]:[{id:"lead",email:"peptides-preview::client@gmail.com",captured_at:captured,responses:{previewInput:{email:"client@gmail.com",firstName:"Client",consent:true},previewResult:{},previewNotifications:{clientEmailSent:true}},tracking:state.claims.map(x=>({...x}))}]};
    if(sql.includes("pg_try_advisory_lock")) {
      if(state.locked)return{rows:[{locked:false}]};state.locked=true;
      if(options.afterLock==="disable")state.enabled=false;
      if(options.afterLock==="purchase")state.paid=true;
      if(options.afterLock==="unsubscribe")state.unsub=true;
      if(options.afterLock==="other_pending")state.claims.push({id:"other",emailType:"peptidesPreviewFollowupJ7",sendpulseStatus:"pending",sentAt:new ClockDate().toISOString()});
      return{rows:[{locked:true}]};
    }
    if(sql.includes("pg_advisory_unlock")){state.locked=false;return{rows:[]};}
    if(sql.includes("SELECT enabled"))return{rows:[{enabled:state.enabled}]};
    if(sql.includes("SELECT NOT EXISTS"))return{rows:[{eligible:!state.paid&&!state.unsub&&!state.claims.some(x=>x.emailType===p[1]&&["success","pending"].includes(x.sendpulseStatus))}]};
    if(sql.includes('email_type AS "emailType"'))return{rows:state.claims};
    if(sql.includes("INSERT INTO email_tracking")){state.claims.push({id:p[0],emailType:p[2],sendpulseStatus:"pending",sentAt:new ClockDate().toISOString(),metadata:JSON.parse(p[5])});return{rows:[],rowCount:1};}
    if(sql.includes("UPDATE email_tracking")){
      const row=state.claims.find(x=>x.id===p[0]);if(row){const pending=sql.includes("sendpulse_status = 'pending'");row.sendpulseStatus=pending?"pending":p[1];row.sendpulseError=pending?p[1]:p[2];row.metadata={...row.metadata,...JSON.parse(pending?p[2]:p[3])};}return{rows:[],rowCount:1};
    }
    return{rows:[],rowCount:1};
  };
  const pool={query,connect:async()=>({query,release:()=>{state.released++;}})};
  const send=async()=>{assert.equal(state.claims.filter(x=>x.sendpulseStatus==="pending").length,1);assert.equal(state.locked,true);state.sends++;if(options.crash)throw Error("post-provider disconnect");if(options.failure450)return{result:false,httpStatus:200,id:"provider-deferral",error:{eventType:"soft_fail",smtpAnswerCode:450}};return{result:true,httpStatus:200,id:"provider-one"};};
  const bundle=await build({entryPoints:["server/peptidesPreviewFollowup.ts"],bundle:true,platform:"node",format:"cjs",write:false,plugins:[{name:"controlled-adapters",setup(b){b.onResolve({filter:/^\.\/db$/},()=>({path:"db",namespace:"adapter"}));b.onResolve({filter:/^\.\/emailService$/},()=>({path:"email",namespace:"adapter"}));b.onLoad({filter:/.*/,namespace:"adapter"},args=>({contents:args.path==="db"?"export const pool=globalThis.__pool;":"export const sendPeptidesPreviewFollowupEmail=globalThis.__send;",loader:"js"}));}}]});
  const module={exports:{} as any};vm.runInNewContext(bundle.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),process:{env:{}},__pool:pool,__send:send,Date:ClockDate,Intl,console,setTimeout:(cb:any)=>setTimeout(cb,0),setInterval});
  return{state,advance:(ms:number)=>{fixed+=ms;},run:()=>module.exports.processPeptidesPreviewFollowups({dryRun:false,knownEnabled:true})};
}

test("two concurrent workers send at most once after a pending claim",async()=>{const h=await harness();const r=await Promise.all([h.run(),h.run()]);assert.equal(h.state.sends,1);assert.equal(h.state.claims.length,1);assert.equal(r.reduce((n,x)=>n+x.sent,0),1);assert.equal(h.state.locked,false);});
for(const scenario of ["disable","purchase","unsubscribe","other_pending"])test("late "+scenario+" blocks provider under lock",async()=>{const h=await harness({afterLock:scenario});const r=await h.run();assert.equal(h.state.sends,0);assert.equal(r.skipped,1);assert.equal(h.state.released,1);});
test("post-provider crash leaves pending reconciliation and restart never resends",async()=>{const h=await harness({crash:true});const r=await h.run();assert.equal(h.state.sends,1);assert.equal(r.reconcileRequired,1);assert.equal(h.state.claims[0].sendpulseStatus,"pending");await h.run();assert.equal(h.state.sends,1);});

test("writer 450 with metadata provider id never resends after backoff without sibling",async()=>{const h=await harness({failure450:true});const r=await h.run();assert.equal(r.failed,1);assert.equal(h.state.claims[0].metadata.providerTaskId,"provider-deferral");assert.equal(h.state.claims.length,1);h.advance(3*3600000);await h.run();assert.equal(h.state.sends,1);});
